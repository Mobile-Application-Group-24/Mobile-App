import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Rest';

interface TrainingSchedule {
  day: string;
  workout: WorkoutType;
}

export default function ScheduleScreen() {
  console.log("SCREEN: Schedule screen rendering");
  const router = useRouter();
  const [schedule, setSchedule] = useState<TrainingSchedule[]>(
    WEEKDAYS.map(day => ({ day, workout: 'Rest' }))
  );
  const [loading, setLoading] = useState(false);

  const workoutTypes: WorkoutType[] = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Rest'];

  const handleWorkoutSelect = (dayIndex: number, workout: WorkoutType) => {
    setSchedule(prev => {
      const newSchedule = [...prev];
      newSchedule[dayIndex] = { ...newSchedule[dayIndex], workout };
      return newSchedule;
    });
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      console.log("NAVIGATION: Completing onboarding...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log("NAVIGATION: Saving schedule and setting is_onboarded to true...");
      
      // First update the profile in the database
      const { error } = await supabase
        .from('profiles')
        .update({
          training_schedule: schedule,
          is_onboarded: true,
        })
        .eq('id', user.id);

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
      
      // Verify that the update succeeded
      const { data, error: verifyError } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', user.id)
        .single();
        
      if (verifyError) {
        console.error("Error verifying onboarding status:", verifyError);
      } else {
        console.log("Verified onboarding status in database:", data.is_onboarded);
      }
      
      // Force a small delay to ensure the database update has propagated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log("NAVIGATION: Onboarding completed successfully, redirecting to tabs...");
      // Redirect explicitly to workouts tab
      router.replace('/(tabs)/workouts');
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Training Schedule</Text>
      <Text style={styles.subtitle}>Set your weekly workout schedule</Text>

      <ScrollView style={styles.content}>
        {WEEKDAYS.map((day, dayIndex) => (
          <View key={day} style={styles.dayContainer}>
            <Text style={styles.dayLabel}>{day}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.workoutTypes}
            >
              {workoutTypes.map((workout) => (
                <TouchableOpacity
                  key={workout}
                  style={[
                    styles.workoutButton,
                    schedule[dayIndex].workout === workout && styles.workoutButtonSelected,
                    workout === 'Rest' && styles.restButton,
                    schedule[dayIndex].workout === workout && workout === 'Rest' && styles.restButtonSelected,
                  ]}
                  onPress={() => handleWorkoutSelect(dayIndex, workout)}
                >
                  <Text style={[
                    styles.workoutButtonText,
                    schedule[dayIndex].workout === workout && styles.workoutButtonTextSelected,
                  ]}>
                    {workout}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.completeButton, loading && styles.completeButtonDisabled]}
        onPress={handleComplete}
        disabled={loading}
      >
        <Text style={styles.completeButtonText}>
          {loading ? 'Saving...' : 'Complete Setup'}
        </Text>
        <Check size={20} color="#FFFFFF" />
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
  content: {
    flex: 1,
  },
  dayContainer: {
    marginBottom: 24,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  workoutTypes: {
    gap: 8,
    paddingRight: 16,
  },
  workoutButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  workoutButtonSelected: {
    backgroundColor: '#007AFF',
  },
  restButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  restButtonSelected: {
    backgroundColor: '#8E8E93',
    borderColor: '#8E8E93',
  },
  workoutButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  workoutButtonTextSelected: {
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: '#34C759',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});