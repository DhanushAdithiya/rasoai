import { fetchUser, server } from '@/actions/accounts';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AuthManager from './components/AuthManager';
import { setGlobalPhotos } from './ProcessingScreen';



  Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUserName] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<string | null>(null);
  const [dietPlan, setDietPlan] = useState<string | null>(null);
  const [lowIngredients, setLowIngredients] = useState([]);
  const [showLowIngredientAlert, setShowLowIngredientAlert] = useState(false);
  const [tprotien, settProtein] = useState(0);
  const [tcarbs, settCarbs] = useState(0);
  const [tfat, settFat] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState(false);
const [lowStockNotificationId, setLowStockNotificationId] = useState(null);



const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }
    
    setNotificationPermission(true);
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Add this function to schedule a restock notification
const scheduleRestockNotification = async (ingredientNames) => {
  try {
    // Cancel any existing low stock notification
    if (lowStockNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(lowStockNotificationId);
    }
    
    const ingredientList = ingredientNames.slice(0, 3).join(', '); // Show max 3 ingredients
    const additionalCount = ingredientNames.length > 3 ? ` and ${ingredientNames.length - 3} more` : '';
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🛒 Restock Alert!',
        body: `You're still running low on: ${ingredientList}${additionalCount}. Time to restock!`,
        data: { 
          type: 'restock_reminder',
          ingredients: ingredientNames 
        },
      },
      trigger: {
        seconds: 4 * 60 * 60, // 4 hours = 4 * 60 * 60 seconds
      },
    });
    
    setLowStockNotificationId(notificationId);
    
    // Store the notification schedule info
    const scheduleInfo = {
      notificationId,
      scheduledAt: new Date().toISOString(),
      ingredients: ingredientNames
    };
    await AsyncStorage.setItem('low_stock_notification', JSON.stringify(scheduleInfo));
    
    console.log('Restock notification scheduled for 4 hours');
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

