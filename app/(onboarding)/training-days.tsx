import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Calendar } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

export default function TrainingDaysScreen() {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedDays) return;

    try {
      setLoading(true);
      console.log("Saving training days and navigating to schedule...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          training_days_per_week: selectedDays,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      console.log("Successfully saved training days, navigating to schedule screen");
      router.push("/(onboarding)/schedule");
    } catch (error) {
      console.error('Error saving training days:', error);
    } finally {
      setLoading(false);
    }
  };

  const daysOptions = [2, 3, 4, 5, 6];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Training Days</Text>
      <Text style={styles.subtitle}>How many days per week can you commit to training?</Text>

      <View style={styles.cardsContainer}>
        {daysOptions.map((days) => (
          <TouchableOpacity
            key={days}
            style={[
              styles.card,
              selectedDays === days && styles.cardSelected
            ]}
            onPress={() => setSelectedDays(days)}
          >
            <Calendar
              size={24}
              color={selectedDays === days ? '#FFFFFF' : '#007AFF'}
            />
            <View style={styles.cardContent}>
              <Text style={[
                styles.daysText,
                selectedDays === days && styles.daysTextSelected
              ]}>
                {days} Days
              </Text>
              <Text style={[
                styles.perWeekText,
                selectedDays === days && styles.perWeekTextSelected
              ]}>
                per week
              </Text>
            </View>
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
    justifyContent: 'space-between',
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
    lineHeight: 24,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardSelected: {
    backgroundColor: '#007AFF',
  },
  cardContent: {
    flex: 1,
  },
  daysText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  daysTextSelected: {
    color: '#FFFFFF',
  },
  perWeekText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  perWeekTextSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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