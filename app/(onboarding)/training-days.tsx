import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Dumbbell } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

export default function TrainingDaysScreen() {
  console.log("SCREEN: Training days screen rendering");

  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedDays) return;

    try {
      setLoading(true);
      console.log("NAVIGATION: Saving training days...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          training_days_per_week: selectedDays,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      console.log("NAVIGATION: Successfully saved training days, redirecting to schedule...");
      router.push("/(onboarding)/schedule");
    } catch (error) {
      console.error('Error saving training days:', error);
    } finally {
      setLoading(false);
    }
  };

  const trainingOptions = [
    { days: 3, label: '3 Days', description: 'Full body workouts' },
    { days: 4, label: '4 Days', description: 'Upper/Lower split' },
    { days: 5, label: '5 Days', description: 'Push/Pull/Legs split' },
    { days: 6, label: '6 Days', description: 'Arnold split' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Training Schedule</Text>
      <Text style={styles.subtitle}>How many days can you commit to training?</Text>

      <View style={styles.optionsContainer}>
        {trainingOptions.map((option) => (
          <TouchableOpacity
            key={option.days}
            style={[
              styles.optionCard,
              selectedDays === option.days && styles.optionCardSelected
            ]}
            onPress={() => setSelectedDays(option.days)}
          >
            <View style={styles.optionHeader}>
              <Dumbbell
                size={24}
                color={selectedDays === option.days ? '#FFFFFF' : '#007AFF'}
              />
              <Text style={[
                styles.optionLabel,
                selectedDays === option.days && styles.optionLabelSelected
              ]}>
                {option.label}
              </Text>
            </View>
            <Text style={[
              styles.optionDescription,
              selectedDays === option.days && styles.optionDescriptionSelected
            ]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!selectedDays || loading) && styles.continueButtonDisabled
        ]}
        onPress={handleContinue}
        disabled={!selectedDays || loading}
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
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    gap: 8,
  },
  optionCardSelected: {
    backgroundColor: '#007AFF',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  optionLabelSelected: {
    color: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  optionDescriptionSelected: {
    color: '#FFFFFF',
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