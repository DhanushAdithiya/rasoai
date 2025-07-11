import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import apiService from './apiService';

// Global state for photos (alternative to URL params)
let globalPhotos = [];

export const setGlobalPhotos = (photos) => {
  globalPhotos = photos;
};

export const getGlobalPhotos = () => {
  return globalPhotos;
};

const ProcessingScreen = () => {
  const router = useRouter();
  const [photos, setPhotos] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    // Get photos from global state instead of URL params
    const storedPhotos = getGlobalPhotos();
    if (storedPhotos && storedPhotos.length > 0) {
      setPhotos(storedPhotos);
    } else {
      Alert.alert('Error', 'No photos available for processing');
    }
  }, []);

  const processPhotos = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'No photos available for processing');
      return;
    }

    // Check API health first
    const isApiHealthy = await apiService.checkApiHealth();
    if (!isApiHealthy) {
      Alert.alert(
        'API Unavailable', 
        'The processing service is currently unavailable. Please check your connection and try again.'
      );
      return;
    }

    setProcessing(true);
    setResults([]);
    
    try {
      // Process photos using the API service
      const processedResults = await apiService.processMultiplePhotos(
        photos,
        (currentIndex, total) => {
          setCurrentPhotoIndex(currentIndex);
        }
      );

      // Format results for display
      const formattedResults = processedResults.map((result, index) => ({
        photoIndex: index,
        photoUri: result.photoUri,
        detections: result.success ? apiService.formatDetections(result.data) : [],
        processed: result.success,
        error: result.success ? null : result.error,
      }));

      setResults(formattedResults);
      
      // Calculate and show summary
      const totalNutrition = apiService.calculateTotalNutrition(processedResults);
      const successfulResults = formattedResults.filter(r => r.processed);
      
      Alert.alert(
        'Processing Complete', 
        `Successfully processed ${successfulResults.length} of ${photos.length} photo(s)!\n\n` +
        `Total items detected: ${totalNutrition.totalItems}\n` +
        `Total calories: ${totalNutrition.totalCalories}`
      );
      
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Error', 
        'An unexpected error occurred during processing. Please try again.'
      );
    } finally {
      setProcessing(false);
      setCurrentPhotoIndex(0);
    }
  };

  const calculateNutrition = (detections) => {
    // Use the API service to calculate nutrition
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    detections.forEach(detection => {
      const nutrition = apiService.getNutritionForItem(detection.name);
      totalCalories += nutrition.calories;
      totalProtein += nutrition.protein;
      totalCarbs += nutrition.carbs;
      totalFat += nutrition.fat;
    });

    return { 
      totalCalories: Math.round(totalCalories), 
      totalProtein: Math.round(totalProtein * 10) / 10, 
      totalCarbs: Math.round(totalCarbs * 10) / 10, 
      totalFat: Math.round(totalFat * 10) / 10 
    };
  };

  const renderProcessingStatus = () => {
    if (!processing) return null;

    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color="#49dcb1" />
        <Text style={styles.processingText}>
          Processing photo {currentPhotoIndex + 1} of {photos.length}...
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentPhotoIndex + 1) / photos.length) * 100}%` }
            ]} 
          />
        </View>
      </View>
    );
  };

  const renderResults = () => {
    if (results.length === 0) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Processing Results</Text>
        
        {results.map((result, index) => {
          const nutrition = calculateNutrition(result.detections);
          
          return (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultPhotoTitle}>Photo {index + 1}</Text>
                <Text style={styles.detectionsCount}>
                  {result.detections.length} items detected
                </Text>
              </View>
              
              <Image source={{ uri: result.photoUri }} style={styles.resultImage} />
              
              <View style={styles.nutritionSummary}>
                <Text style={styles.nutritionTitle}>Nutrition Summary</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                    <Text style={styles.nutritionValue}>{nutrition.totalCalories}</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                    <Text style={styles.nutritionValue}>{nutrition.totalProtein.toFixed(1)}g</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                    <Text style={styles.nutritionValue}>{nutrition.totalCarbs.toFixed(1)}g</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                    <Text style={styles.nutritionValue}>{nutrition.totalFat.toFixed(1)}g</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detectionsContainer}>
                <Text style={styles.detectionsTitle}>Detected Items</Text>
                {result.detections.map((detection, detIndex) => (
                  <View key={detIndex} style={styles.detectionItem}>
                    <Text style={styles.detectionName}>{detection.name}</Text>
                    <Text style={styles.detectionConfidence}>
                      {(detection.confidence * 100).toFixed(1)}% confidence
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Processing Photos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photoSummary}>
          <MaterialIcons name="photo-library" size={32} color="#49dcb1" />
          <Text style={styles.summaryText}>
            {photos.length} photo(s) ready for processing
          </Text>
        </View>

        {!processing && results.length === 0 && (
          <TouchableOpacity style={styles.processButton} onPress={processPhotos}>
            <MaterialIcons name="psychology" size={24} color="#fff" />
            <Text style={styles.processButtonText}>Start Processing</Text>
          </TouchableOpacity>
        )}

        {renderProcessingStatus()}
        {renderResults()}

        {results.length > 0 && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={() => {
                // Save results to global state and navigate back
                // You can create a global results state similar to photos
                router.push('/');
              }}
            >
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Results</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setResults([]);
                processPhotos();
              }}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Retry Processing</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  photoSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  processButton: {
    backgroundColor: '#49dcb1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 20,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#49dcb1',
    borderRadius: 4,
  },
  resultsContainer: {
    marginBottom: 20,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultPhotoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detectionsCount: {
    color: '#49dcb1',
    fontSize: 14,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  nutritionSummary: {
    marginBottom: 16,
  },
  nutritionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionItem: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 6,
    minWidth: '22%',
    alignItems: 'center',
  },
  nutritionLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  nutritionValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detectionsContainer: {
    marginTop: 8,
  },
  detectionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detectionName: {
    color: '#fff',
    fontSize: 14,
  },
  detectionConfidence: {
    color: '#49dcb1',
    fontSize: 12,
  },
  actionsContainer: {
    gap: 12,
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: '#49dcb1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#666',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProcessingScreen;