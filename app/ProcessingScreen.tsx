import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


// API configuration
const API_BASE_URL = "http://10.238.248.72:8000/"  

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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [extractedItems, setExtractedItems] = useState([]);
  const [showInventoryReview, setShowInventoryReview] = useState(false);
  const [userId, setUserId] = useState(''); 

useEffect(() => {
  const init = async () => {
    try {
      // Get photos from global state instead of URL params
      const storedPhotos = getGlobalPhotos();
      if (storedPhotos && storedPhotos.length > 0) {
        setPhotos(storedPhotos);
      } else {
        Alert.alert('Error', 'No photos available for processing');
      }

      // Get user ID from AsyncStorage
      const storedUserId = await AsyncStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      } else {
        Alert.alert('Error', 'User ID not found in storage');
      }
    } catch (error) {
      console.error('Error fetching user ID or photos:', error);
    }
  };

  init();
}, []);


  const processPhotos = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'No photos available for processing');
      return;
    }
    setShowTypeModal(true);
  };

  const handleTypeSelection = (type) => {
    setSelectedType(type);
    setShowTypeModal(false);
    startProcessing(type);
  };

  const startProcessing = async (type) => {
    setProcessing(true);
    setExtractedItems([]);
    
    try {
      const allItems = [];
      
      for (let i = 0; i < photos.length; i++) {
        setCurrentPhotoIndex(i);
        
        const photo = photos[i];
        const formData = new FormData();
        
        // Create file object for upload
        formData.append('file', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${i}.jpg`,
        });

        if (type === 'bill' && userId) {
          formData.append('user_id', userId);
        }

        const endpoint = type === 'bill' ? 'extract-bill-upload/' : 'detect-items/';
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (type === 'bill') {
          if (result.success) {
            allItems.push(...result.items.map(item => ({
              name: item.name,
              quantity: item.quantity.value,
              unit: item.quantity.unit,
              display: item.quantity_display,
              photoIndex: i
            })));
          }
        } else {
          // Handle detect-items response
          Object.entries(result.items).forEach(([name, quantity]) => {
            allItems.push({
              name,
              quantity,
              unit: 'pcs', // Default unit for detected items
              display: `${quantity} pcs`,
              photoIndex: i
            });
          });
        }
      }

      setExtractedItems(allItems);
      setShowInventoryReview(true);
      
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Error', 
        'An error occurred while processing your photos. Please try again.'
      );
    } finally {
      setProcessing(false);
      setCurrentPhotoIndex(0);
    }
  };

  const updateItemQuantity = (index, newQuantity) => {
    const updatedItems = [...extractedItems];
    updatedItems[index].quantity = parseFloat(newQuantity) || 0;
    updatedItems[index].display = `${updatedItems[index].quantity} ${updatedItems[index].unit}`;
    setExtractedItems(updatedItems);
  };

  const updateItemUnit = (index, newUnit) => {
    const updatedItems = [...extractedItems];
    updatedItems[index].unit = newUnit;
    updatedItems[index].display = `${updatedItems[index].quantity} ${newUnit}`;
    setExtractedItems(updatedItems);
  };

  // NEW: Function to remove an item from the review list
  const removeItem = (index) => {
    setExtractedItems(currentItems => currentItems.filter((_, i) => i !== index));
  };


const addItemsToInventory = async () => {
  if (!userId) {
    Alert.alert('Error', 'User ID not found. Please log in again.');
    return;
  }

  setProcessing(true);
  let successCount = 0;
  let errorCount = 0;

  try {
    for (const item of extractedItems) {
      if (item.quantity > 0) {
        console.log(item);

        // Quantity stays as-is, unit will also be sent
        const response = await fetch(`${API_BASE_URL}add_ingredient/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            name: item.name,
            quantity: Math.round(item.quantity), // keep original quantity
            unit: item.unit || 'pcs'            // pass unit too
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      }
    }

    Alert.alert(
      'Inventory Updated',
      `Successfully added ${successCount} items to your inventory.${errorCount > 0 ? ` ${errorCount} items failed to add.` : ''}`,
      [
        {
          text: 'OK',
          onPress: () => {
            setShowInventoryReview(false);
            router.push('/');
          }
        }
      ]
    );

  } catch (error) {
    console.error('Error adding items to inventory:', error);
    Alert.alert('Error', 'Failed to add items to inventory. Please try again.');
  } finally {
    setProcessing(false);
  }
};


  const renderTypeSelectionModal = () => (
    <Modal
      visible={showTypeModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>What type of photo are you processing?</Text>
          
          <TouchableOpacity 
            style={styles.typeButton}
            onPress={() => handleTypeSelection('bill')}
          >
            <MaterialIcons name="receipt" size={32} color="#49dcb1" />
            <View style={styles.typeButtonContent}>
              <Text style={styles.typeButtonTitle}>Bill/Receipt</Text>
              <Text style={styles.typeButtonSubtitle}>
                Extract items and quantities from grocery receipts
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.typeButton}
            onPress={() => handleTypeSelection('items')}
          >
            <MaterialIcons name="camera" size={32} color="#49dcb1" />
            <View style={styles.typeButtonContent}>
              <Text style={styles.typeButtonTitle}>Food Items</Text>
              <Text style={styles.typeButtonSubtitle}>
                Detect and count food items in photos
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setShowTypeModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderUnitSelector = (item, index) => {
    // Only show unit selector for weight-based items (grams/kg)
    if (item.unit !== 'g' && item.unit !== 'kg' && item.unit !== 'grams') {
      return <Text style={styles.unitText}>{item.unit}</Text>;
    }

    return (
      <View style={styles.unitSelector}>
        <TouchableOpacity 
          style={[
            styles.unitButton, 
            (item.unit === 'g' || item.unit === 'grams') && styles.unitButtonActive
          ]}
          onPress={() => updateItemUnit(index, 'g')}
        >
          <Text style={[
            styles.unitButtonText,
            (item.unit === 'g' || item.unit === 'grams') && styles.unitButtonTextActive
          ]}>g</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.unitButton, 
            item.unit === 'kg' && styles.unitButtonActive
          ]}
          onPress={() => updateItemUnit(index, 'kg')}
        >
          <Text style={[
            styles.unitButtonText,
            item.unit === 'kg' && styles.unitButtonTextActive
          ]}>kg</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInventoryReview = () => (
<Modal visible={showInventoryReview} animationType="slide">
  <SafeAreaView style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity onPress={() => setShowInventoryReview(false)}>
        <MaterialIcons name="close" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Review Items</Text>
      <View style={{ width: 24 }} />
    </View>

    <ScrollView style={styles.content}>
      {/* Title */}
      <Text style={styles.reviewTitle}>
        Found {extractedItems.length} items. Review and adjust quantities:
      </Text>

      {/* Item List */}
      {extractedItems.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          {/* Item Header */}
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeItem(index)}>
              <MaterialIcons name="delete-forever" size={24} color="#f44336" />
            </TouchableOpacity>
          </View>

          {/* Quantity + Unit */}
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <TextInput
              style={styles.quantityInput}
              value={item.quantity.toString()}
              onChangeText={(text) => updateItemQuantity(index, text)}
              keyboardType="numeric"
              placeholder="0"
            />

            {/* Unit Selector */}
            <Picker
              selectedValue={item.unit || 'pcs'}
              style={{ height: 40, width: 100 ,color: '#fff' }}
              onValueChange={(value) => updateItemUnit(index, value)}
              mode="dropdown"
            >
              <Picker.Item label="pcs" value="pcs" />
              <Picker.Item label="g" value="g" />
              <Picker.Item label="kg" value="kg" />
            </Picker>
          </View>
        </View>
      ))}

      {/* Add to Inventory Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.addToInventoryButton}
          onPress={addItemsToInventory}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addToInventoryText}>Add to Inventory</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  </SafeAreaView>
</Modal>
  );

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

        {!processing && (
          <TouchableOpacity style={styles.processButton} onPress={processPhotos}>
            <MaterialIcons name="psychology" size={24} color="#fff" />
            <Text style={styles.processButtonText}>Start Processing</Text>
          </TouchableOpacity>
        )}

        {renderProcessingStatus()}
      </ScrollView>

      {renderTypeSelectionModal()}
      {renderInventoryReview()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  photoSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#49dcb1',
    paddingVertical: 15,
    borderRadius: 10,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  processingContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  processingText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 10,
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#2c2c2c',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#49dcb1',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#1c1c1c',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  typeButtonContent: {
    marginLeft: 15,
    flex: 1,
  },
  typeButtonTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  typeButtonSubtitle: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 15,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#49dcb1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Inventory Review Styles
  reviewTitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  itemCard: {
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flexShrink: 1,
    marginRight: 10,
  },
  itemPhoto: {
    fontSize: 12,
    color: '#888',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityLabel: {
    color: '#ccc',
    fontSize: 16,
    marginRight: 10,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    padding: 8,
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 16,
  },
  unitSelector: {
    flexDirection: 'row',
    marginLeft: 10,
    borderRadius: 5,
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  unitButtonActive: {
    backgroundColor: '#49dcb1',
  },
  unitButtonText: {
    color: '#fff',
  },
  unitButtonTextActive: {
    fontWeight: 'bold',
  },
  unitText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  addToInventoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#49dcb1',
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
  },
  addToInventoryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ProcessingScreen;