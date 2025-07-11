// apiService.js
// This service handles all API calls to your FastAPI backend

const API_BASE_URL = 'http://127.0.0.1:8000'; // Replace with your actual API endpoint
// For local development, use: http://localhost:8000 or http://192.168.1.XXX:8000

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * Process a single photo through the ML model
   * @param {Object} photo - Photo object with uri property
   * @param {number} photoIndex - Index of the photo being processed
   * @returns {Promise<Object>} - API response with detections
   */
  async processSinglePhoto(photo, photoIndex = 0) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `photo_${photoIndex}.jpg`,
      });

      const response = await fetch(`${this.baseUrl}/predict/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: this.timeout,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
        photoIndex,
        photoUri: photo.uri,
      };
    } catch (error) {
      console.error(`Error processing photo ${photoIndex}:`, error);
      return {
        success: false,
        error: error.message,
        photoIndex,
        photoUri: photo.uri,
      };
    }
  }

  /**
   * Process multiple photos in sequence
   * @param {Array} photos - Array of photo objects
   * @param {Function} onProgress - Callback for progress updates
   * @returns {Promise<Array>} - Array of processing results
   */
  async processMultiplePhotos(photos, onProgress) {
    const results = [];
    
    for (let i = 0; i < photos.length; i++) {
      // Call progress callback
      if (onProgress) {
        onProgress(i, photos.length);
      }

      const result = await this.processSinglePhoto(photos[i], i);
      results.push(result);

      // Add a small delay to prevent overwhelming the server
      if (i < photos.length - 1) {
        await this.delay(500); // 500ms delay between requests
      }
    }

    return results;
  }

  /**
   * Batch process photos (if your API supports batch processing)
   * @param {Array} photos - Array of photo objects
   * @returns {Promise<Object>} - Batch processing result
   */
  async processBatchPhotos(photos) {
    try {
      const formData = new FormData();
      
      photos.forEach((photo, index) => {
        formData.append('files', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        });
      });

      const response = await fetch(`${this.baseUrl}/predict/batch/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
          'Accept': 'application/json',
        },
        timeout: this.timeout,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error in batch processing:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get nutrition information for detected items
   * @param {Array} detectedItems - Array of detected item names
   * @returns {Promise<Object>} - Nutrition information
   */
  async getNutritionInfo(detectedItems) {
    try {
      const response = await fetch(`${this.baseUrl}/nutrition/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          items: detectedItems
        }),
        timeout: this.timeout,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error getting nutrition info:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if the API is available
   * @returns {Promise<boolean>} - True if API is available
   */
  async checkApiHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        timeout: 5000, // 5 second timeout for health check
      });

      return response.ok;
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format detection results for display
   * @param {Object} apiResult - Raw API result
   * @returns {Array} - Formatted detections
   */
  formatDetections(apiResult) {
    if (!apiResult || !apiResult.detections) {
      return [];
    }

    return apiResult.detections.map(detection => ({
      name: detection.name || 'Unknown',
      confidence: detection.confidence || 0,
      bbox: {
        x: detection.xmin || 0,
        y: detection.ymin || 0,
        width: (detection.xmax || 0) - (detection.xmin || 0),
        height: (detection.ymax || 0) - (detection.ymin || 0),
      },
      class: detection.class || 0,
    }));
  }

  /**
   * Calculate total nutrition from multiple results
   * @param {Array} results - Array of processing results
   * @returns {Object} - Total nutrition information
   */
  calculateTotalNutrition(results) {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalItems = 0;

    results.forEach(result => {
      if (result.success && result.data && result.data.detections) {
        result.data.detections.forEach(detection => {
          const nutrition = this.getNutritionForItem(detection.name);
          totalCalories += nutrition.calories;
          totalProtein += nutrition.protein;
          totalCarbs += nutrition.carbs;
          totalFat += nutrition.fat;
          totalItems++;
        });
      }
    });

    return {
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      totalItems,
    };
  }

  /**
   * Get nutrition data for a specific item
   * This is a fallback nutrition database - ideally this would come from your API
   * @param {string} itemName - Name of the food item
   * @returns {Object} - Nutrition information
   */
  getNutritionForItem(itemName) {
    const nutritionDB = {
      // Fruits
      'apple': { calories: 80, protein: 0.4, carbs: 21, fat: 0.3 },
      'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
      'orange': { calories: 60, protein: 1.2, carbs: 15, fat: 0.2 },
      'grape': { calories: 62, protein: 0.6, carbs: 16, fat: 0.3 },
      
      // Vegetables
      'carrot': { calories: 25, protein: 0.5, carbs: 6, fat: 0.1 },
      'broccoli': { calories: 25, protein: 3, carbs: 5, fat: 0.3 },
      'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
      'lettuce': { calories: 10, protein: 0.9, carbs: 2, fat: 0.1 },
      
      // Grains & Bread
      'bread': { calories: 70, protein: 2.3, carbs: 13, fat: 1.2 },
      'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      'pasta': { calories: 220, protein: 8, carbs: 44, fat: 1.3 },
      
      // Protein
      'egg': { calories: 70, protein: 6, carbs: 0.6, fat: 5 },
      'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      'beef': { calories: 250, protein: 26, carbs: 0, fat: 15 },
      'fish': { calories: 206, protein: 22, carbs: 0, fat: 12 },
      
      // Dairy
      'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
      'cheese': { calories: 113, protein: 7, carbs: 1, fat: 9 },
      'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
      
      // Default for unknown items
      'unknown': { calories: 50, protein: 1, carbs: 10, fat: 1 },
    };

    const key = itemName?.toLowerCase() || 'unknown';
    return nutritionDB[key] || nutritionDB['unknown'];
  }

  /**
   * Save processing results to local storage (if needed)
   * @param {Array} results - Processing results to save
   * @param {string} sessionId - Unique session identifier
   */
  async saveResultsLocally(results, sessionId) {
    try {
      // Since we can't use localStorage in Claude artifacts, 
      // this would be implemented in your actual app
      console.log('Saving results locally:', { results, sessionId });
      
      // In a real app, you might use:
      // await AsyncStorage.setItem(`processing_results_${sessionId}`, JSON.stringify(results));
      
      return true;
    } catch (error) {
      console.error('Error saving results locally:', error);
      return false;
    }
  }

  /**
   * Generate a unique session ID
   * @returns {string} - Unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();

export default apiService;

// Named exports for individual functions if needed
export {
  ApiService,
};