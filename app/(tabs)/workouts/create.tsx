import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Plus, Minus, Dumbbell, Save, Search, X, Star } from 'lucide-react-native';
import { createWorkout } from '@/utils/workout'; // Korrekter Import
import { useSession } from '@/utils/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { supabase } from '@/utils/supabase';
import type { Exercise } from '@/utils/storage';

const commonExercises = [
  // Chest
  "Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Press",
  "Push-Ups", "Dips", "Cable Flyes", "Dumbbell Flyes",
  
  // Back
  "Pull-Ups", "Lat Pulldowns", "Barbell Rows", "Dumbbell Rows",
  "T-Bar Rows", "Face Pulls", "Deadlifts",
  
  // Shoulders
  "Military Press", "Arnold Press", "Lateral Raises", "Front Raises",
  "Reverse Flyes", "Upright Rows", "Shrugs", "Pike Push-Ups",
  
  // Arms
  "Bicep Curls", "Hammer Curls", "Tricep Extensions", "Skull Crushers",
  "Preacher Curls", "Diamond Push-Ups", "Tricep Pushdowns", "Concentration Curls",
  
  // Legs
  "Squats", "Front Squats", "Leg Press", "Lunges",
  "Romanian Deadlifts", "Leg Extensions", "Leg Curls", "Calf Raises",
  
  // Core
  "Planks", "Russian Twists", "Crunches", "Leg Raises",
  "Wood Chops", "Ab Rollouts", "Mountain Climbers", "Dead Bugs",
  
  // Olympic/Compound
  "Clean and Jerk", "Power Cleans", "Snatch", "Overhead Squats",
  "Turkish Get-Ups", "Thrusters", "Kettlebell Swings", "Box Jumps",
  
  // Functional/Other
  "Burpees", "Battle Ropes", "Medicine Ball Slams", "Farmer's Walks"
].sort();

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
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (showExerciseSearch) {
      setShowExerciseSearch(true);
    }
  }, []);

  const filteredExercises = commonExercises.filter(exercise =>
    exercise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addExercise = (exerciseName: string) => {
    const newExercise: Exercise = {
      id: Date.now().toString(),
      name: exerciseName,
      sets: 3,
    };
    setExercises(prevExercises => [...prevExercises, newExercise]);
    setShowExerciseSearch(false);
    setSearchQuery('');
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

  const handleSave = async () => {
    if (isSaving) return;

    // Validate inputs
    if (!planName) {
      Alert.alert('Error', 'Please enter a workout title');
      return;
    }

    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }

    console.log('Current session state:', session ? 'Logged in' : 'Not logged in');
    console.log('Session loading state:', isLoading ? 'Loading' : 'Loaded');
    
    if (isLoading) {
      Alert.alert('Please wait', 'Verifying your login status...');
      return;
    }

    if (!session?.user) {
      console.error('Session validation failed:', { session, isLoading });
      
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('Direct auth check:', userData?.user ? 'User found' : 'No user');
      
      if (userError || !userData.user) {
        Alert.alert('Authentication Error', 'You must be logged in to save workouts. Please log out and log in again.');
        return;
      } else {
        console.log('Session hook not working but user is authenticated, proceeding...');
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
        reps: 10,
        weight: undefined,
      }));
      
      const workoutData = {
        title: planName,        // Wichtig: title statt name
        date: new Date().toISOString(),
        duration_minutes: 60,
        exercises: formattedExercises,
        notes: '',
        calories_burned: 0,
        user_id: userId,
        start_time: null,
        end_time: null
      };
      
      console.log('Creating workout:', workoutData);
      const savedWorkout = await createWorkout(workoutData);
      console.log('Workout created successfully:', savedWorkout);
      
      router.back();
    } catch (error) {
      console.error('Error creating workout:', error);
      Alert.alert('Error', 'Failed to create workout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExerciseSelect = (exerciseName: string) => {
    const callbackId = params.callbackId;
    if (callbackId) {
      // Navigiere zurück zum vorherigen Screen mit der ausgewählten Übung
      router.back();
      // Setze die Parameter nach einer kurzen Verzögerung
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

  const renderExerciseItem = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.exerciseSearchItem}
      onPress={() => handleExerciseSelect(item)}
    >
      <Dumbbell size={20} color="#007AFF" />
      <Text style={styles.exerciseSearchText}>{item}</Text>
    </TouchableOpacity>
  ), []);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <View style={styles.planNameContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Plan Name</Text>
              <TextInput
                style={styles.input}
                value={planName}
                onChangeText={setPlanName}
                placeholder="Enter plan name"
              />
            </View>
            <TouchableOpacity
              style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <Star
                size={24}
                color={isFavorite ? '#FFB100' : '#8E8E93'}
                fill={isFavorite ? '#FFB100' : 'none'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            <TouchableOpacity 
              style={styles.addButton} 
              onPress={() => setShowExerciseSearch(true)}
            >
              <Plus size={24} color="#FFFFFF" />
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
            (!planName || exercises.length === 0 || isSaving) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!planName || exercises.length === 0 || isSaving}>
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
    paddingBottom: Platform.OS === 'android' ? 120 : 0,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  planNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: '#FFF9E6',
  },
  label: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  exerciseCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  exerciseNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
  },
  exerciseContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setsLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  setsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
  },
  setButton: {
    padding: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  setsNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 24,
    minWidth: 24,
    textAlign: 'center',
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
    borderRadius: 8,
    padding: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
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
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});