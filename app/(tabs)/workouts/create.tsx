import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Minus, Dumbbell, Save, Search, X } from 'lucide-react-native';
import { createWorkoutPlan } from '@/utils/supabase';
import { useSession } from '@/utils/auth';
import { supabase } from '@/utils/supabase';
import type { Exercise } from '@/utils/storage';
import { Picker } from '@react-native-picker/picker';
import { exercisesByWorkoutType } from '@/utils/exercises';

const getAllExercises = () => {
  const exercises: string[] = [];
  
  Object.values(exercisesByWorkoutType).forEach(categoryExercises => {
    categoryExercises.forEach(exercise => {
      exercises.push(exercise.name);
    });
  });
  
  return exercises.sort();
};

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const showExerciseSearch = params.showExerciseSearch === 'true';
  const callbackRoute = params.callbackRoute as string;
  const previousState = params.state ? JSON.parse(params.state as string) : null;
  const { session, isLoading } = useSession();
  const [planName, setPlanName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseSearchState, setShowExerciseSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [workoutType, setWorkoutType] = useState<'custom' | 'split'>('custom');
  const [selectedDay, setSelectedDay] = useState(DAYS_OF_WEEK[0]);
  const [dayError, setDayError] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<string[]>(DAYS_OF_WEEK);

  useEffect(() => {
    if (showExerciseSearch) {
      setShowExerciseSearch(true);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAvailableDays();
    }
  }, [session?.user?.id]);

  const fetchAvailableDays = async () => {
    try {
      if (!session?.user?.id) return;
      
      const { data: existingWorkouts, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('workout_type', 'split');

      if (error) {
        console.error('Error fetching workout plans:', error);
        return;
      }

      const daysWithWorkouts = existingWorkouts
        ?.filter(workout => workout.day_of_week)
        .map(workout => workout.day_of_week);
      
      const filteredDays = DAYS_OF_WEEK.filter(day => !daysWithWorkouts.includes(day));
      
      setAvailableDays(filteredDays.length > 0 ? filteredDays : DAYS_OF_WEEK);
      
      if (filteredDays.length === 0) {
        setDayError('You already have workouts for all days of the week');
      } else {
        setSelectedDay(filteredDays[0]);
      }
    } catch (error) {
      console.error('Error fetching available days:', error);
    }
  };

  const filteredExercises = getAllExercises().filter(exercise =>
    exercise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const findExerciseType = (exerciseName: string): 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core' => {
    for (const category in exercisesByWorkoutType) {
      const match = exercisesByWorkoutType[category].find(ex => 
        ex.name.toLowerCase() === exerciseName.toLowerCase()
      );
      if (match && match.type) {
        return match.type;
      }
    }
    
    for (const category in exercisesByWorkoutType) {
      const match = exercisesByWorkoutType[category].find(ex => 
        exerciseName.toLowerCase().includes(ex.name.toLowerCase()) || 
        ex.name.toLowerCase().includes(exerciseName.toLowerCase())
      );
      if (match && match.type) {
        return match.type;
      }
    }
    
    return determineExerciseType(exerciseName);
  };

  const addExercise = (exerciseName: string) => {
    let exerciseId = '';
    let exerciseType: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core' = 'chest';
    
    for (const category in exercisesByWorkoutType) {
      const matchedExercise = exercisesByWorkoutType[category].find(
        ex => ex.name.toLowerCase() === exerciseName.toLowerCase()
      );
      
      if (matchedExercise) {
        exerciseId = matchedExercise.id;
        exerciseType = matchedExercise.type;
        break;
      }
    }
    
    if (!exerciseId) {
      exerciseId = `custom-${Date.now()}`;
      exerciseType = findExerciseType(exerciseName);
    }
    
    const newExercise: Exercise = {
      id: exerciseId,
      name: exerciseName,
      sets: 3,
      type: exerciseType,
    };
    
    setExercises(prevExercises => [...prevExercises, newExercise]);
    setShowExerciseSearch(false);
    setSearchQuery('');
  };

  const determineExerciseType = (exerciseName: string): 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core' => {
    const name = exerciseName.toLowerCase();
    
    if (name.includes('bench') || name.includes('push') || name.includes('chest') || name.includes('fly') || name.includes('press')) {
      return 'chest';
    } else if (name.includes('row') || name.includes('pull') || name.includes('lat') || name.includes('back')) {
      return 'back';
    } else if (name.includes('curl') || name.includes('tricep') || name.includes('extension') || name.includes('arm')) {
      return 'arms';
    } else if (name.includes('squat') || name.includes('leg') || name.includes('lunge') || name.includes('dead') || name.includes('calf')) {
      return 'legs';
    } else if (name.includes('shoulder') || name.includes('delt') || name.includes('raise') || name.includes('press')) {
      return 'shoulders';
    } else if (name.includes('ab') || name.includes('crunch') || name.includes('twist') || name.includes('plank') || name.includes('core')) {
      return 'core';
    } 
    
    return 'chest';
  };

  const removeExercise = (id: string) => {
    setExercises(prevExercises => prevExercises.filter(exercise => exercise.id !== id));
  };

  const updateSets = (id: string, change: number) => {
    setExercises(prevExercises =>
      prevExercises.map(exercise =>
        exercise.id === id
          ? { ...exercise, sets: Math.max(1, exercise.sets + change) }
          : exercise
      )
    );
  };

  const checkDayAvailability = async (day: string) => {
    try {
      if (!session?.user?.id) return;
      
      const { data: existingWorkouts, error } = await supabase
        .from('workout_plans') 
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('Error fetching workout plans:', error);
        return false;
      }

      const existingDayWorkout = existingWorkouts?.find(
        workout => workout.day_of_week === day && workout.workout_type === 'split'
      );

      if (existingDayWorkout) {
        setDayError(`You already have a workout plan for ${day}: "${existingDayWorkout.title}"`);
        return false;
      } else {
        setDayError(null);
        return true;
      }
    } catch (error) {
      console.error('Error checking day availability:', error);
      return false;
    }
  };

  const handleDayChange = async (day: string) => {
    setSelectedDay(day);
    if (workoutType === 'split') {
      await checkDayAvailability(day);
    }
  };

  const handleWorkoutTypeToggle = () => {
    const newType = workoutType === 'custom' ? 'split' : 'custom';
    setWorkoutType(newType);

    if (newType === 'split') {
      fetchAvailableDays();
    } else {
      setDayError(null);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (!planName) {
      Alert.alert('Error', 'Please enter a workout title');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    if (workoutType === 'split') {
      const isDayAvailable = await checkDayAvailability(selectedDay);
      if (!isDayAvailable) {
        Alert.alert('Error', `You already have a workout set for ${selectedDay}`);
        return;
      }
    }

    if (isLoading) {
      Alert.alert('Please wait', 'Verifying your login status...');
      return;
    }

    if (!session?.user) {
      console.error('Session validation failed:', { session, isLoading });
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        Alert.alert('Authentication Error', 'You must be logged in to save workouts. Please log out and log in again.');
        return;
      }
    }

    try {
      setIsSaving(true);
      
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      
      if (!userId) {
        throw new Error('Failed to get user ID');
      }
      
      const formattedExercises = exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        type: ex.type || findExerciseType(ex.name),
      }));
      
      const workoutPlanData = {
        title: planName,
        description: '',
        workout_type: workoutType,
        day_of_week: workoutType === 'split' ? selectedDay : null,
        duration_minutes: 60,
        exercises: formattedExercises,
        user_id: userId,
      };
      
      console.log('Creating workout plan with data:', JSON.stringify(workoutPlanData));
      
      const savedWorkoutPlan = await createWorkoutPlan(workoutPlanData);
      console.log('Successfully created workout plan:', savedWorkoutPlan.id);
      
      router.back();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error creating workout plan:', errorMessage);
      console.error('Full error:', JSON.stringify(error));
      Alert.alert('Error', 'Failed to create workout plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExerciseSelect = (exerciseName: string) => {
    const callbackId = params.callbackId;
    if (callbackId) {
      router.back();
      setTimeout(() => {
        router.setParams({
          id: callbackId,
          selectedExercise: exerciseName
        });
      }, 100);
    } else {
      addExercise(exerciseName);
    }
  };

  const renderExerciseItem = useCallback(({ item }: { item: string }) => {
    let exerciseType = findExerciseType(item);
    
    for (const category in exercisesByWorkoutType) {
      const matchedExercise = exercisesByWorkoutType[category].find(
        ex => ex.name.toLowerCase() === item.toLowerCase()
      );
      
      if (matchedExercise) {
        exerciseType = matchedExercise.type;
        break;
      }
    }
    
    return (
      <TouchableOpacity
        style={styles.exerciseSearchItem}
        onPress={() => handleExerciseSelect(item)}
      >
        <Dumbbell size={20} color="#007AFF" />
        <Text style={styles.exerciseSearchText}>{item}</Text>
        <Text style={styles.exerciseTypeTag}>{exerciseType}</Text>
      </TouchableOpacity>
    );
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Details</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Plan Name</Text>
            <TextInput
              style={styles.input}
              value={planName}
              onChangeText={setPlanName}
              placeholder="Enter plan name"
              placeholderTextColor="#8E8E93"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Workout Type</Text>
            <TouchableOpacity 
              style={styles.typeToggle}
              onPress={handleWorkoutTypeToggle}
            >
              <View style={[
                styles.typeOption,
                workoutType === 'custom' ? styles.selectedType : null
              ]}>
                <Text style={[
                  styles.typeOptionText,
                  workoutType === 'custom' ? styles.selectedTypeText : null
                ]}>Custom</Text>
              </View>
              <View style={[
                styles.typeOption,
                workoutType === 'split' ? styles.selectedType : null
              ]}>
                <Text style={[
                  styles.typeOptionText,
                  workoutType === 'split' ? styles.selectedTypeText : null
                ]}>Split</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          {workoutType === 'split' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Assign to day</Text>
              {availableDays.length === 0 ? (
                <Text style={styles.errorText}>
                  You already have workouts for all days of the week. 
                  Delete an existing workout to create a new split.
                </Text>
              ) : (
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedDay}
                    onValueChange={(itemValue) => handleDayChange(itemValue)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {availableDays.map(day => (
                      <Picker.Item key={day} label={day} value={day} />
                    ))}
                  </Picker>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowExerciseSearch(true)}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
          
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Dumbbell size={48} color="#8E8E93" />
              <Text style={styles.emptyStateText}>No exercises added yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the "Add Exercise" button to start building your workout plan
              </Text>
            </View>
          ) : (
            exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseNumberBadge}>
                    <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseTypeIndicator}>{exercise.type}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeExercise(exercise.id)}>
                    <X size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <View style={styles.exerciseContent}>
                  <Text style={styles.setsLabel}>Sets</Text>
                  <View style={styles.setsContainer}>
                    <TouchableOpacity
                      style={styles.setButton}
                      onPress={() => updateSets(exercise.id, -1)}>
                      <Minus size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <Text style={styles.setsNumber}>{exercise.sets}</Text>
                    <TouchableOpacity
                      style={styles.setButton}
                      onPress={() => updateSets(exercise.id, 1)}>
                      <Plus size={20} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {showExerciseSearchState ? (
        <View style={styles.searchOverlay}>
          <View style={styles.searchHeader}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search exercises..."
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowExerciseSearch(false);
                setSearchQuery('');
              }}
            >
              <X size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredExercises}
            renderItem={renderExerciseItem}
            keyExtractor={item => item}
            style={styles.searchResults}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      ) : (
        <TouchableOpacity 
          style={[
            styles.saveButton,
            (!planName || exercises.length === 0 || isSaving || (workoutType === 'split' && dayError)) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!planName || exercises.length === 0 || isSaving || (workoutType === 'split' && !!dayError)}>
          <Save size={24} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Workout'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1C1C1E',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    color: '#1C1C1E',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    overflow: 'hidden',
  },
  typeOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedType: {
    backgroundColor: '#007AFF',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  selectedTypeText: {
    color: '#FFFFFF',
  },
  pickerContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  pickerItem: {
    textAlign: 'center',
    fontSize: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  exerciseCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  exerciseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  exerciseTypeIndicator: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    marginRight: 8,
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
  },
  exerciseContent: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setsLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  setsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
  },
  setButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  setsNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 24,
    textAlign: 'center',
    color: '#1C1C1E',
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 8,
  },
  searchResults: {
    flex: 1,
  },
  exerciseSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  exerciseSearchText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#1C1C1E',
  },
  exerciseTypeTag: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
    textTransform: 'capitalize',
  },
  saveButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});