// Add this function to cancel restock notifications (when user restocks)
const cancelRestockNotification = async () => {
  try {
    if (lowStockNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(lowStockNotificationId);
      setLowStockNotificationId(null);
    }
    
    // Clear stored notification info
    await AsyncStorage.removeItem('low_stock_notification');
    console.log('Restock notification cancelled');
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};

// Modified checkIngredients function with notification logic
const checkIngredients = async () => {
  try {
    if (!userId) return;

    const response = await fetch(`${server}get_ingredients/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (response.ok && data.ingredients) {
      // Filter ingredients based on units
      const lowQuantityIngredients = data.ingredients.filter(ingredient => {
        const { Quantity, Units } = ingredient;

        if (Quantity <= 0) return false;

        // Thresholds based on unit
        if (Units.toLowerCase() === 'g' || Units.toLowerCase() === 'grams') {
          return Quantity < 500; // Less than 500 grams is considered low
        } else if (Units.toLowerCase() === 'kg' || Units.toLowerCase() === 'kilograms') {
          return Quantity < 1; // Less than 1 kg is considered low
        }

        // Default fallback threshold if unit is unknown
        return Quantity < 3;
      });

      if (lowQuantityIngredients.length > 0) {
        setLowIngredients(lowQuantityIngredients);
        setShowLowIngredientAlert(true);

        if (notificationPermission) {
          const storedNotification = await AsyncStorage.getItem('low_stock_notification');

          if (storedNotification) {
            const notificationInfo = JSON.parse(storedNotification);
            const scheduledTime = new Date(notificationInfo.scheduledAt);
            const now = new Date();
            const timeDiff = now.getTime() - scheduledTime.getTime();
            const hoursDiff = timeDiff / (1000 * 3600);

            if (hoursDiff >= 4) {
              const ingredientNames = lowQuantityIngredients.map(ing => ing.Name);
              await scheduleRestockNotification(ingredientNames);
            }
          } else {
            const ingredientNames = lowQuantityIngredients.map(ing => ing.Name);
            await scheduleRestockNotification(ingredientNames);
          }
        }
      } else {
        await cancelRestockNotification();
      }
    }
  } catch (error) {
    console.error('Error checking ingredients:', error);
  }
};

// Add this useEffect to request permissions when app starts
useEffect(() => {
  if (isAuthenticated) {
    requestNotificationPermissions();
  }
}, [isAuthenticated]);

// Add this useEffect to handle notification responses
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'restock_reminder') {
      // Navigate to inventory screen when user taps the notification
      router.push('/inventory');
    }
  });

  return () => subscription.remove();
}, []);

// Add this function to call when user actually restocks (you can call this from inventory screen)
const handleRestockComplete = async () => {
  await cancelRestockNotification();
  setLowIngredients([]);
  setShowLowIngredientAlert(false);
};


const loadRecipesFromStorage = async () => {
  try {
    const storedRecipes = await AsyncStorage.getItem('generated_recipes');
    if (storedRecipes) {
      const parsedRecipes = JSON.parse(storedRecipes);
      setRecipes(parsedRecipes);
      return parsedRecipes;
    }
    return null;
  } catch (error) {
    console.error('Error loading recipes from storage:', error);
    return null;
  }
};

useEffect(() => {
  if (isAuthenticated) {
    fetchUser(userId || "").then((data) => {
      setUserName(data.user.username);
      console.log(data)
      console.log("HERE after")
      setPreferences(data.user.preferences);
      settProtein(data.user.target_protein);
      settCarbs(data.user.target_carbs);
      settFat(data.user.target_fat); 
      setDietPlan(data.user.diet_plan);
      console.log(tprotien, tcarbs, tfat)
    });
    
    // Load recipes from storage first, only generate if none exist
    loadRecipesFromStorage().then((storedRecipes) => {
      if (!storedRecipes || Object.keys(storedRecipes).length === 0) {
        // No stored recipes found, generate new ones
        generateAllRecipes();
      }
    });
  }
}, [isAuthenticated]);


// Modified dismissLowIngredientAlert to not cancel the notification (just hide the alert)
const dismissLowIngredientAlert = () => {
  setShowLowIngredientAlert(false);
  // Note: We don't cancel the notification here because user just dismissed the alert,
  // they haven't actually restocked yet
};

  global.handleRestockComplete = handleRestockComplete;


  // Recipe states
  const [recipes, setRecipes] = useState({
    breakfast: null,
    lunch: null,
    dinner: null
  });
  const [loadingRecipes, setLoadingRecipes] = useState({
    breakfast: false,
    lunch: false,
    dinner: false
  });
  
  const cameraRef = useRef(null);

  const { width: screenWidth } = Dimensions.get('window');
  const router = useRouter();

const [macros, setMacros] = useState({
  protein: { value: 0, goal: 0, color: '#ff6b6b' },
  carbs: { value: 0, goal: 0, color: '#f7c948' },
  fat: { value: 0, goal: 0, color: '#49dcb1' },
}); 

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
  if (isAuthenticated && userId) {
    checkIngredients();
  }
}, [isAuthenticated, userId]);


  useEffect(() => {
    loadMacrosFromStorage();
  }, []);

  const loadMacrosFromStorage = async () => {
    try {
      const storedMacros = await AsyncStorage.getItem('daily_macros');
      if (storedMacros) {
        const parsedMacros = JSON.parse(storedMacros);
        setMacros(prev => ({
          protein: { ...prev.protein, value: parsedMacros.protein || 0 },
          carbs: { ...prev.carbs, value: parsedMacros.carbs || 0 },
          fat: { ...prev.fat, value: parsedMacros.fat || 0 },
        }));
      }
    } catch (error) {
      console.error('Error loading macros:', error);
    }
  };

  const updateMacros = async (recipeMacros) => {
    const newMacros = {
      protein: macros.protein.value + parseInt(recipeMacros.protein || 0),
      carbs: macros.carbs.value + parseInt(recipeMacros.carbs || 0),
      fat: macros.fat.value + parseInt(recipeMacros.fat || 0),
    };

    // Update state
    setMacros(prev => ({
      protein: { ...prev.protein, value: newMacros.protein },
      carbs: { ...prev.carbs, value: newMacros.carbs },
      fat: { ...prev.fat, value: newMacros.fat },
    }));

    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem('daily_macros', JSON.stringify(newMacros));
    } catch (error) {
      console.error('Error saving macros:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Store the function reference
      global.updateMacros = updateMacros;
      
      fetchUser(userId || "").then((data) => {
        setUserName(data.user.username);
        console.log(data)
        console.log("HERE after")
        setPreferences(data.user.preferences);
        settProtein(data.user.target_protein);
        settCarbs(data.user.target_carbs);
        settFat(data.user.target_fat); 
        setDietPlan(data.user.diet_plan);
        console.log(tprotien, tcarbs, tfat)
      });
      generateAllRecipes();
    }
  }, [isAuthenticated]);

  useEffect(() => {
  const initMacros = async () => {
    try {
      if (tprotien && tcarbs && tfat) {
        let storedMacros = await AsyncStorage.getItem('daily_macros');
        let parsedMacros = storedMacros ? JSON.parse(storedMacros) : {};

        setMacros({
          protein: { value: parsedMacros.protein || 0, goal: tprotien, color: '#ff6b6b' },
          carbs: { value: parsedMacros.carbs || 0, goal: tcarbs, color: '#f7c948' },
          fat: { value: parsedMacros.fat || 0, goal: tfat, color: '#49dcb1' },
        });
      }
    } catch (error) {
      console.error('Error initializing macros:', error);
    }
  };

  initMacros();
}, [tprotien, tcarbs, tfat]);


const clearStoredRecipes = async () => {
  try {
    await AsyncStorage.removeItem('generated_recipes');
    setRecipes({ breakfast: null, lunch: null, dinner: null });
  } catch (error) {
    console.error('Error clearing stored recipes:', error);
  }
};

// 5. Modify the handleLogout function to clear stored recipes


  const checkAuthStatus = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('user_id');
      if (storedUserId) {
        console.log("Auth OK, user:", storedUserId);
        setUserId(storedUserId);
        setIsAuthenticated(true);
      } else {
        console.log("User not logged in.");
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (uid: string) => {
    await AsyncStorage.setItem('user_id', uid);
    setUserId(uid);
    setIsAuthenticated(true);
  };

const handleLogout = async () => {
  Alert.alert('Logout', 'Are you sure you want to logout?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Logout',
      style: 'destructive',
      onPress: async () => {
        await AsyncStorage.removeItem('user_id');
        await clearStoredRecipes(); // Add this line
        setUserId(null);
        setIsAuthenticated(false);
        setRecipes({ breakfast: null, lunch: null, dinner: null });
      },
    },
  ]);
};
  // Generate recipe function
  const generateRecipe = async (mealType: string) => {
    console.log("generating recipe for", mealType);
    console.log("User ID:", userId);
    if (!userId) return Alert.alert("Error", "User ID not found");

    setLoadingRecipes(prev => ({ ...prev, [mealType]: true }));
    try {
      const response = await fetch(`${server}generate-recipe/${userId}?meal_type=${mealType}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok || data.error || !data.success) {
        Alert.alert('Error', data.error || data.detail || 'Failed to generate recipe');
        return;
      }

      const newRecipe = {
        ...data.recipe,
        mealType,
        emoji: getMealEmoji(mealType)
      };

      setRecipes(prev => ({
        ...prev,
        [mealType]: newRecipe
      }));

      // Store the recipe in AsyncStorage for access by the recipe screen
      try {
        const storedRecipes = await AsyncStorage.getItem('generated_recipes');
        const allRecipes = storedRecipes ? JSON.parse(storedRecipes) : {};
        allRecipes[mealType] = newRecipe;
        await AsyncStorage.setItem('generated_recipes', JSON.stringify(allRecipes));
      } catch (storageError) {
        console.error('Error storing recipe:', storageError);
        // Don't show alert for storage errors, recipe still works
      }

    } catch (error) {
      console.error(`Error generating ${mealType} recipe:`, error);
      Alert.alert('Error', `Failed to generate ${mealType} recipe.`);
    } finally {
      setLoadingRecipes(prev => ({ ...prev, [mealType]: false }));
    }
  };

  // Generate all recipes
  const generateAllRecipes = async () => {
  await Promise.all([
    generateRecipe('breakfast'),
    generateRecipe('lunch'),
    generateRecipe('dinner')
  ]);
  
  // Store the date when recipes were generated
  try {
    const today = new Date().toDateString();
    await AsyncStorage.setItem('recipes_generated_date', today);
  } catch (error) {
    console.error('Error storing recipe generation date:', error);
  }
};


  // Get emoji for meal type
  const getMealEmoji = (mealType) => {
    const emojis = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍛'
    };
    return emojis[mealType] || '🍽️';
  };

  // Get calories estimation (you can make this dynamic based on recipe data)
  const getEstimatedCalories = (mealType) => {
    const estimates = {
      breakfast: 350,
      lunch: 600,
      dinner: 500
    };
    return estimates[mealType] || 400;
  };

  // Navigate to inventory page
  const handleViewInventory = () => {
    router.push('/inventory');
  };

  const handleScanPress = async () => {
    if (!permission) {
      // Camera permissions are still loading
      return;
    }

    if (!permission.granted) {
      // Camera permissions are not granted yet
      const response = await requestPermission();
      if (response.granted) {
        setShowCamera(true);
      } else {
        Alert.alert('Permission Required', 'Camera permission is required to scan items');
      }
    } else {
      setShowCamera(true);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });
        
        // Add the photo to our temporary storage
        setCapturedPhotos(prev => [...prev, photo]);
        
        // Show success feedback
        Alert.alert(
          'Photo Captured', 
          `Photo saved! Total photos: ${capturedPhotos.length + 1}`,
          [
            { text: 'Take Another', style: 'default' },
            { text: 'Done', onPress: closeCamera, style: 'cancel' }
          ]
        );
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
    
    // Show summary of captured photos
    if (capturedPhotos.length > 0) {
      Alert.alert(
        'Photos Captured', 
        `Successfully captured ${capturedPhotos.length} photo(s). Photos are temporarily stored and ready for processing.`,
        [
          { 
            text: 'Clear Photos', 
            onPress: () => setCapturedPhotos([]),
            style: 'destructive'
          },
          { text: 'Keep Photos', style: 'default' }
        ]
      );
    }
  };

  const removePhoto = (indexToRemove) => {
    setCapturedPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const retakePhoto = () => {
    setShowPhotoGallery(false);
    setShowCamera(true);
  };

  const openPhotoGallery = () => {
    setShowPhotoGallery(true);
  };

  // Updated processPhotos function - now navigates to ProcessingScreen
  const processPhotos = () => {
    if (capturedPhotos.length === 0) {
      Alert.alert('No Photos', 'Please take some photos first');
      return;
    }

    // Set the global photos for ProcessingScreen to access
    setGlobalPhotos(capturedPhotos);
    
    // Navigate to the ProcessingScreen
    router.push('/ProcessingScreen');
  };

  // Render recipe card
  const renderRecipeCard = (mealType) => {
    const recipe = recipes[mealType];
    const isLoading = loadingRecipes[mealType];
    const emoji = getMealEmoji(mealType);
    const estimatedCalories = getEstimatedCalories(mealType);

    return (
      <View key={mealType} style={styles.mealCard}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleContainer}>
            <Text style={styles.mealTitle}>
              {emoji} {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
            </Text>
            {isLoading && <ActivityIndicator size="small" color="#49dcb1" style={styles.loadingIndicator} />}
          </View>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => generateRecipe(mealType)}
            disabled={isLoading}
          >
            <MaterialIcons 
              name="refresh" 
              size={20} 
              color={isLoading ? "#666" : "#49dcb1"} 
            />
          </TouchableOpacity>
        </View>

        {recipe && !isLoading ? (
          <TouchableOpacity onPress={() => router.push(`/recipe/${mealType}`)}>
            <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>
            <Text style={styles.mealDetail}>Estimated Calories: {estimatedCalories} kcal</Text>
            <Text style={styles.mealDetail}>⏱ Prep Time: {recipe.prep_time}</Text>
            <Text style={styles.mealDetail} numberOfLines={2}>
              Ingredients: {recipe.ingredients?.slice(0, 3).join(', ')}
              {recipe.ingredients?.length > 3 && '...'}
            </Text>
          </TouchableOpacity>
        ) : isLoading ? (
          <View style={styles.loadingRecipe}>
            <Text style={styles.loadingText}>Generating recipe...</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => generateRecipe(mealType)}>
            <Text style={styles.generateText}>Tap refresh to generate recipe</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
        <View style={styles.loadingContainer}>
          <Text style={styles.logo}>raso.ai</Text>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show auth screen (login/signup) if not authenticated
  if (!isAuthenticated) {
    return <AuthManager onLoginSuccess={handleLoginSuccess} />;
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <CameraView 
          style={styles.camera} 
          facing="back"
          ref={cameraRef}
        >
          <View style={styles.cameraControls}>
            {/* Photo counter */}
            <View style={styles.photoCounter}>
              <Text style={styles.photoCountText}>
                Photos: {capturedPhotos.length}
              </Text>
            </View>
            
            {/* Camera controls */}
            <View style={styles.controlsRow}>
              <TouchableOpacity 
                onPress={closeCamera} 
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={takePicture} 
                style={styles.captureButton}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={closeCamera} 
                style={styles.doneButton}
              >
                <MaterialIcons name="check" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (showPhotoGallery) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
        <View style={styles.galleryHeader}>
          <TouchableOpacity onPress={() => setShowPhotoGallery(false)}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.galleryTitle}>Captured Photos ({capturedPhotos.length})</Text>
          <TouchableOpacity onPress={retakePhoto}>
            <MaterialIcons name="camera-alt" size={24} color="#49dcb1" />
          </TouchableOpacity>
        </View>
        
        {capturedPhotos.length === 0 ? (
          <View style={styles.emptyGallery}>
            <MaterialIcons name="photo-library" size={64} color="#666" />
            <Text style={styles.emptyText}>No photos captured yet</Text>
            <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
              <MaterialIcons name="camera-alt" size={20} color="#fff" />
              <Text style={styles.retakeButtonText}>Take Photos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.galleryContent}>
            <View style={styles.photoGrid}>
              {capturedPhotos.map((photo, index) => (
                <View key={index} style={[styles.photoContainer, { width: (screenWidth - 60) / 2, height: (screenWidth - 60) / 2 }]}>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removePhoto(index)}
                  >
                    <MaterialIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.photoIndex}>
                    <Text style={styles.photoIndexText}>{index + 1}</Text>
                  </View>
                </View>
              ))}
            </View>
            
            <View style={styles.galleryActions}>
              <TouchableOpacity 
                style={styles.processButton} 
                onPress={processPhotos}
              >
                <MaterialIcons name="computer" size={20} color="#fff" />
                <Text style={styles.retakeButtonText}>Process Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.retakeButton} 
                onPress={retakePhoto}
              >
                <MaterialIcons name="camera-alt" size={20} color="#fff" />
                <Text style={styles.retakeButtonText}>Add More Photos</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={() => {
                  Alert.alert(
                    'Clear All Photos',
                    'Are you sure you want to remove all photos?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Clear All', 
                        style: 'destructive',
                        onPress: () => setCapturedPhotos([])
                      }
                    ]
                  );
                }}
              >
                <MaterialIcons name="delete" size={20} color="#fff" />
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>raso.ai</Text>

        <View style={styles.topBar}>
          <Text style={styles.welcome}>Welcome, {username}</Text>
          <TouchableOpacity onPress={handleLogout}>
            <FontAwesome name="user-circle" size={28} color="#aaa" />
          </TouchableOpacity>
        </View>

        {showLowIngredientAlert && lowIngredients.length > 0 && (
  <View style={styles.lowIngredientAlert}>
    <View style={styles.alertHeader}>
      <MaterialIcons name="warning" size={20} color="#f7c948" />
      <Text style={styles.alertTitle}>Running Low on Ingredients!</Text>
      <TouchableOpacity onPress={dismissLowIngredientAlert}>
        <MaterialIcons name="close" size={18} color="#aaa" />
      </TouchableOpacity>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.lowIngredientsList}>
        {lowIngredients.map((ingredient, index) => (
          <View key={index} style={styles.lowIngredientItem}>
            <Text style={styles.ingredientName}>{ingredient.Name}</Text>
            <Text style={styles.ingredientQuantity}>
              Only {ingredient.Quantity}g left
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  </View>
)}

        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleScanPress}
        >
          <MaterialIcons name="camera-alt" size={20} color="#fff" />
          <Text style={styles.scanText}>Scan Bill / Items</Text>
          {capturedPhotos.length > 0 && (
            <View style={styles.photoBadge}>
              <Text style={styles.photoBadgeText}>{capturedPhotos.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* View Inventory Button */}
        <TouchableOpacity
          style={styles.inventoryButton}
          onPress={handleViewInventory}
        >
          <MaterialIcons name="inventory" size={20} color="#fff" />
          <Text style={styles.scanText}>View Inventory</Text>
        </TouchableOpacity>

        {/* Show captured photos info */}
        {capturedPhotos.length > 0 && (
          <TouchableOpacity 
            style={styles.photoInfo}
            onPress={openPhotoGallery}
          >
            <Text style={styles.photoInfoText}>
              {capturedPhotos.length} photo(s) ready for processing
            </Text>
            <View style={styles.photoInfoActions}>
              <MaterialIcons name="photo-library" size={16} color="#49dcb1" />
              <MaterialIcons name="chevron-right" size={16} color="#49dcb1" />
            </View>
          </TouchableOpacity>
        )}

        {/* MACROS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking Macros</Text>
          <View style={styles.macroRow}>
            {Object.entries(macros).map(([key, data]) => {
              const progress = Math.min(data.value / data.goal, 1);
              return (
                <View key={key} style={styles.macroBox}>
                  <View style={[styles.fillBox, {
                    backgroundColor: data.color,
                    width: `${progress * 100}%`,
                  }]} />
                  <View style={styles.macroOverlay}>
                    <Text style={styles.macroLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <Text style={styles.macroValue}>{data.value}g / {data.goal}g</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* DYNAMIC RECIPES */}
        <View style={styles.section}>
          <View style={styles.recipesHeader}>
            <Text style={styles.sectionTitle}>Today's Recipes</Text>
            <TouchableOpacity 
              style={styles.refreshAllButton}
              onPress={generateAllRecipes}
              disabled={Object.values(loadingRecipes).some(loading => loading)}
            >
              <MaterialIcons 
                name="refresh" 
                size={20} 
                color={Object.values(loadingRecipes).some(loading => loading) ? "#666" : "#49dcb1"} 
              />
              <Text style={styles.refreshAllText}>Refresh All</Text>
            </TouchableOpacity>
          </View>
          
          {['breakfast', 'lunch', 'dinner'].map(mealType => renderRecipeCard(mealType))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Add these new styles to your existing styles object

lowIngredientAlert: {
  backgroundColor: '#1a1a1a',
  borderRadius: 12,
  padding: 15,
  marginHorizontal: 20,
  marginBottom: 20,
  borderWidth: 1,
  borderColor: '#f7c948',
},

alertHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  justifyContent: 'space-between',
},

alertTitle: {
  color: '#f7c948',
  fontSize: 16,
  fontWeight: '600',
  flex: 1,
  marginLeft: 8,
},

lowIngredientsList: {
  flexDirection: 'row',
  gap: 12,
},

lowIngredientItem: {
  backgroundColor: '#2a2a2a',
  borderRadius: 8,
  padding: 10,
  minWidth: 120,
  borderLeftWidth: 3,
  borderLeftColor: '#f7c948',
},

ingredientName: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '500',
  marginBottom: 4,
},

ingredientQuantity: {
  color: '#f7c948',
  fontSize: 12,
  fontWeight: '400',
},



  container: { 
    flex: 1, 
    backgroundColor: '#0d0d0d',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  content: { padding: 20 },
  logo: { fontSize: 20, color: '#49dcb1', fontWeight: 'bold', marginBottom: 10 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20
  },
  welcome: { fontSize: 22, color: '#fff', fontWeight: '600' },
  scanButton: {
    backgroundColor: '#222', flexDirection: 'row',
    alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 20,
    position: 'relative',
  },
  scanText: { color: '#fff', marginLeft: 10 },
  photoBadge: {
    position: 'absolute',
    right: 10,
    backgroundColor: '#49dcb1',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  photoInfoText: {
    color: '#49dcb1',
    fontSize: 14,
  },
  photoInfoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fefefe', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroBox: {
    width: '30%',
    height: 80,
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fillBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  macroOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  macroLabel: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 12,
    color: '#fff',
  },
  mealBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#1a1a1a', padding: 16, borderRadius: 8
  },
  mealItem: { color: '#fff', fontSize: 16 },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'transparent',
  },
  photoCounter: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 20,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  doneButton: {
    backgroundColor: 'rgba(73,220,177,0.8)',
    padding: 15,
    borderRadius: 50,
  },

  mealCard: {
  backgroundColor: '#1a1a1a',
  padding: 16,
  borderRadius: 12,
  marginBottom: 12,
  borderLeftWidth: 4,
  borderLeftColor: '#49dcb1',
},
mealTitle: {
  fontSize: 18,
  fontWeight: '600',
  color: '#fff',
  marginBottom: 8,
},
mealDetail: {
  fontSize: 14,
  color: '#ccc',
  marginBottom: 4,
},

  // Gallery styles
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0d0d0d',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  galleryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyGallery: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  galleryContent: {
    padding: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndex: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndexText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  galleryActions: {
    gap: 12,
  },
  retakeButton: {
    backgroundColor: '#49dcb1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  processButton: {
    backgroundColor: '#1dacffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearAllButton: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  clearAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },


  inventoryButton: {
  backgroundColor: '#333',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 12,
  borderRadius: 8,
  marginBottom: 20,
},

inventoryItem: {
  backgroundColor: '#1a1a1a',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  borderRadius: 8,
  marginBottom: 10,
  borderLeftWidth: 3,
  borderLeftColor: '#49dcb1',
},

inventoryItemInfo: {
  flex: 1,
},

inventoryItemName: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
  marginBottom: 4,
},

inventoryItemQuantity: {
  color: '#ccc',
  fontSize: 14,
},

loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#0d0d0d',
},

loadingText: {
  color: '#666',
  fontSize: 16,
  marginTop: 10,
},
 mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(73, 220, 177, 0.1)',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#49dcb1',
    marginBottom: 4,
  },
  loadingRecipe: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  generateText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  recipesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(73, 220, 177, 0.1)',
  },
  refreshAllText: {
    color: '#49dcb1',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },  
});