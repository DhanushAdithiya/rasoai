import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function RecipeScreen() {
  const { meal } = useLocalSearchParams();

  const recipes = {
    breakfast: {
      title: "🍳 Breakfast",
      steps: [
        "1. Scramble 2 eggs with a pinch of salt.",
        "2. Toast 2 slices of bread.",
        "3. Serve with a banana and a cup of black coffee.",
      ],
    },
    lunch: {
      title: "🥗 Lunch",
      steps: [
        "1. Grill 150g chicken breast with herbs.",
        "2. Toss lettuce, tomato, cucumber with olive oil.",
        "3. Add quinoa and top with grilled chicken.",
      ],
    },
    dinner: {
      title: "🍛 Dinner",
      steps: [
        "1. Cook brown rice (1 cup).",
        "2. Saute veggies and tofu in soy sauce.",
        "3. Serve hot with rice and garnish with sesame seeds.",
      ],
    },
  };

  const recipe = recipes[meal] ?? { title: 'Not found', steps: ['No recipe available.'] };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{recipe.title} Recipe</Text>
      {recipe.steps.map((step, idx) => (
        <Text key={idx} style={styles.step}>{step}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d', padding: 20 },
  title: { fontSize: 22, color: '#49dcb1', fontWeight: 'bold', marginBottom: 16 },
  step: { color: '#ccc', fontSize: 16, marginBottom: 12 },
});
