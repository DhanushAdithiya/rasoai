import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Recipe {
  recipe_name: string;
  prep_time: string;
  ingredients: string[];
  instructions: string[];
  mealType: string;
  emoji: string;
}

const server = "http://10.238.248.72:8000/"

export default function RecipeScreen() {
  const { meal } = useLocalSearchParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCooking, setIsCooking] = useState(false);
  const [cookingSuccess, setCookingSuccess] = useState(false);


const cookRecipe = async () => {
  console.log("Recipe data:", recipe);
console.log("Instructions:", recipe.instructions);

  try {
    setIsCooking(true);
    setCookingSuccess(false);

    const userId = await AsyncStorage.getItem('user_id');
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    // Check if recipe has suggested inventory update
    if (!recipe.suggested_inventory_update) {
      setError('No inventory update data available for this recipe');
      return;
    }

    const response = await fetch(`${server}update-inventory/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        updated_inventory: recipe.suggested_inventory_update
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      if (typeof data.detail === 'object') {
  setError(JSON.stringify(data.detail));  // or extract `msg` if present
} else {
  setError(data.detail || 'Failed to update inventory');
}
      return;
    }

    // ADD THIS: Update macros in the main app
    if (recipe.macros && global.updateMacros) {
      global.updateMacros(recipe.macros);
    }

    setCookingSuccess(true);
    console.log('Inventory updated successfully:', data);
    
    // Optional: Show success message for a few seconds then hide it
    setTimeout(() => {
      setCookingSuccess(false);
    }, 3000);

  } catch (error) {
    console.error('Error cooking recipe:', error);
    setError('Failed to update inventory after cooking');
  } finally {
    setIsCooking(false);
  }
};


  // Get emoji for meal type
  const getMealEmoji = (mealType: string) => {
    const emojis = {
      breakfast: '🍳',
      lunch: '🥗',
      dinner: '🍛'
    };
    return emojis[mealType as keyof typeof emojis] || '🍽️';
  };

  console.log(meal)

  // Load recipe from AsyncStorage or generate new one
  useEffect(() => {
    loadRecipe();
  }, [meal]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get stored recipe first
      const storedRecipes = await AsyncStorage.getItem('generated_recipes');
      if (storedRecipes) {
        const recipes = JSON.parse(storedRecipes);
        if (recipes[meal as string]) {
          setRecipe(recipes[meal as string]);
          setLoading(false);
          return;
        }
      }

      // If no stored recipe, generate new one
      await generateRecipe(meal as string);
    } catch (error) {
      console.error('Error loading recipe:', error);
      setError('Failed to load recipe');
      setLoading(false);
    }
  };

  const generateRecipe = async (mealType: string) => {
    try {
      setLoading(true);
      setError(null);

      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        setError('User not authenticated');
        return;
      }

      const response = await fetch(`${server}generate-recipe/${userId}?meal_type=${mealType}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      
      if (!response.ok || data.error || !data.success) {
        setError(data.error || data.detail || 'Failed to generate recipe');
        return;
      }

      const newRecipe = {
        ...data.recipe,
        mealType,
        emoji: getMealEmoji(mealType)
      };

      setRecipe(newRecipe);

      // Store the recipe for future use
      const storedRecipes = await AsyncStorage.getItem('generated_recipes');
      const recipes = storedRecipes ? JSON.parse(storedRecipes) : {};
      recipes[mealType] = newRecipe;
      await AsyncStorage.setItem('generated_recipes', JSON.stringify(recipes));

    } catch (error) {
      console.error(`Error generating ${mealType} recipe:`, error);
      setError(`Failed to generate ${mealType} recipe`);
    } finally {
      setLoading(false);
    }
  };

  const refreshRecipe = () => {
    generateRecipe(meal as string);
  };

  // Get estimated calories
  const getEstimatedCalories = (mealType: string) => {
    const estimates = {
      breakfast: 350,
      lunch: 600,
      dinner: 500
    };
    return estimates[mealType as keyof typeof estimates] || 400;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#49dcb1" />
          <Text style={styles.loadingText}>
            {recipe ? 'Refreshing recipe...' : 'Loading recipe...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recipe Error</Text>
          <TouchableOpacity onPress={refreshRecipe}>
            <MaterialIcons name="refresh" size={24} color="#49dcb1" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshRecipe}>
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recipe Not Found</Text>
          <TouchableOpacity onPress={refreshRecipe}>
            <MaterialIcons name="refresh" size={24} color="#49dcb1" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="restaurant" size={64} color="#666" />
          <Text style={styles.errorText}>No recipe available for {meal}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshRecipe}>
            <MaterialIcons name="add" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Generate Recipe</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {recipe.emoji} {meal?.toString().charAt(0).toUpperCase() + meal?.toString().slice(1)}
        </Text>
        <TouchableOpacity onPress={refreshRecipe}>
          <MaterialIcons name="refresh" size={24} color="#49dcb1" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Recipe Title */}
        <Text style={styles.recipeTitle}>{recipe.recipe_name}</Text>
        
        {/* Recipe Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <MaterialIcons name="schedule" size={20} color="#49dcb1" />
            <Text style={styles.infoText}>{recipe.prep_time}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="local-fire-department" size={20} color="#ff6b6b" />
            <Text style={styles.infoText}>{getEstimatedCalories(recipe.mealType)} kcal</Text>
          </View>
        </View>

        {/* Macros Section */}
{recipe.macros && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>
      <MaterialIcons name="pie-chart" size={20} color="#ff6b6b" /> Macronutrients
    </Text>
    <View style={styles.macrosContainer}>
      <View style={styles.macroItem}>
        <View style={[styles.macroCircle, { backgroundColor: '#49dcb1' }]}>
          <MaterialIcons name="eco" size={20} color="#fff" />
        </View>
        <Text style={styles.macroLabel}>Carbs</Text>
        <Text style={styles.macroValue}>{recipe.macros.carbs}g</Text>
      </View>
      
      <View style={styles.macroItem}>
        <View style={[styles.macroCircle, { backgroundColor: '#f7c948' }]}>
          <MaterialIcons name="fitness-center" size={20} color="#fff" />
        </View>
        <Text style={styles.macroLabel}>Protein</Text>
        <Text style={styles.macroValue}>{recipe.macros.protein}g</Text>
      </View>
      
      <View style={styles.macroItem}>
        <View style={[styles.macroCircle, { backgroundColor: '#ff6b6b' }]}>
          <MaterialIcons name="opacity" size={20} color="#fff" />
        </View>
        <Text style={styles.macroLabel}>Fat</Text>
        <Text style={styles.macroValue}>{recipe.macros.fat}g</Text>
      </View>
    </View>
  </View>
)}

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="shopping-cart" size={20} color="#f7c948" /> Ingredients
          </Text>
          <View style={styles.ingredientsList}>
            {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
              recipe.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.ingredientText}>{ingredient}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No ingredients available</Text>
            )}
          </View>
        </View>

        {/* Instructions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="list-alt" size={20} color="#49dcb1" /> Instructions
          </Text>
          <View style={styles.section}>
  <Text style={styles.sectionTitle}>
    <MaterialIcons name="list-alt" size={20} color="#49dcb1" /> Instructions
  </Text>
  <View style={styles.instructionsList}>
    {recipe.instructions ? (
      recipe.instructions
        .split(/\r?\n/) // split into steps
        .map((line, index) => (
          <View key={index} style={styles.instructionItem}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.instructionText}>{line.trim()}</Text>
          </View>
        ))
    ) : (
      <Text style={styles.noDataText}>No instructions available</Text>
    )}
  </View>
</View>
        </View>


        {/* Cook Recipe Button */}
