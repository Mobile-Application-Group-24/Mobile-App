import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, StatusBar, SafeAreaView, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Clock, ChartBar as BarChart3, Plus, CalendarClock, Scale, File as FileEdit, Dumbbell, Trash, Save, Trash2, Pencil } from 'lucide-react-native';
import { format } from 'date-fns';
import { getWorkoutPlan, deleteWorkoutPlan, createWorkout, WorkoutPlan, Workout } from '@/utils/workout';
import { updateWorkoutPlan } from '@/utils/supabase'; // Import from supabase instead
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { findExerciseType, exercisesByWorkoutType } from '@/utils/exercises';

type SetType = 'normal' | 'warmup' | 'dropset';

interface WorkoutSet {
  id: string;
  weight: string;
  reps: string;
  type: SetType;
  notes?: string;
}

interface ExerciseProgress {
  id: string;
  name: string;
  sets: WorkoutSet[];
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
}

export default function WorkoutDetailScreen() {
  const params = useLocalSearchParams();
  const workoutId = params.id as string;
  const selectedExercise = params.selectedExercise;
  const autoStart = params.autoStart === 'true';
  const router = useRouter();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [previousWorkout, setPreviousWorkout] = useState<Workout | null>(null);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bodyWeight, setBodyWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [showTypeLabel, setShowTypeLabel] = useState<{ id: string, show: boolean }>({ id: '', show: false });
  const [draggingExercise, setDraggingExercise] = useState<string | null>(null);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restTime, setRestTime] = useState(90); // 90 Sekunden Standard
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(90);
  const timerRef = useRef<NodeJS.Timeout>();
  const [isTimerExpanded, setIsTimerExpanded] = useState(false);
  const [customRestTime, setCustomRestTime] = useState(90);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutEndTime, setWorkoutEndTime] = useState<Date | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);

  const startRestTimer = () => {
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setCurrentTime(prev => {
        if (prev <= 1) {
          stopRestTimer();
          return restTime;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRestTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsTimerRunning(false);
  };

  const resetRestTimer = () => {
    stopRestTimer();
    setCurrentTime(restTime);
  };

  const toggleRestTimer = () => {
    setShowRestTimer(!showRestTimer);
    resetRestTimer();
  };

  const handleTimerPress = () => {
    setIsTimerExpanded(!isTimerExpanded);
  };

  const handleCustomTimeChange = (time: number) => {
    setCustomRestTime(time);
    setRestTime(time);
    setCurrentTime(time);
  };

  const adjustTime = (seconds: number) => {
    const newTime = currentTime + seconds;
    if (newTime > 0) {
      setCurrentTime(newTime);
      setRestTime(newTime);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleDragStart = (exerciseId: string) => {
    Keyboard.dismiss();
    setDraggingExercise(exerciseId);
  };

  const handleDragEnd = () => {
    setDraggingExercise(null);
  };

  const handleMoveExercise = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    setExercises(prev => {
      const newExercises = [...prev];
      const draggedIndex = newExercises.findIndex(e => e.id === draggedId);
      const targetIndex = newExercises.findIndex(e => e.id === targetId);

      const [draggedExercise] = newExercises.splice(draggedIndex, 1);
      newExercises.splice(targetIndex, 0, draggedExercise);

      return newExercises;
    });
  };

  const handleDeleteExercise = (exerciseId: string) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setExercises(prev => prev.filter(e => e.id !== exerciseId));
          },
        },
      ],
      { cancelable: true }
    );
  };

  const toggleEditMode = (exerciseId: string | null) => {
    setEditingExercise(exerciseId === editingExercise ? null : exerciseId);
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(exercise => {
      if (exercise.id === exerciseId) {
        return {
          ...exercise,
          sets: exercise.sets.filter(set => set.id !== setId)
        };
      }
      return exercise;
    }));
  };

  useEffect(() => {
    if (workoutId) {
      loadWorkoutPlan(workoutId);
    } else {
      setError('Workout plan ID not found');
      setLoading(false);
    }
  }, [workoutId]);

  const loadWorkoutPlan = async (workoutPlanId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the workout plan from workout_plans table
      const plan = await getWorkoutPlan(workoutPlanId);
      setWorkoutPlan(plan);
      setWorkoutName(plan.title || '');
      setNotes(plan.description || '');
      // Initialize exercises from the workout plan only, don't load previous workouts
      const planExercises = plan.exercises?.map(exercise => {
        return {
          id: exercise.id,
          name: exercise.name,
          type: exercise.type, // Include exercise type
          // Create empty sets based on the number specified in the plan
          sets: Array(exercise.sets || 3).fill(null).map((_, index) => ({
            id: `new-${exercise.id}-${index}`,
            weight: '',
            reps: '',
            type: 'normal',
            notes: ''
          }))
        };
      }) || [];
      // Set exercises directly from plan without checking previous workouts
      setExercises(planExercises);
      setHasPreviousData(false);
    } catch (error) {
      console.error('Error loading workout plan:', error);
      setError('Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExercise && typeof selectedExercise === 'string') {
      const timestamp = Date.now();
      
      // Try to find the exercise ID in our predefined lists
      let exerciseId = '';
      let exerciseType: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core' | undefined;
      
      // Search through all categories to find the exercise
      for (const category in exercisesByWorkoutType) {
        const matchedExercise = exercisesByWorkoutType[category].find(
          ex => ex.name === selectedExercise
        );
        
        if (matchedExercise) {
          exerciseId = matchedExercise.id;
          exerciseType = matchedExercise.type;
          break;
        }
      }
      
      // If we couldn't find it, generate a custom ID
      if (!exerciseId) {
        exerciseId = `custom-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        exerciseType = findExerciseType(selectedExercise);
      }
      
      const exerciseToAdd: ExerciseProgress = {
        id: exerciseId,
        name: selectedExercise,
        type: exerciseType,
        sets: [
          // Create 3 sets by default instead of just 1
          {
            id: `${timestamp}-set1`,
            weight: '',
            reps: '',
            type: 'normal',
            notes: ''
          },
          {
            id: `${timestamp}-set2`,
            weight: '',
            reps: '',
            type: 'normal',
            notes: ''
          },
          {
            id: `${timestamp}-set3`,
            weight: '',
            reps: '',
            type: 'normal',
            notes: ''
          }
        ]
      };

      setExercises(prev => [...prev, exerciseToAdd]);

      const timeout = setTimeout(() => {
        router.setParams({ id: workoutId });
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [selectedExercise, workoutId]);

  // Add a new effect to auto-start the workout if opened from the start workout button
  useEffect(() => {
    if (autoStart && !isWorkoutActive && !workoutStartTime && !loading) {
      console.log('Auto-starting workout from "Start Workout" button');
      // Small delay to ensure the UI is ready
      const timer = setTimeout(() => {
        startWorkout();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isWorkoutActive, workoutStartTime, loading]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (workoutId) {
                await deleteWorkoutPlan(workoutId);
                router.back();
              }
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout');
            }
          },
        },
      ]
    );
  };

  const addSet = (exerciseId: string) => {
    setExercises(prev => prev.map(exercise => {
      if (exercise.id === exerciseId) {
        const newSet: WorkoutSet = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          weight: '',
          reps: '',
          type: 'normal'
        };
        return {
          ...exercise,
          sets: [...exercise.sets, newSet]
        };
      }
      return exercise;
    }));
  };

  // Create a more efficient updateSet function with optimizations for numeric input
  const updateSet = (exerciseId: string, setId: string, field: keyof WorkoutSet, value: string) => {
    // Special handling for numeric fields
    if (field === 'weight' || field === 'reps') {
      // Only allow digits and a single decimal point for weight
      const isValidNumericInput = field === 'weight' 
        ? /^(\d*\.?\d*)$/.test(value)  // Allow decimal for weight
        : /^\d*$/.test(value);         // Only digits for reps
      
      if (value !== '' && !isValidNumericInput) {
        return; // Reject invalid input
      }
    }
    
    // Use immediate update pattern for better performance with fast typing
    setExercises(prev => {
      // Create shallow copy of the exercises array
      const updatedExercises = [...prev];
      
      // Find the target exercise index
      const exerciseIndex = updatedExercises.findIndex(e => e.id === exerciseId);
      if (exerciseIndex === -1) return prev;
      
      // Create shallow copy of the exercise
      const updatedExercise = {...updatedExercises[exerciseIndex]};
      
      // Find the target set index
      const setIndex = updatedExercise.sets.findIndex(s => s.id === setId);
      if (setIndex === -1) return prev;
      
      // Create shallow copy of sets array
      const updatedSets = [...updatedExercise.sets];
      
      // Create new set object with updated value
      updatedSets[setIndex] = {...updatedSets[setIndex], [field]: value};
      
      // Update exercise with new sets array
      updatedExercise.sets = updatedSets;
      
      // Update exercises array with modified exercise
      updatedExercises[exerciseIndex] = updatedExercise;
      
      return updatedExercises;
    });
  };

  const toggleSetType = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(exercise => {
      if (exercise.id === exerciseId) {
        return {
          ...exercise,
          sets: exercise.sets.map(set => {
            if (set.id === setId) {
              const types: SetType[] = ['normal', 'warmup', 'dropset'];
              const currentIndex = types.indexOf(set.type);
              const nextType = types[(currentIndex + 1) % types.length];

              setShowTypeLabel({ id: setId, show: true });
              setTimeout(() => {
                setShowTypeLabel({ id: '', show: false });
              }, 2000);

              return { ...set, type: nextType };
            }
            return set;
          })
        };
      }
      return exercise;
    }));
  };

  const deleteSet = (exerciseId: string, setId: string) => {
    setExercises(prev => prev.map(exercise => {
      if (exercise.id === exerciseId) {
        return {
          ...exercise,
          sets: exercise.sets.filter(set => set.id !== setId)
        };
      }
      return exercise;
    }));
  };

  const renderWorkoutDeleteAction = () => {
    return (
      <TouchableOpacity
        style={styles.workoutDeleteAction}
        onPress={handleDelete}
      >
        <Trash2 size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  const saveWorkoutChanges = async () => {
    if (!workoutPlan || !workoutId) return;

    try {
      // Format exercises for workout plan (no reps/weight)
      // Make sure we preserve the set count and type from the original exercises
      const planExercises = exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        type: exercise.type, // Include exercise type
        sets: exercise.sets.length
      }));

      // Always update the workout plan with the latest exercises
      await updateWorkoutPlan(workoutId, {
        title: workoutName,
        description: notes,
        exercises: planExercises // Store only exercise structure in workout_plans table
      });
      
      console.log("Updated workout plan with new exercises");
      
      // Only create a workout session if the workout was started
      if (isWorkoutActive || workoutStartTime) {
        // Format exercises for workout tracking (with reps/weight/setDetails)
        const workoutExercises = exercises.map(exercise => {
          return {
            id: exercise.id,
            name: exercise.name,
            type: exercise.type, // Include exercise type
            sets: exercise.sets.length,
            setDetails: exercise.sets.map(set => ({
              id: set.id,
              weight: set.weight ? parseFloat(set.weight) : undefined,
              reps: set.reps ? parseInt(set.reps, 10) : undefined,
              type: set.type,
              notes: set.notes || ''
            }))
          };
        });
        
        // If the workout has been explicitly ended, use that end time
        // Otherwise, if it was started but not explicitly ended, set the current time as end time
        const endTimeToUse = workoutEndTime || (isWorkoutActive ? new Date() : undefined);
            
        // Consider a workout done if it's been started (regardless of whether it has an explicit end time)
        const isDone = isWorkoutActive || !!workoutEndTime;
        
        const workoutData = {
          workout_plan_id: workoutId,
          title: workoutName,
          date: new Date().toISOString(),
          start_time: workoutStartTime?.toISOString(),
          end_time: endTimeToUse?.toISOString(),
          notes: notes,
          exercises: workoutExercises, // Include complete exercise data with sets and reps
          bodyweight: bodyWeight ? parseFloat(bodyWeight) : undefined,
          user_id: workoutPlan.user_id,
          calories_burned: 0, // Calculate or leave as default
          done: isDone // Mark as done if it was started or has an end time
        };
                
        const savedWorkout = await createWorkout(workoutData);
        console.log("Successfully created workout session:", savedWorkout.id, "Done status:", isDone);
      } else {
        console.log("Workout wasn't started, only updating the workout plan");
      }
            
      router.back();
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Error', 'Failed to save workout data');
    }
  };

  const showFullText = (text: string, label: string) => {
    if (text) {
      Alert.alert(
        label,
        text,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    }
  };

  const addExercise = () => {
    router.push({
      pathname: "/(tabs)/workouts/create",
      params: {
        showExerciseSearch: true,
        callbackId: workoutId
      }
    });
  };

  const startWorkout = () => {
    const now = new Date();
    setWorkoutStartTime(now);
    setIsWorkoutActive(true);
  };

  const endWorkout = () => {
    const now = new Date();
    setWorkoutEndTime(now);
    setIsWorkoutActive(false);
  };

  const navigateToExerciseStats = (exerciseId: string, exerciseName: string) => {
    // First check if the exercise has an ID, as custom exercises may not have a unique ID
    let idToUse = exerciseId;
    
    // If the ID starts with "custom-", create a special ID for the stats page
    // This is needed because the stats page expects a unique ID for the exercise
    if (exerciseId.startsWith('custom-')) {
      // For custom exercises, create an ID based on the name
      idToUse = `exercise-${exerciseName.toLowerCase().replace(/\s+/g, '-')}-stats`;
    }
    
    // Navigate to the stats page with the exercise ID and name
    // Also pass the current workoutId so we can navigate back to this workout
    router.push({
      pathname: '/stats/[id]',
      params: { 
        id: idToUse,
        exerciseName: exerciseName,
        workoutId: workoutId, // Pass the workout ID to enable proper back navigation
        returnPath: `/workouts/${workoutId}` // Add explicit return path for navigation
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !workoutPlan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Workout not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Fixed header that stays visible while scrolling */}
        <View style={styles.fixedHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} activeOpacity={0.7}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.date}>
              {(() => {
                try {
                  return format(new Date(), 'dd. MMMM');
                } catch (error) {
                  console.warn('Error formatting header date:', error);
                  return 'Today';
                }
              })()}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.headerButton, showRestTimer && styles.headerButtonActive]} 
              onPress={toggleRestTimer} 
              activeOpacity={0.7}
            >
              <Clock size={24} color={showRestTimer ? "#34C759" : "#007AFF"} />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView
          style={[styles.content]}
          contentContainerStyle={{ 
            paddingTop: Platform.OS === 'android' ? 
              80 + (StatusBar.currentHeight ?? 0) : 80, // Increase padding to ensure content isn't hidden
            paddingBottom: 20 // Add bottom padding for better scrolling experience
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.workoutInfo}>
            {/* Remove the Swipeable component and keep only the inner View */}
            <View>
              <TextInput
                style={styles.workoutNameInput}
                value={workoutName}
                onChangeText={setWorkoutName}
                placeholder="Workout Name"
                placeholderTextColor="#8E8E93"
              />

              <View style={styles.workoutTimes}>
                <View style={styles.timeInfo}>
                  <Clock size={20} color="#007AFF" />
                  <Text style={styles.timeText}>
                    {(() => {
                      try {
                        if (workoutStartTime) {
                          return `${format(workoutStartTime, 'HH:mm')}${
                            workoutEndTime ? ` - ${format(workoutEndTime, 'HH:mm')}` : ''
                          }`;
                        }
                        return 'Not started';
                      } catch (error) {
                        console.warn('Error formatting workout time:', error);
                        return 'Time unavailable';
                      }
                    })()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.workoutStateButton,
                    isWorkoutActive && styles.workoutStateButtonActive
                  ]}
                  onPress={isWorkoutActive ? endWorkout : startWorkout}
                >
                  <Text style={styles.workoutStateButtonText}>
                    {isWorkoutActive ? 'End Workout' : 'Start Workout'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <View style={styles.infoIconContainer}>
                    <Scale size={20} color="#FF9500" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Body Weight</Text>
                    <TextInput
                      style={styles.infoInput}
                      value={bodyWeight}
                      onChangeText={setBodyWeight}
                      placeholder="Enter weight"
                      keyboardType="numeric"
                      placeholderTextColor="#8E8E93"
                    />
                  </View>
                </View>

                <View style={[styles.infoCard, styles.notesCard]}>
                  <View style={styles.infoIconContainer}>
                    <FileEdit size={20} color="#FF3B30" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Notes</Text>
                    <TextInput
                      style={[styles.infoInput, styles.notesInput]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add workout notes..."
                      placeholderTextColor="#8E8E93"
                      multiline
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Dumbbell size={48} color="#8E8E93" />
              <Text style={styles.emptyStateText}>No exercises found</Text>
              <Text style={styles.emptyStateSubtext}>
                This workout plan doesn't have any exercises yet
              </Text>
            </View>
          ) : (
            exercises.map((exercise, index) => (
              <TouchableOpacity 
                key={exercise.id}
                style={[
                  styles.exerciseCard,
                  draggingExercise === exercise.id && styles.exerciseCardDragging
                ]}
                onLongPress={() => handleDragStart(exercise.id)}
                onPress={() => {
                  if (draggingExercise) {
                    if (draggingExercise === exercise.id) {
                      // Cancel dragging when tapping the same exercise
                      handleDragEnd();
                    } else {
                      // Handle moving exercise when tapping a different one
                      handleMoveExercise(draggingExercise, exercise.id);
                      handleDragEnd();
                    }
                  }
                }}
                delayLongPress={200}
                activeOpacity={0.7}
              >
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.type && <Text style={styles.exerciseType}>{exercise.type}</Text>}
                </View>
                
                
                {exercise.sets.map((set, setIndex) => (
                  <View key={setIndex} style={styles.setContainer}>
                    <TouchableOpacity
                      onPress={() => editingExercise === exercise.id 
                        ? handleDeleteSet(exercise.id, set.id) 
                        : toggleSetType(exercise.id, set.id)}
                      style={[
                        styles.setNumber,
                        set.type === 'warmup' && styles.warmupNumber,
                        set.type === 'dropset' && styles.dropsetNumber,
                      ]}>
                      <Text style={[
                        styles.setNumberText,
                        showTypeLabel.id === set.id && showTypeLabel.show ? styles.hideNumber : null
                      ]}>
                        {editingExercise === exercise.id 
                          ? 'X' 
                          : (showTypeLabel.id === set.id && showTypeLabel.show
                              ? (set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : 'N') 
                              : (setIndex + 1)
                            )
                        }
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.setInputs}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Weight</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={set.weight}
                          onChangeText={(text) => updateSet(exercise.id, set.id, 'weight', text)}
                          placeholder="kg"
                          placeholderTextColor="#C7C7CC"
                          maxLength={6}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          selectTextOnFocus={true}  // Select all text when focused for easier editing
                          caretHidden={false}       // Ensure caret is visible
                        />
                      </View>

                      <View style={[styles.inputGroup, styles.smallInputGroup]}>
                        <Text style={styles.inputLabel}>Reps</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={set.reps}
                          onChangeText={(text) => updateSet(exercise.id, set.id, 'reps', text)}
                          placeholder="#"
                          placeholderTextColor="#C7C7CC"
                          maxLength={3}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          selectTextOnFocus={true}  // Select all text when focused for easier editing
                          caretHidden={false}       // Ensure caret is visible
                        />
                      </View>

                      <View style={[styles.inputGroup, styles.notesGroup]}>
                        <Text style={styles.inputLabel}>Notes</Text>
                        <TextInput
                          style={[styles.input, styles.multilineInput]}
                          value={set.notes}
                          onChangeText={(text) => updateSet(exercise.id, set.id, 'notes', text)}
                          placeholder={set.notes || "Notes"}
                          placeholderTextColor="#C7C7CC"
                          multiline
                          numberOfLines={1}
                        />
                      </View>
                    </View>
                  </View>
                ))}

                <View style={styles.setActions}>
                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => addSet(exercise.id)}
                    activeOpacity={0.7}>
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </TouchableOpacity>

                  <View style={styles.setActionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, editingExercise === exercise.id && styles.actionButtonActive]} 
                      onPress={() => toggleEditMode(exercise.id)}
                      activeOpacity={0.7}
                    >
                      <Pencil size={20} color={editingExercise === exercise.id ? "#FFFFFF" : "#007AFF"} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={() => navigateToExerciseStats(exercise.id, exercise.name)}
                      activeOpacity={0.7}
                    >
                      <BarChart3 size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]} 
                      onPress={() => handleDeleteExercise(exercise.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity
              style={styles.addExerciseButtonInline}
              onPress={addExercise}
              activeOpacity={0.7}>
              <Dumbbell size={20} color="#FFFFFF" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveWorkoutButtonInline}
              onPress={saveWorkoutChanges}
              activeOpacity={0.7}>
              <Save size={24} color="#FFFFFF" />
              <Text style={styles.saveWorkoutText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Timer Mini-Player */}
        {showRestTimer && (
          <View style={styles.miniPlayer}>
            <TouchableOpacity 
              style={styles.timerMainContent}
              onPress={() => {
                if (!isTimerRunning) {
                  setIsTimerExpanded(!isTimerExpanded);
                }
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.timerText}>
                {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')}
              </Text>
              <View style={styles.timerRightContent}>
                <TouchableOpacity 
                  style={styles.timerButton} 
                  onPress={(e) => {
                    e.stopPropagation();
                    isTimerRunning ? stopRestTimer() : startRestTimer();
                  }}
                >
                  <Text style={styles.timerButtonText}>
                    {isTimerRunning ? 'Pause' : 'Start'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.timerButton} 
                  onPress={(e) => {
                    e.stopPropagation();
                    resetRestTimer();
                  }}
                >
                  <Text style={styles.timerButtonText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.miniPlayerClose} 
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleRestTimer();
                  }}
                >
                  <X size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {isTimerExpanded && !isTimerRunning && (
              <View style={styles.timeAdjustment}>
                <TouchableOpacity 
                  style={styles.timeAdjustButton}
                  onPress={() => adjustTime(-15)}
                >
                  <Text style={styles.timeAdjustButtonText}>-15s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.timeAdjustButton}
                  onPress={() => adjustTime(15)}
                >
                  <Text style={styles.timeAdjustButtonText}>+15s</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 + (StatusBar.currentHeight ?? 0) : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    height: Platform.OS === 'android' ? 64 + (StatusBar.currentHeight ?? 0) : 64, // Increased height for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4, // Add padding to prevent text clipping
  },
  date: {
    fontSize: 18, // Slightly reduce font size to ensure it fits
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    width: 40, // Fixed width to help with alignment
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    width: 40, // Fixed width to match closeButton for balanced layout
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  workoutInfo: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  workoutNameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    padding: 0,
  },
  workoutTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeLabel: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  workoutStateButton: {
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  workoutStateButtonActive: {
    backgroundColor: '#FF3B30',
  },
  workoutStateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notesCard: {
    flex: 2,
    minWidth: '100%',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  infoInput: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    padding: 0,
    margin: 0,
  },
  notesInput: {
    height: 40,
    textAlignVertical: 'top',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    backgroundColor: '#FFFFFF',
    margin: 12,
    marginTop: 0,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseCardDragging: {
    opacity: 0.5,
    transform: [{ scale: 0.98 }],
    borderColor: '#34C759',
    borderWidth: 2,
    margin: 16,
    marginTop: 0,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 0,
    flex: 1,
  },
  exerciseType: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  setContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 21,
  },
  warmupNumber: {
    backgroundColor: '#FFB100',
  },
  dropsetNumber: {
    backgroundColor: '#FF3B30',
  },
  setNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hideNumber: {
    fontSize: 14,
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  inputGroup: {
    flex: 0.7,
  },
  smallInputGroup: {
    flex: 0.7,
  },
  notesGroup: {
    flex: 2,
  },
  inputLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 6,
    color: '#000000',
    fontSize: 14,
    minHeight: 36,
    placeholderTextColor: '#C7C7CC',
  },
  multilineInput: {
    height: undefined,
    textAlignVertical: 'top',
    paddingTop: 8,
    paddingBottom: 8,
  },
  setActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addSetButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  addSetText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  setActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonActive: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FFF2F2',
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    gap: 8,
  },
  addExerciseButtonInline: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveWorkoutButtonInline: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addExerciseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveWorkoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
    marginTop: 23,
    borderRadius: 8,
    width: 100,
    marginLeft: 8,
    marginBottom: 12,
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  timerMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  miniPlayerClose: {
    padding: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  timeAdjustment: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 12,
  },
  timeAdjustButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  timeAdjustButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  workoutDeleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  editModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  editModeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
});