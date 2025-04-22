import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Dumbbell } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { generateWorkoutsFromSchedule } from '@/utils/workout';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type WorkoutType = 'Push' | 'Pull' | 'Legs' | 'Upper' | 'Lower' | 'Full Body' | 'Rest';

interface TrainingSchedule {
  day: string;
  workout: WorkoutType;
}

export default function ScheduleScreen() {
  console.log("SCHEDULE SCREEN: Rendering");
  
  const router = useRouter();
  const [schedule, setSchedule] = useState<TrainingSchedule[]>(
    WEEKDAYS.map(day => ({ day, workout: 'Rest' }))
  );
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  
  const calculateTrainingDaysPerWeek = (schedule: TrainingSchedule[]): number => {
    const activeTrainingDays = schedule.filter(day => day.workout !== 'Rest').length;
    console.log(`Calculated training days: ${activeTrainingDays}`);
    return activeTrainingDays;
  };

  useEffect(() => {
    
    const timer = setTimeout(() => {
      setInitialLoading(false);
      console.log("SCHEDULE SCREEN: Initial loading completed");
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  
  useEffect(() => {
    if (!initialLoading) {
      const daysCount = calculateTrainingDaysPerWeek(schedule);
      console.log(`Current schedule has ${daysCount} training days`);
    }
  }, [schedule, initialLoading]);

  const handleComplete = async () => {
    try {
      setLoading(true);
      console.log("Completing onboarding process...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      
      const trainingDaysPerWeek = calculateTrainingDaysPerWeek(schedule);
      console.log(`Saving ${trainingDaysPerWeek} training days per week to the database`);

      
      console.log("Saving schedule, training days, and marking user as onboarded...");
      const { error } = await supabase
        .from('profiles')
        .update({
          training_schedule: schedule,
          training_days_per_week: trainingDaysPerWeek, 
          is_onboarded: true,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      
      console.log("Generating workouts based on training split...");
      const workoutsCreated = await generateWorkoutsFromSchedule(schedule, user.id);
      console.log(`Created ${workoutsCreated} workout templates from schedule`);
      
      console.log("Successfully completed onboarding, redirecting to tabs...");
      
      
      setTimeout(() => {
        console.log("Executing navigation to tabs with timestamp...");
        try {
          
          router.replace(`/(tabs)/workouts?t=${Date.now()}`);
          console.log("Navigation command issued successfully");
        } catch (navError) {
          console.error("Navigation error:", navError);
        }
      }, 1000);
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkoutChange = (dayIndex: number, workout: WorkoutType) => {
    setSchedule(prev => {
      const newSchedule = [...prev];
      newSchedule[dayIndex] = { ...newSchedule[dayIndex], workout };
      return newSchedule;
    });
  };
  
 
  if (initialLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading training schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Training Split</Text>
      <Text style={styles.subtitle}>Choose your workout for each day</Text>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {WEEKDAYS.map((day, dayIndex) => (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day}</Text>
              <Dumbbell size={20} color="#007AFF" />
            </View>

            <View style={styles.workoutTypes}>
              {['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Rest'].map((workout) => (
                <TouchableOpacity
                  key={workout}
                  style={[
                    styles.workoutButton,
                    schedule[dayIndex].workout === workout && styles.workoutButtonSelected,
                    workout === 'Rest' && styles.restButton,
                    schedule[dayIndex].workout === workout && workout === 'Rest' && styles.restButtonSelected,
                  ]}
                  onPress={() => handleWorkoutChange(dayIndex, workout as WorkoutType)}
                >
                  <Text style={[
                    styles.workoutButtonText,
                    schedule[dayIndex].workout === workout && styles.workoutButtonTextSelected,
                  ]}>
                    {workout}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
  },
  workoutTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workoutButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  workoutButtonTextSelected: {
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: '#007AFF', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
});