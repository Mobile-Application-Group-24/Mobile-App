import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, SafeAreaView, Alert, Platform } from 'react-native';
import { Plus, Star, Play, Clock, Calendar, Dumbbell, Trash2, Filter, Timer, GaugeCircle, Circle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getWorkoutPlans, WorkoutPlan, deleteWorkoutPlan, updateWorkoutPlan, getWorkouts } from '@/utils/supabase';
import { useSession } from '@/utils/auth';
import { format, parseISO, startOfWeek, addDays, isWithinInterval, isSameDay, subDays } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WorkoutsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [showOwnWorkouts, setShowOwnWorkouts] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [weeklyCompletion, setWeeklyCompletion] = useState(0);
  const [totalTrainingDays, setTotalTrainingDays] = useState(0); 
  const [completedTrainingDays, setCompletedTrainingDays] = useState(0); 
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isLoadingToday, setIsLoadingToday] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<{
    id?: string;
    isRestDay: boolean;
    name: string;
    duration: string;
    isCompleted?: boolean;
  }>({
    isRestDay: true,
    name: 'Rest Day',
    duration: '0 min',
    isCompleted: false,
  });
  const [filterType, setFilterType] = useState<'all' | 'split' | 'custom'>('all');

  const getCurrentDayOfWeek = (): string => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  };

  useEffect(() => {
    const loadFilter = async () => {
      try {
        const savedFilter = await AsyncStorage.getItem('workout-filter-type');
        if (savedFilter && (savedFilter === 'all' || savedFilter === 'split' || savedFilter === 'custom')) {
          setFilterType(savedFilter as 'all' | 'split' | 'custom');
        }
      } catch (error) {
        console.log('Error loading filter type:', error);
      }
    };
    loadFilter();
  }, []);

  useEffect(() => {
    const saveFilter = async () => {
      try {
        await AsyncStorage.setItem('workout-filter-type', filterType);
      } catch (error) {
        console.log('Error saving filter type:', error);
      }
    };
    saveFilter();
  }, [filterType]);

  const loadTodaysWorkout = async () => {
    try {
      setIsLoadingToday(true);
      if (!session?.user?.id) return;

      const data = await getWorkoutPlans(session.user.id);
      const completedWorkouts = await getWorkouts(session.user.id);
      
      const currentDay = getCurrentDayOfWeek();
      const workoutPlanForToday = data.find(
        w => w.day_of_week === currentDay && w.workout_type === 'split'
      );

      if (workoutPlanForToday) {
        
        const similarWorkouts = completedWorkouts.filter(w => 
          w.workout_plan_id === workoutPlanForToday.id && 
          w.start_time && 
          w.end_time
        );

        let averageDuration = 60; 
        if (similarWorkouts.length > 0) {
          const totalDuration = similarWorkouts.reduce((acc, workout) => {
            const start = new Date(workout.start_time);
            const end = new Date(workout.end_time);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60); 
            return acc + duration;
          }, 0);
          averageDuration = Math.round(totalDuration / similarWorkouts.length);
        }

        
        const today = new Date();
        const isTodaysWorkoutCompleted = completedWorkouts.some(w => {

          if (!w.start_time || !w.done) return false;
          
          const workoutStartTime = parseISO(w.start_time);
          return isSameDay(workoutStartTime, today) && 
                w.workout_plan_id === workoutPlanForToday.id;
        });

        setTodaysWorkout({
          id: workoutPlanForToday.id,
          isRestDay: false,
          name: workoutPlanForToday.title,
          duration: `${averageDuration} min`,
          isCompleted: isTodaysWorkoutCompleted
        });
      } else {
        setTodaysWorkout({
          isRestDay: true,
          name: 'Rest Day',
          duration: '0 min',
          isCompleted: false
        });
      }
    } catch (error) {
      console.error('Error loading today\'s workout:', error);
    } finally {
      setIsLoadingToday(false);
    }
  };

  const loadWorkoutPlans = async () => {
    try {
      setIsLoadingPlans(true);
      setError(null);
      
      if (!session?.user?.id) {
        setError('User not authenticated');
        setWorkoutPlans([]);
        return;
      }

      const data = await getWorkoutPlans(session.user.id);

      const currentFilter = filterType;
      console.log(`Applying filter: ${currentFilter}`);

      let filteredData = data;
      if (currentFilter !== 'all') {
        filteredData = data.filter(plan => plan.workout_type === currentFilter);
      }

      const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      filteredData.sort((a, b) => {

        if (a.workout_type === 'split' && b.workout_type === 'split') {
          return weekdayOrder.indexOf(a.day_of_week || '') - weekdayOrder.indexOf(b.day_of_week || '');
        }

        else if (a.workout_type === 'split' && b.workout_type === 'custom') {
          return -1;
        }
        else if (a.workout_type === 'custom' && b.workout_type === 'split') {
          return 1;
        }

        return a.title.localeCompare(b.title);
      });

      setWorkoutPlans(filteredData);
      console.log(`Loaded ${filteredData.length} ${currentFilter} workout plans out of ${data.length} total plans`);
      
    } catch (error) {
      console.error('Error loading workout plans:', error);
      setError('Failed to load workout plans. Please try again.');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const loadWorkouts = async () => {
    try {
      setIsLoading(true);
      setIsLoadingPlans(true);
      setIsLoadingToday(true);
      setError(null);
      
      if (!session?.user?.id) {
        setError('User not authenticated');
        setWorkoutPlans([]);
        return;
      }

      await Promise.all([
        loadTodaysWorkout(),
        loadWorkoutPlans()
      ]);
      
    } catch (error) {
      console.error('Error loading workouts:', error);
      setError('Failed to load workouts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStreak = async () => {
    try {
      if (!session?.user?.id) return;

      const plans = await getWorkoutPlans(session.user.id);
      const workouts = await getWorkouts(session.user.id);

      const schedule = {
        Monday: plans.find(p => p.day_of_week === 'Monday' && p.workout_type === 'split'),
        Tuesday: plans.find(p => p.day_of_week === 'Tuesday' && p.workout_type === 'split'),
        Wednesday: plans.find(p => p.day_of_week === 'Wednesday' && p.workout_type === 'split'),
        Thursday: plans.find(p => p.day_of_week === 'Thursday' && p.workout_type === 'split'),
        Friday: plans.find(p => p.day_of_week === 'Friday' && p.workout_type === 'split'),
        Saturday: plans.find(p => p.day_of_week === 'Saturday' && p.workout_type === 'split'),
        Sunday: plans.find(p => p.day_of_week === 'Sunday' && p.workout_type === 'split'),
      };

      const trainingDaysCount = Object.values(schedule).filter(Boolean).length;
      setTotalTrainingDays(trainingDaysCount);

      const today = new Date();
      const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });

      let completedDaysThisWeek = 0;
      let plannedDaysThisWeek = 0;

      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(startOfCurrentWeek, i);
        const dayName = format(currentDay, 'EEEE');

        if (schedule[dayName]) {
          plannedDaysThisWeek++;

          if (currentDay <= today) {
            
            const workoutForThisDay = workouts.find(w => {
              
              if (!w.start_time || !w.done) return false;
              
              const workoutStartTime = parseISO(w.start_time);
              return isSameDay(workoutStartTime, currentDay) && 
                     w.workout_plan_id === schedule[dayName]?.id;
            });

            if (workoutForThisDay) {
              completedDaysThisWeek++;
            }
          }
        }
      }

      setCompletedTrainingDays(completedDaysThisWeek);

      const weeklyPercentage = plannedDaysThisWeek > 0 
        ? Math.round((completedDaysThisWeek / plannedDaysThisWeek) * 100)
        : 0;

      setWeeklyCompletion(weeklyPercentage);

      let streak = 0;
      let currentDate = today;
      let consecutiveDays = true;

      for (let i = 0; i <= 100; i++) {
        const dayName = format(currentDate, 'EEEE');

        if (schedule[dayName]) {
   
          const workoutForThisDay = workouts.find(w => {
            
            if (!w.start_time || !w.done) return false;
            
            const workoutStartTime = parseISO(w.start_time);
            return isSameDay(workoutStartTime, currentDate) &&
              w.workout_plan_id === schedule[dayName]?.id;
          });

          if (workoutForThisDay) {
 
            streak++;
          } else if (i > 0) { 

            consecutiveDays = false;
            break;
          }
        }
        
        currentDate = subDays(currentDate, 1);
      }

      setCurrentStreak(streak);
      
    } catch (error) {
      console.error('Error calculating streak:', error);
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
      router.push({
        pathname: `/workouts/${todaysWorkout.id}`,
        params: { autoStart: 'true' }
      });
    }
  };

  const handleDeleteWorkoutPlan = (planId: string) => {
    Alert.alert(
      'Delete Workout Plan',
      'Are you sure you want to delete this workout plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkoutPlan(planId);
              setWorkoutPlans(prev => prev.filter(p => p.id !== planId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete workout plan');
            }
          },
        },
      ],
    );
  };

  const handleMarkWorkoutDone = async (workoutId: string, isDone: boolean) => {
    try {
      await updateWorkoutPlan(workoutId, { done: isDone });
      setWorkoutPlans(prev => 
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
        onPress={() => handleDeleteWorkoutPlan(workoutId)}
      >
        <Trash2 size={20} color="#FFFFFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const toggleFilter = () => {
    let newFilter: 'all' | 'split' | 'custom';
    
    if (filterType === 'all') {
      newFilter = 'split';
    } else if (filterType === 'split') {
      newFilter = 'custom';
    } else {
      newFilter = 'all';
    }
    
    setFilterType(newFilter);
    
    console.log(`Filter changed to: ${newFilter}`);
  };

  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        console.log("Screen focused, current filter:", filterType);
        
        loadTodaysWorkout();

        loadWorkoutPlans();

        calculateStreak();
      }
    }, [session?.user?.id, filterType]) 
  );

  useEffect(() => {
    if (session?.user?.id) {
      loadWorkouts();
      calculateStreak();
    } else {
      setIsLoading(false);
      setIsLoadingPlans(false);
      setIsLoadingToday(false);
      setError('Please log in to view your workouts');
    }
  }, [session?.user?.id]);

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

          {isLoadingToday ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 16 }} />
          ) : (
            <>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutName}>
                  {todaysWorkout.isRestDay ? 'Rest Day' : todaysWorkout.name}
                </Text>
                {!todaysWorkout.isRestDay && (
                  <View style={styles.durationContainer}>
                    <Clock size={16} color="#8E8E93" />
                    <Text style={styles.workoutDuration}>{todaysWorkout.duration}</Text>
                  </View>
                )}
                {todaysWorkout.isRestDay && (
                  <Text style={styles.workoutDuration}>Recovery and muscle growth</Text>
                )}
              </View>

              <TouchableOpacity 
                style={[
                  styles.startButton,
                  todaysWorkout.isRestDay ? styles.startButtonRest : 
                  todaysWorkout.isCompleted ? styles.startButtonCompleted : styles.startButtonWorkout
                ]}
                onPress={handleStartWorkout}
                activeOpacity={0.7}
                disabled={todaysWorkout.isCompleted}
              >
                <Play size={24} color="#FFFFFF" />
                <Text style={styles.startButtonText}>
                  {todaysWorkout.isRestDay ? 'View Recovery Tips' : 
                   todaysWorkout.isCompleted ? 'Workout Completed' : 'Start Workout'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.streakSection}>
          <View style={styles.streakHeader}>
            <Text style={styles.streakTitle}>Current Streak</Text>
            <Text style={styles.streakCount}>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</Text>
          </View>
          <View style={styles.streakBar}>
            <View style={[styles.streakProgress, { width: `${weeklyCompletion}%` }]} />
          </View>
          <Text style={styles.streakMotivation}>
            {completedTrainingDays}/{totalTrainingDays} workouts completed this week
            {weeklyCompletion === 100 
              ? " - Amazing job! 🔥" 
              : completedTrainingDays > 0
                ? ` - Keep going! 💪`
                : " - Let's start training!"}
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
              style={styles.filterButton}
              onPress={toggleFilter}
              activeOpacity={0.7}
            >
              <Filter size={22} color="#FFFFFF" />
              <Text style={styles.filterText}>
                {filterType === 'all' ? 'All' : filterType === 'split' ? 'Split' : 'Custom'}
              </Text>
            </TouchableOpacity>
          </View>

          {isLoadingPlans ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : workoutPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No workout plans yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first workout plan to get started!
              </Text>
            </View>
          ) : (
            workoutPlans.map((plan) => (
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
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationSymbol: {
    fontSize: 16,
    color: '#8E8E93',
    marginRight: 2,
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
    backgroundColor: '#007AFF',
  },
  startButtonRest: {
    backgroundColor: '#007AFF',
  },
  startButtonCompleted: {
    backgroundColor: '#8E8E93',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
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
  deleteAction: {
    backgroundColor: '#FF3B30',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'column',
    gap: 4,
    marginBottom: 12,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});