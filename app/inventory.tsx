import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { server } from '@/actions/accounts';

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [itemUnit, setItemUnit] = useState('');

  const router = useRouter();

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
        await fetchInventory(storedUserId);
      } else {
        Alert.alert('Error', 'User not found. Please login again.');
        router.back();
      }
    } catch (error) {
      console.error('Error initializing page:', error);
      Alert.alert('Error', 'Failed to initialize page');
    }
  };

  const fetchInventory = async (userIdToUse = userId) => {
    if (!userIdToUse) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${server}get_ingredients/${userIdToUse}`);
      const data = await response.json();
      
      if (data.ingredients) {
        setInventoryItems(data.ingredients);
      } else {
        setInventoryItems([]);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert('Error', 'Failed to fetch inventory. Please check your connection.');
      setInventoryItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemName(item.Name || '');
    setItemQuantity(item.Quantity?.toString() || '');
    setItemUnit(item.Unit || '');
    setEditModalVisible(true);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemQuantity('');
    setItemUnit('');
    setAddModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Item name is required');
      return;
    }

    if (!itemQuantity.trim() || isNaN(parseFloat(itemQuantity))) {
      Alert.alert('Error', 'Valid quantity is required');
      return;
    }

    setIsUpdating(true);
    try {
      const itemData = {
        name: itemName.trim(),
        quantity: parseFloat(itemQuantity),
        unit: itemUnit.trim() || 'units'
      };

      let response;
      if (editingItem) {
        // Update existing item
        response = await fetch(`${server}update_ingredient/${editingItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });
      } else {
        // Add new item
        response = await fetch(`${server}add_ingredient/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(itemData),
        });
      }

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success', 
          editingItem ? 'Item updated successfully' : 'Item added successfully',
          [{ text: 'OK', onPress: () => {
            setEditModalVisible(false);
            setAddModalVisible(false);
            fetchInventory();
          }}]
        );
      } else {
        Alert.alert('Error', data.detail || data.error || 'Failed to save item');
      }
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please check your connection.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.Name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${server}delete_ingredient/${item.id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Success', 'Item deleted successfully');
                fetchInventory();
              } else {
                const data = await response.json();
                Alert.alert('Error', data.detail || data.error || 'Failed to delete item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item. Please check your connection.');
            }
          }
        }
      ]
    );
  };

  const renderInventoryItem = (item, index) => (
    <View key={item.id || index} style={styles.inventoryItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.Name}</Text>
        <Text style={styles.itemQuantity}>
          {item.Quantity} {item.Units || 'units'}
        </Text>
        {item.created_at && (
          <Text style={styles.itemDate}>
            Added: {new Date(item.created_at).toLocaleDateString()}
          </Text>
        )}
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditItem(item)}
        >
          <MaterialIcons name="edit" size={20} color="#49dcb1" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item)}
        >
          <MaterialIcons name="delete" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModal = (visible, onClose, title) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Enter item name"
                placeholderTextColor="#666"
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quantity *</Text>
              <TextInput
                style={styles.textInput}
                value={itemQuantity}
                onChangeText={setItemQuantity}
                placeholder="Enter quantity"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Unit</Text>
              <TextInput
                style={styles.textInput}
                value={itemUnit}
                onChangeText={setItemUnit}
                placeholder="e.g., kg, pieces, liters"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isUpdating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveItem}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Inventory ({inventoryItems.length})
        </Text>
        <TouchableOpacity onPress={() => fetchInventory()}>
          <MaterialIcons name="refresh" size={24} color="#49dcb1" />
        </TouchableOpacity>
      </View>

      {/* Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddItem}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add New Item</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#49dcb1" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : inventoryItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inventory" size={64} color="#666" />
          <Text style={styles.emptyText}>No items in inventory</Text>
          <Text style={styles.emptySubtext}>
            Add items to start tracking your ingredients
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {inventoryItems.map(renderInventoryItem)}
        </ScrollView>
      )}

      {/* Edit Modal */}
      {renderModal(
        editModalVisible, 
        () => setEditModalVisible(false), 
        'Edit Item'
      )}

      {/* Add Modal */}
      {renderModal(
        addModalVisible, 
        () => setAddModalVisible(false), 
        'Add New Item'
      )}
    </SafeAreaView>
  );
}

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
  addButtonContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  addButton: {
    backgroundColor: '#49dcb1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  inventoryItem: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#49dcb1',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemQuantity: {
    color: '#49dcb1',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemDate: {
    color: '#666',
    fontSize: 12,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: 'rgba(73, 220, 177, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 8,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#333',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#555',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#49dcb1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});