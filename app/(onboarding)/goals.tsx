import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Scale, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

type FitnessGoal = 'lose' | 'gain' | 'maintain';

export default function GoalsScreen() {
  console.log("SCREEN: Goals screen rendering");

  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkIfAlreadyOnboarded() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        console.log("Goals screen: Checking if user is already onboarded");
        const { data, error } = await supabase
          .from('profiles')
          .select('is_onboarded')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error checking onboarding status in goals screen:", error);
          return;
        }
        
        console.log("Onboarding check in goals screen:", data?.is_onboarded);
        
        if (data && data.is_onboarded === true) {
          console.log("Goals screen: User already onboarded, redirecting to tabs");
          
          // Use a delay to ensure the component is mounted before navigation
          setTimeout(() => {
            // Force Navigation to tabs using replace and a timestamp to prevent caching
            router.replace({
              pathname: "/(tabs)",
              params: { t: Date.now() }
            });
          }, 500);
        } else {
          console.log("Goals screen: User needs onboarding, staying on this screen");
        }
      } catch (err) {
        console.error("Exception checking onboarding in goals screen:", err);
      }
    }
    
    checkIfAlreadyOnboarded();
  }, []);

  const handleContinue = async () => {
    if (!selectedGoal || !targetWeight) return;

    try {
      setLoading(true);
      console.log("NAVIGATION: Saving goals...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          fitness_goal: selectedGoal,
          target_weight: parseFloat(targetWeight),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      console.log("NAVIGATION: Successfully saved goals, redirecting to training-days...");
      router.push("/(onboarding)/training-days");
    } catch (error) {
      console.error('Error saving goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const goals = [
    { id: 'lose' as const, icon: TrendingDown, label: 'Lose Weight', color: '#FF3B30' },
    { id: 'maintain' as const, icon: Scale, label: 'Maintain Weight', color: '#007AFF' },
    { id: 'gain' as const, icon: TrendingUp, label: 'Gain Weight', color: '#34C759' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's Your Goal?</Text>
      <Text style={styles.subtitle}>Select your primary fitness goal</Text>

      <View style={styles.goalsContainer}>
        {goals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.goalCard,
              selectedGoal === goal.id && styles.goalCardSelected,
              { borderColor: selectedGoal === goal.id ? goal.color : '#E5E5EA' }
            ]}
            onPress={() => setSelectedGoal(goal.id)}
          >
            <goal.icon
              size={32}
              color={selectedGoal === goal.id ? goal.color : '#8E8E93'}
            />
            <Text style={[
              styles.goalLabel,
              { color: selectedGoal === goal.id ? goal.color : '#8E8E93' }
            ]}>
              {goal.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.weightContainer}>
        <Text style={styles.weightLabel}>Target Weight (kg)</Text>
        <TextInput
          style={styles.weightInput}
          value={targetWeight}
          onChangeText={setTargetWeight}
          placeholder="Enter target weight"
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!selectedGoal || !targetWeight || loading) && styles.continueButtonDisabled
        ]}
        onPress={handleContinue}
        disabled={!selectedGoal || !targetWeight || loading}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'Saving...' : 'Continue'}
        </Text>
        <ArrowRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    marginBottom: 32,
  },
  goalsContainer: {
    gap: 16,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
  },
  goalCardSelected: {
    backgroundColor: '#FFFFFF',
  },
  goalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  weightContainer: {
    marginTop: 32,
  },
  weightLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  weightInput: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 'auto',
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});