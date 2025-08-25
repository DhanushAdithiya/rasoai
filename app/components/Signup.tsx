import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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

import { signup } from '@/actions/accounts';

interface SignupProps {
  onSignupSuccess: () => void;
  onBackToLogin: () => void;
}

export default function Signup({ onSignupSuccess, onBackToLogin }: SignupProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [goal, setGoal] = useState(''); // weight loss, maintenance, gain

  // Calculated macros (will be computed and editable)
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');


  const dietGoalOptions = [
  { label: 'Weight Loss', value: 'weight_loss' },
  { label: 'Weight Maintenance', value: 'maintenance' },
  { label: 'Weight Gain', value: 'weight_gain' },
  { label: 'Muscle Building', value: 'muscle_building' }
];

  const activityLevelOptions = [
    { label: 'Sedentary (little/no exercise)', value: 'sedentary' },
    { label: 'Lightly Active (light exercise 1-3 days/week)', value: 'light' },
    { label: 'Moderately Active (moderate exercise 3-5 days/week)', value: 'moderate' },
    { label: 'Very Active (hard exercise 6-7 days/week)', value: 'very_active' },
    { label: 'Extremely Active (very hard exercise, physical job)', value: 'extremely_active' }
  ];

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' }
  ];


  const calculateMacros = () => {
  if (!height || !weight || !age || !gender || !activityLevel || !goal) return;

  const heightCm = parseFloat(height);
  const weightKg = parseFloat(weight);
  const ageNum = parseInt(age);

  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161;
  }

  // Apply activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extremely_active: 1.9
  };

  let tdee = bmr * activityMultipliers[activityLevel];

  // Adjust based on goal
  let targetCalories;
  switch (goal) {
    case 'weight_loss':
      targetCalories = tdee - 500; // 500 calorie deficit
      break;
    case 'weight_gain':
    case 'muscle_building':
      targetCalories = tdee + 300; // 300 calorie surplus
      break;
    default: // maintenance
      targetCalories = tdee;
  }

  // Calculate macros (example ratios - can be adjusted)
  const proteinCals = targetCalories * 0.3; // 30% protein
  const carbCals = targetCalories * 0.4; // 40% carbs
  const fatCals = targetCalories * 0.3; // 30% fat

  setCalories(Math.round(targetCalories).toString());
  setProtein(Math.round(proteinCals / 4).toString()); // 4 calories per gram
  setCarbs(Math.round(carbCals / 4).toString()); // 4 calories per gram
  setFat(Math.round(fatCals / 9).toString()); // 9 calories per gram
};

// Call calculateMacros when relevant fields change
  React.useEffect(() => {
    calculateMacros();
  }, [height, weight, age, gender, activityLevel, goal]);


  const Dropdown = ({ options, value, onValueChange, placeholder, icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.inputContainer} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <MaterialIcons name={icon} size={20} color="#666" style={styles.inputIcon} />
        <Text style={[styles.input, styles.dropdownText, !value && styles.placeholderText]}>
          {value ? options.find(opt => opt.value === value)?.label : placeholder}
        </Text>
        <MaterialIcons name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={20} color="#666" />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownOptions}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.dropdownOption}
              onPress={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};