<View style={styles.cookButtonContainer}>
  <TouchableOpacity 
    style={[
      styles.cookButton,
      cookingSuccess && styles.cookButtonSuccess,
      isCooking && styles.cookButtonDisabled
    ]} 
    onPress={cookRecipe}
    disabled={isCooking}
  >
    {isCooking ? (
      <>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.cookButtonText}>Updating Inventory...</Text>
      </>
    ) : cookingSuccess ? (
      <>
        <MaterialIcons name="check-circle" size={24} color="#fff" />
        <Text style={styles.cookButtonText}>Recipe Cooked Successfully!</Text>
      </>
    ) : (
      <>
        <MaterialIcons name="restaurant" size={24} color="#fff" />
        <Text style={styles.cookButtonText}>Cook Recipe</Text>
      </>
    )}
  </TouchableOpacity>
  
  {cookingSuccess && (
    <Text style={styles.cookSuccessText}>
      Your inventory has been updated based on the ingredients used in this recipe.
    </Text>
  )}
</View>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cookButtonContainer: {
  marginTop: 20,
  marginBottom: 20,
},
cookButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#49dcb1',
  paddingVertical: 16,
  paddingHorizontal: 24,
  borderRadius: 12,
  gap: 10,
  elevation: 3,
  shadowColor: '#49dcb1',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},
cookButtonSuccess: {
  backgroundColor: '#4CAF50',
},
cookButtonDisabled: {
  backgroundColor: '#666',
  opacity: 0.7,
},
cookButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
},
cookSuccessText: {
  color: '#4CAF50',
  fontSize: 14,
  textAlign: 'center',
  marginTop: 12,
  fontStyle: 'italic',
},


  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#49dcb1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recipeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#49dcb1',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    paddingVertical: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientsList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 10,
  },
  bulletPoint: {
    color: '#49dcb1',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    marginTop: 2,
  },
  ingredientText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  instructionsList: {
    gap: 15,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 12,
    gap: 15,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#49dcb1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
    macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  macroValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});