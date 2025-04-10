import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, SafeAreaView, Alert, Platform } from 'react-native';
import { Plus, Star, Play, Clock, Calendar, Dumbbell, Trash2, Filter } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getWorkouts, Workout, deleteWorkout, updateWorkout } from '@/utils/workout';
import { useSession } from '@/utils/auth';
import { format, parseISO } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [showOwnWorkouts, setShowOwnWorkouts] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(5);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<{
    id?: string;
    isRestDay: boolean;
    name: string;
    duration: string;
  }>({
    isRestDay: true,
    name: 'Rest Day',
    duration: '0 min',
  });
  const [filterType, setFilterType] = useState<'all' | 'split' | 'custom'>('split');

  const getCurrentDayOfWeek = (): string => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  };

  const loadWorkouts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!session?.user?.id) {
        setError('User not authenticated');
        setWorkouts([]);
        return;
      }

      const data = await getWorkouts(session.user.id);

      // Filter workouts based on type selection
      let filteredData = data;
      if (filterType !== 'all') {
        filteredData = data.filter(workout => workout.workout_type === filterType);
      }

      setWorkouts(filteredData);
      console.log(`Loaded ${filteredData.length} ${filterType} workouts for user ${session.user.id}`);

      const currentDay = getCurrentDayOfWeek();
      const workoutForToday = filteredData.find(
        w => w.day_of_week === currentDay && w.workout_type === 'split'
      );

      if (workoutForToday) {
        setTodaysWorkout({
          id: workoutForToday.id,
          isRestDay: false,
          name: workoutForToday.title,
          duration: `${workoutForToday.duration_minutes} min`,
        });
        console.log(`Found today's workout: ${workoutForToday.title}`);
      } else {
        setTodaysWorkout({
          isRestDay: true,
          name: 'Rest Day',
          duration: '0 min',
        });
        console.log(`No workout found for ${currentDay}, it's a rest day`);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
      setError('Failed to load workouts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = () => {
    if (todaysWorkout.isRestDay) {
      console.log('Today is a rest day');
      Alert.alert(
        "Rest Day",
        "Today is your rest day. Take time to recover and prepare for your next workout.",
        [{ text: "OK", style: "default" }]
      );
    } else if (todaysWorkout.id) {
      console.log('Starting workout:', todaysWorkout.name);
      router.push(`/workouts/${todaysWorkout.id}`);
    }
  };

  const handleDeleteWorkout = (workoutId: string) => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkout(workoutId);
              setWorkouts(prev => prev.filter(w => w.id !== workoutId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  const handleMarkWorkoutDone = async (workoutId: string, isDone: boolean) => {
    try {
      await updateWorkout(workoutId, { done: isDone });
      setWorkouts(prev => 
        prev.map(w => w.id === workoutId ? { ...w, done: isDone } : w)
      );
    } catch (error) {
      console.error('Error updating workout status:', error);
      Alert.alert('Error', 'Failed to update workout status');
    }
  };

  const renderRightActions = (workoutId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDeleteWorkout(workoutId)}
      >
        <Trash2 size={20} color="#FFFFFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const toggleFilter = () => {
    // Cycle through filter options: split -> custom -> all -> split
    if (filterType === 'split') {
      setFilterType('custom');
    } else if (filterType === 'custom') {
      setFilterType('all');
    } else {
      setFilterType('split');
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        loadWorkouts();
      }
    }, [session?.user?.id])
  );

  useEffect(() => {
    if (session?.user?.id) {
      loadWorkouts();
    } else {
      setIsLoading(false);
      setError('Please log in to view your workouts');
    }
  }, [filterType, session?.user?.id]);

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'ios' && { paddingTop: 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {Platform.OS === 'android' && <View style={styles.safeArea} />}
      <ScrollView style={styles.container}>
        <View style={styles.todaySection}>
          <View style={styles.todayHeader}>
            <Text style={styles.todayTitle}>Today's Workout</Text>
            <Text style={styles.todayDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 16 }} />
          ) : (
            <>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName}>
                  {todaysWorkout.isRestDay ? 'Rest Day' : todaysWorkout.name}
                </Text>
                {!todaysWorkout.isRestDay && (
                  <Text style={styles.workoutDuration}>{todaysWorkout.duration}</Text>
                )}
                {todaysWorkout.isRestDay && (
                  <Text style={styles.workoutDuration}>Recovery and muscle growth</Text>
                )}
              </View>

              <TouchableOpacity 
                style={[
                  styles.startButton,
                  todaysWorkout.isRestDay ? styles.startButtonRest : styles.startButtonWorkout
                ]}
                onPress={handleStartWorkout}
                activeOpacity={0.7}
              >
                <Play size={24} color="#FFFFFF" />
                <Text style={styles.startButtonText}>
                  {todaysWorkout.isRestDay ? 'View Recovery Tips' : 'Start Workout'}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
          <Text style={styles.sectionTitle}>Your Workout Plans</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/workouts/create')}
              activeOpacity={0.7}
            >
              <Plus size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create New Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterButton, styles.filterButtonActive]}
              onPress={toggleFilter}
              activeOpacity={0.7}
            >
              <Filter size={24} color="#FFFFFF" />
              <Text style={styles.filterText}>{filterType === 'all' ? 'All' : filterType === 'split' ? 'Split' : 'Custom'}</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No workout plans yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first workout plan to get started!
              </Text>
            </View>
          ) : (
            workouts.map((plan) => (
              <Swipeable
                key={plan.id}
                renderRightActions={() => renderRightActions(plan.id)}
                rightThreshold={40}
              >
                <TouchableOpacity
                  style={[styles.planCard, plan.done && styles.completedPlanCard]}
                  onPress={() => router.push(`/workouts/${plan.id}`)}
                >
                  <View style={styles.planInfo}>
                    <View style={styles.planNameRow}>
                      <Text style={styles.planName}>{plan.title}</Text>
                      {plan.done && (
                        <View style={styles.doneTag}>
                          <Text style={styles.doneTagText}>Completed</Text>
                        </View>
                      )}
                      <View style={[
                        styles.typeTag, 
                        plan.workout_type === 'split' ? styles.splitTag : styles.customTag
                      ]}>
                        <Text style={[
                          styles.typeTagText,
                          plan.workout_type === 'split' ? { color: '#007AFF' } : { color: '#FF9F0A' }
                        ]}>
                          {plan.workout_type === 'split' ? 'Split' : 'Custom'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.planDetails}>
                      <View style={styles.detailItem}>
                        <Dumbbell size={14} color="#8E8E93" />
                        <Text style={styles.detailText}>
                          {plan.exercises?.length > 0 
                            ? `${plan.exercises.length} exercises` 
                            : "No exercises yet"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeArea: {
    height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    elevation: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonWorkout: {
    backgroundColor: '#007AFF', // Green button for workouts
  },
  startButtonRest: {
    backgroundColor: '#007AFF', // Blue button for rest days
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  filterButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    padding: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  completedPlanCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  planInfo: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  splitTag: {
    backgroundColor: '#007AFF20',
  },
  customTag: {
    backgroundColor: '#FF9F0A20',
  },
  typeTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  doneTag: {
    backgroundColor: '#34C75920',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  doneTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#34C759',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  planDetails: {
    flexDirection: 'row',
    marginTop: 8,
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
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'column',
    gap: 4,
    marginBottom: 12,  // Same spacing as the card
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});