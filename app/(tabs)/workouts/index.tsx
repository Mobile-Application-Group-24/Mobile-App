import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Plus, Star, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getWorkoutPlans, type WorkoutPlan } from '@/utils/storage';

export default function WorkoutsScreen() {
  const router = useRouter();
  const [showOwnWorkouts, setShowOwnWorkouts] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(5);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const todaysWorkout = {
    isRestDay: false,
    name: 'Upper Body Focus',
    duration: '60 min',
  };

  useEffect(() => {
    loadWorkoutPlans();
  }, []);

  const loadWorkoutPlans = async () => {
    try {
      setIsLoading(true);
      const plans = await getWorkoutPlans();
      setWorkoutPlans(plans);
    } catch (error) {
      console.error('Error loading workout plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = () => {
    if (todaysWorkout.isRestDay) {
      console.log('Starting rest day activities');
    } else {
      console.log('Starting workout:', todaysWorkout.name);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.safeArea} />
      <View style={styles.todaySection}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>Today's Workout</Text>
          <Text style={styles.todayDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutName}>
            {todaysWorkout.isRestDay ? 'Rest Day' : todaysWorkout.name}
          </Text>
          {!todaysWorkout.isRestDay && (
            <Text style={styles.workoutDuration}>{todaysWorkout.duration}</Text>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.startButton,
            todaysWorkout.isRestDay && styles.startButtonRest
          ]}
          onPress={handleStartWorkout}
        >
          <Play size={24} color="#FFFFFF" />
          <Text style={styles.startButtonText}>
            {todaysWorkout.isRestDay ? 'Start Recovery Session' : 'Start Workout'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.streakSection}>
        <View style={styles.streakHeader}>
          <Text style={styles.streakTitle}>Current Streak</Text>
          <Text style={styles.streakCount}>{currentStreak} days</Text>
        </View>
        <View style={styles.streakBar}>
          <View style={[styles.streakProgress, { width: `${(currentStreak / 7) * 100}%` }]} />
        </View>
        <Text style={styles.streakMotivation}>
          {currentStreak === 7 
            ? "You're on fire! 🔥" 
            : `${7 - currentStreak} more days until your next achievement!`}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Workout Plans</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/workouts/create')}
          >
            <Plus size={24} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create New Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, showOwnWorkouts && styles.filterButtonActive]}
            onPress={() => setShowOwnWorkouts(!showOwnWorkouts)}
          >
            <Star size={24} color={showOwnWorkouts ? "#FFFFFF" : "#007AFF"} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : workoutPlans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No workout plans yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first workout plan to get started!
            </Text>
          </View>
        ) : (
          workoutPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={styles.planCard}
              onPress={() => router.push(`/workouts/${plan.id}`)}
            >
              <View style={styles.planInfo}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planDetails}>
                  {plan.exercises.length} exercises
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeArea: {
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  todaySection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  todayHeader: {
    marginBottom: 12,
  },
  todayTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  todayDate: {
    fontSize: 16,
    color: '#8E8E93',
  },
  workoutInfo: {
    marginBottom: 16,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  workoutDuration: {
    fontSize: 16,
    color: '#8E8E93',
  },
  startButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonRest: {
    backgroundColor: '#34C759',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  streakSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  streakCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  streakBar: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  streakProgress: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  streakMotivation: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterButton: {
    width: 56,
    height: 56,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  planDetails: {
    fontSize: 14,
    color: '#8E8E93',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
});