const handleSignup = async () => {
  if (!email.trim() || !name.trim() || !password.trim() || !confirmPassword.trim()) {
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  if (!email.includes('@')) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    Alert.alert('Error', 'Password must be at least 6 characters long');
    return;
  }

  if (password !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return;
  }

  if (!height || !weight || !age || !gender || !activityLevel || !goal) {
    Alert.alert('Error', 'Please fill in all personal information and goals');
    return;
  }

  if (!calories || !protein || !carbs || !fat) {
    Alert.alert('Error', 'Please ensure macro calculations are complete');
    return;
  }

  setIsLoading(true);
  
  // Updated signup call with all the new data
  const result = await signup({
    name,
    email,
    password,
    preferences,
    height: parseFloat(height),
    weight: parseFloat(weight),
    age: parseInt(age),
    gender,
    activityLevel,
    goal,
    
    macros: {
      calories: parseInt(calories),
      protein: parseInt(protein),
      carbs: parseInt(carbs),
      fat: parseInt(fat)
    }
  });
  
  setIsLoading(false);

  if ('error' in result) {
    Alert.alert('Signup Failed', result.error);
  } else {
    Alert.alert('Success', result.message, [
      { text: 'OK', onPress: onSignupSuccess },
    ]);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#49dcb1" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Text style={styles.logo}>raso.ai</Text>
            <Text style={styles.tagline}>Smart Nutrition Tracking</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join us to start your nutrition journey</Text>

            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons 
                  name={showPassword ? "visibility" : "visibility-off"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <MaterialIcons 
                  name={showConfirmPassword ? "visibility" : "visibility-off"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

              <Text style={styles.sectionLabel}>Personal Information</Text>
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <MaterialIcons name="height" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Height (cm)"
                    placeholderTextColor="#666"
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <MaterialIcons name="monitor-weight" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Weight (kg)"
                    placeholderTextColor="#666"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons name="cake" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Age"
                  placeholderTextColor="#666"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>

              <Dropdown
                options={genderOptions}
                value={gender}
                onValueChange={setGender}
                placeholder="Select Gender"
                icon="person"
              />

              {/* Goals & Activity Section */}
              <Text style={styles.sectionLabel}>Goals & Activity</Text>
              <Dropdown
                options={dietGoalOptions}
                value={goal}
                onValueChange={setGoal}
                placeholder="Select your goal"
                icon="flag"
              />

              <Dropdown
                options={activityLevelOptions}
                value={activityLevel}
                onValueChange={setActivityLevel}
                placeholder="Select activity level"
                icon="directions-run"
              />

              {/* Recommended Macros Section */}
              {calories && (
                <>
                  <Text style={styles.sectionLabel}>Recommended Daily Macros</Text>
                  <Text style={styles.macroNote}>
                    Based on your information, we recommend these daily targets. You can adjust them as needed.
                  </Text>
                  
                  <View style={styles.row}>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <MaterialIcons name="local-fire-department" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Calories"
                        placeholderTextColor="#666"
                        value={calories}
                        onChangeText={setCalories}
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>kcal</Text>
                    </View>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <MaterialIcons name="fitness-center" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Protein"
                        placeholderTextColor="#666"
                        value={protein}
                        onChangeText={setProtein}
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>g</Text>
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <MaterialIcons name="grain" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Carbs"
                        placeholderTextColor="#666"
                        value={carbs}
                        onChangeText={setCarbs}
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>g</Text>
                    </View>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <MaterialIcons name="opacity" size={20} color="#666" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Fat"
                        placeholderTextColor="#666"
                        value={fat}
                        onChangeText={setFat}
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>g</Text>
                    </View>
                  </View>
                </>
              )}

            <Text style={styles.sectionLabel}>Dietary Preferences</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <MaterialIcons name="favorite-border" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Vegetarian, Vegan, Gluten-free..."
                placeholderTextColor="#666"
                value={preferences}
                onChangeText={setPreferences}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.signupButtonText}>Creating Account...</Text>
              ) : (
                <>
                  <MaterialIcons name="person-add" size={20} color="#fff" />
                  <Text style={styles.signupButtonText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={onBackToLogin}>
              <Text style={styles.loginText}> Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  dropdownContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  dropdownText: {
    flex: 1,
    paddingVertical: 12,
  },
  placeholderText: {
    color: '#666',
  },
  dropdownOptions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 1000,
    maxHeight: 200,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  macroNote: {
    color: '#999',
    fontSize: 14,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  unitText: {
    color: '#666',
    fontSize: 14,
    paddingHorizontal: 8,
  },
  sectionLabel: {
    // Make sure this style exists or matches your existing one
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 20,
  },


  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 32,
    color: '#49dcb1',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: '#333',
  },
  textAreaContainer: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 76,
    textAlignVertical: 'top',
  },
  eyeIcon: {
    padding: 4,
  },
  dropdownContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dropdownOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  signupButton: {
    backgroundColor: '#49dcb1',
    borderRadius: 8,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    marginTop: 16,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  loginText: {
    color: '#49dcb1',
    fontSize: 14,
    fontWeight: '600',
  },
});