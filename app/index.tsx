import { processPhoto } from '@/actions/photoProcess';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Dimensions, Image, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const cameraRef = useRef(null);

  const { width: screenWidth } = Dimensions.get('window');
  const router = useRouter();

  const macros = {
    protein: { value: 78, goal: 120, color: '#ff6b6b' },
    carbs: { value: 150, goal: 250, color: '#f7c948' },
    fat: { value: 45, goal: 70, color: '#49dcb1' },
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
                onPress={() => {
                  processPhoto(capturedPhotos)
                }}
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
          <Text style={styles.welcome}>Welcome, Anna</Text>
          <FontAwesome name="user-circle" size={28} color="#aaa" />
        </View>

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

        {/* OTHER UI */}


<TouchableOpacity onPress={() => router.push('/recipe/breakfast')}>
  <View style={styles.mealCard}>
    <Text style={styles.mealTitle}>🍳 Breakfast</Text>
    <Text style={styles.mealDetail}>Calories: 350 kcal</Text>
    <Text style={styles.mealDetail}>Protein: 20g | Carbs: 40g | Fat: 10g</Text>
    <Text style={styles.mealDetail}>⏱ Cook Time: 15 mins</Text>
  </View>
</TouchableOpacity>

<TouchableOpacity onPress={() => router.push('/recipe/lunch')}>
  <View style={styles.mealCard}>
    <Text style={styles.mealTitle}>🥗 Lunch</Text>
    <Text style={styles.mealDetail}>Calories: 600 kcal</Text>
    <Text style={styles.mealDetail}>Protein: 35g | Carbs: 60g | Fat: 18g</Text>
    <Text style={styles.mealDetail}>⏱ Cook Time: 25 mins</Text>
  </View>
</TouchableOpacity>

<TouchableOpacity onPress={() => router.push('/recipe/dinner')}>
  <View style={styles.mealCard}>
    <Text style={styles.mealTitle}>🍛 Dinner</Text>
    <Text style={styles.mealDetail}>Calories: 500 kcal</Text>
    <Text style={styles.mealDetail}>Protein: 30g | Carbs: 50g | Fat: 15g</Text>
    <Text style={styles.mealDetail}>⏱ Cook Time: 20 mins</Text>
  </View>
</TouchableOpacity>



      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});