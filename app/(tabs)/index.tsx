// In your main screen (index.tsx), replace the navigation logic with:

import { setGlobalPhotos } from './processing'; // Import the global state function

const processPhotos = async () => {
  if (photos.length === 0) {
    Alert.alert('No Photos', 'Please capture or select some photos first');
    return;
  }

  // Instead of passing photos through URL params, use global state
  setGlobalPhotos(photos);
  
  // Navigate to processing screen without params
  router.push('/processing');
};

// Alternative Solution 1: Using React Context (Recommended)
// Create a context file (PhotoContext.js):

import React, { createContext, useContext, useState } from 'react';

const PhotoContext = createContext();

export const PhotoProvider = ({ children }) => {
  const [photos, setPhotos] = useState([]);
  const [processingResults, setProcessingResults] = useState([]);

  return (
    <PhotoContext.Provider value={{
      photos,
      setPhotos,
      processingResults,
      setProcessingResults
    }}>
      {children}
    </PhotoContext.Provider>
  );
};

export const usePhotoContext = () => {
  const context = useContext(PhotoContext);
  if (!context) {
    throw new Error('usePhotoContext must be used within a PhotoProvider');
  }
  return context;
};

// Alternative Solution 2: Using Expo Router with state
// In your main screen, you can also use router.push with state:

const processPhotos = async () => {
  if (photos.length === 0) {
    Alert.alert('No Photos', 'Please capture or select some photos first');
    return;
  }

  // Use router.push with state instead of params
  router.push({
    pathname: '/processing',
    // Don't pass large data through params
  });
};

// Alternative Solution 3: Using AsyncStorage for persistence
// If you want to persist the photos:

import AsyncStorage from '@react-native-async-storage/async-storage';

const processPhotos = async () => {
  if (photos.length === 0) {
    Alert.alert('No Photos', 'Please capture or select some photos first');
    return;
  }

  try {
    // Save photos to AsyncStorage
    await AsyncStorage.setItem('photos_to_process', JSON.stringify(photos));
    
    // Navigate to processing screen
    router.push('/processing');
  } catch (error) {
    console.error('Error saving photos:', error);
    Alert.alert('Error', 'Failed to save photos for processing');
  }
};

// Then in ProcessingScreen, retrieve from AsyncStorage:
// const retrievePhotos = async () => {
//   try {
//     const storedPhotos = await AsyncStorage.getItem('photos_to_process');
//     if (storedPhotos) {
//       setPhotos(JSON.parse(storedPhotos));
//     }
//   } catch (error) {
//     console.error('Error retrieving photos:', error);
//   }
// };