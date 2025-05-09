import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, StatusBar, SafeAreaView, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { X, Clock, ChartBar as BarChart3, Plus, CalendarClock, Scale, File as FileEdit, Dumbbell, Trash, Save, Trash2, Pencil } from 'lucide-react-native';
import { format } from 'date-fns';
import { getWorkoutPlan, deleteWorkoutPlan, createWorkout, WorkoutPlan, Workout } from '@/utils/workout';
import { updateWorkoutPlan, supabase, getCurrentUser, deleteAllAISuggestions } from '@/utils/supabase'; 
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
  prevWeight?: string; 
  prevReps?: string;   
  prevNotes?: string;  
}

interface ExerciseProgress {
  id: string;
  name: string;
  sets: WorkoutSet[];
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
}

export default function WorkoutDetailScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const workoutId = params.id as string;
  const selectedExercise = params.selectedExercise;
  const autoStart = params.autoStart === 'true';
  const fromHistory = params.fromHistory === 'true';
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
  const [restTime, setRestTime] = useState(90); 
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(90);
  const timerRef = useRef<NodeJS.Timeout>();
  const [isTimerExpanded, setIsTimerExpanded] = useState(false);
  const [customRestTime, setCustomRestTime] = useState(90);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutEndTime, setWorkoutEndTime] = useState<Date | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [editingExercise, setEditingExercise] = useState<string | null>(null);
  const [exercisePreviousDataMap, setExercisePreviousDataMap] = useState<Map<string, any>>(new Map());
  const [editingTime, setEditingTime] = useState<'start' | 'end' | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasModifications, setHasModifications] = useState(false);
  const [savedWorkoutId, setSavedWorkoutId] = useState<string | null>(null);
  const [hasExitSave, setHasExitSave] = useState(false);
  // Use a ref to track if we've already saved to prevent duplicate saves
  const saveOperationInProgressRef = useRef(false);

  useEffect(() => {
    if (workoutId && navigation.setOptions) {
      navigation.setOptions({
        headerShown: false 
      });
    }

    return () => {
      // Only trigger auto-save if we haven't explicitly saved yet and no save is in progress
      if (isWorkoutActive && !workoutEndTime && exercises.length > 0 && !hasExitSave && !saveOperationInProgressRef.current) {
        console.log("Component unmounting - auto-saving workout");
        saveWorkoutAsNotDone();
      } else {
        console.log("Component unmounting - no need to save: hasExitSave=", hasExitSave, "saveInProgress=", saveOperationInProgressRef.current);
      }
    };
  }, [navigation, workoutId, isWorkoutActive, exercises, workoutEndTime, hasExitSave]);

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
            router.setParams({ id: workoutId });
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
    
    if (!isWorkoutActive && !workoutStartTime) {
      console.log("Set removed - will update workout plan when saved");
    } else {
      console.log("Set removed - will only affect this workout session, not the plan");
    }
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
      
      
      if (fromHistory) {
        try {
          const { data: workoutData, error: workoutError } = await supabase
            .from('workouts')
            .select('*')
            .eq('id', workoutPlanId)
            .single();
            
          if (workoutError) throw workoutError;
          
          if (workoutData) {
            
            setWorkoutPlan({
              id: workoutData.id,
              title: workoutData.title,
              description: workoutData.notes || '',
              workout_type: 'custom',
              duration_minutes: 0,
              exercises: workoutData.exercises?.map(ex => ({
                id: ex.id,
                name: ex.name,
                sets: ex.sets,
                type: ex.type
              })) || [],
              user_id: workoutData.user_id,
              created_at: workoutData.created_at,
              updated_at: workoutData.created_at
            });
            
            setWorkoutName(workoutData.title || '');
            setNotes(workoutData.notes || '');
            setBodyWeight(workoutData.bodyweight ? String(workoutData.bodyweight) : '');
            
            if (workoutData.start_time) {
              setWorkoutStartTime(new Date(workoutData.start_time));
            }
            
            if (workoutData.end_time) {
              setWorkoutEndTime(new Date(workoutData.end_time));
            }
            
            
            const exercisesWithDetails = workoutData.exercises?.map(exercise => {
              return {
                id: exercise.id,
                name: exercise.name,
                type: exercise.type,
                sets: exercise.setDetails?.map(set => ({
                  id: set.id,
                  weight: set.weight ? String(set.weight) : '',
                  reps: set.reps ? String(set.reps) : '',
                  type: set.type || 'normal',
                  notes: set.notes || ''
                })) || []
              };
            }) || [];
            
            setExercises(exercisesWithDetails);
            setLoading(false);
            return;
          }
        } catch (historyError) {
          console.error('Error loading workout from history:', historyError);
          
        }
      }
      
      const plan = await getWorkoutPlan(workoutPlanId);
      setWorkoutPlan(plan);
      setWorkoutName(plan.title || '');
      setNotes(plan.description || '');
      
      const exercisePreviousData = new Map();
      
      try {

        const { data: previousPlanWorkouts, error: previousPlanError } = await supabase
          .from('workouts')
          .select('id, title, date, bodyweight, user_id, exercises')
          .eq('workout_plan_id', workoutPlanId)
          .eq('done', true)
          .order('date', { ascending: false })
          .limit(1);
        
        let previousWorkoutData = null;
        if (!previousPlanError && previousPlanWorkouts && previousPlanWorkouts.length > 0) {
          previousWorkoutData = previousPlanWorkouts[0];
          setPreviousWorkout(previousWorkoutData);
          setHasPreviousData(true);
          console.log('Found previous workout data for this plan:', previousWorkoutData.id);
          
          if (previousWorkoutData.bodyweight) {

            setBodyWeight(String(previousWorkoutData.bodyweight));
          }
        }
        
        const { data: allCompletedWorkouts, error: allWorkoutsError } = await supabase
          .from('workouts')
          .select('id, date, exercises')
          .eq('done', true)
          .eq('user_id', plan.user_id)
          .order('date', { ascending: false })
          .limit(50); 
        
        if (!allWorkoutsError && allCompletedWorkouts && allCompletedWorkouts.length > 0) {
          console.log(`Found ${allCompletedWorkouts.length} completed workouts to search for exercise data`);
          
          if (plan.exercises) {
            for (const exercise of plan.exercises) {

              for (const workout of allCompletedWorkouts) {
                if (workout.exercises) {

                  const matchingExercise = workout.exercises.find(
                    ex => ex.id === exercise.id || ex.name === exercise.name
                  );
                  
                  if (matchingExercise && matchingExercise.setDetails && matchingExercise.setDetails.length > 0) {
                   
                    if (!exercisePreviousData.has(exercise.id) || 
                        new Date(workout.date) > new Date(exercisePreviousData.get(exercise.id).date)) {
                      
                     
                      exercisePreviousData.set(exercise.id, {
                        date: workout.date,
                        exerciseData: matchingExercise
                      });
                      
                      console.log(`Found most recent data for ${exercise.name} from workout on ${workout.date}`);
                    }
                    
       
                    break;
                  }
                }
              }
            }
          }
          
  
          for (const workout of allCompletedWorkouts) {
            if (workout.exercises) {
              for (const exerciseData of workout.exercises) {
            
                if (exerciseData.setDetails && exerciseData.setDetails.length > 0) {
             
                  if (!exercisePreviousData.has(exerciseData.id) || 
                      new Date(workout.date) > new Date(exercisePreviousData.get(exerciseData.id).date)) {
                    exercisePreviousData.set(exerciseData.id, {
                      date: workout.date,
                      exerciseData: exerciseData
                    });
                  }
         
                  const nameKey = `name:${exerciseData.name.toLowerCase()}`;
                  if (!exercisePreviousData.has(nameKey) || 
                      new Date(workout.date) > new Date(exercisePreviousData.get(nameKey).date)) {
                    exercisePreviousData.set(nameKey, {
                      date: workout.date,
                      exerciseData: exerciseData
                    });
                  }
                }
              }
            }
          }
        }
        
        setExercisePreviousDataMap(exercisePreviousData);
        
      } catch (prevError) {
        console.log('Error fetching previous workout data:', prevError);
      }
  
      const planExercises = plan.exercises?.map(exercise => {
        const mostRecentData = exercisePreviousData.get(exercise.id);
        const prevExerciseData = mostRecentData ? mostRecentData.exerciseData : null;
        
        if (prevExerciseData) {
          console.log(`Exercise ${exercise.name}: most recent data found from ${mostRecentData.date}, with ${prevExerciseData.setDetails?.length || 0} sets`);
        } else {
          console.log(`Exercise ${exercise.name}: no previous data found`);
        }
        
        return {
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
          sets: Array(exercise.sets || 3).fill(null).map((_, index) => {

            const prevSetData = prevExerciseData && 
                              prevExerciseData.setDetails && 
                              index < prevExerciseData.setDetails.length ? 
                              prevExerciseData.setDetails[index] : null;
            
            if (prevSetData) {
              console.log(`Set ${index+1} for ${exercise.name}: prev weight=${prevSetData.weight}, reps=${prevSetData.reps}`);
            }

            const prevWeight = prevSetData && prevSetData.weight !== undefined && prevSetData.weight !== null ? 
              String(prevSetData.weight) : '';
            
            const prevReps = prevSetData && prevSetData.reps !== undefined && prevSetData.reps !== null ? 
              String(prevSetData.reps) : '';
            
            const prevNotes = prevSetData && prevSetData.notes ? prevSetData.notes : '';
            
            return {
              id: `new-${exercise.id}-${index}`,
              weight: '', 
              reps: '',
              type: prevSetData ? prevSetData.type || 'normal' : 'normal',
              notes: '',
              prevWeight,
              prevReps,
              prevNotes
            };
          })
        };
      }) || [];
      
      setExercises(planExercises);
      
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
      
      const exerciseAlreadyExists = exercises.some(ex => 
        ex.name.toLowerCase() === selectedExercise.toLowerCase()
      );
      
      if (exerciseAlreadyExists) {
        Alert.alert(
          "Duplicate Exercise",
          `"${selectedExercise}" is already in this workout. Each exercise can only be added once.`,
          [{ text: "OK" }]
        );
        
        router.setParams({ id: workoutId });
        return;
      }

      let exerciseId = '';
      let exerciseType: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core' | undefined;
      
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
      
      if (!exerciseId) {
        exerciseId = `custom-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        exerciseType = findExerciseType(selectedExercise);
      }

      let prevExerciseData = null;

      if (exercisePreviousDataMap.has(exerciseId)) {
        prevExerciseData = exercisePreviousDataMap.get(exerciseId).exerciseData;
        console.log(`Found previous data for ${selectedExercise} by ID ${exerciseId}`);
      } 
      else {
        const nameKey = `name:${selectedExercise.toLowerCase()}`;
        if (exercisePreviousDataMap.has(nameKey)) {
          prevExerciseData = exercisePreviousDataMap.get(nameKey).exerciseData;
          console.log(`Found previous data for ${selectedExercise} by name`);
        }
      }

      const sets = [];
      const numSets = prevExerciseData?.setDetails?.length || 3; 
      
      for (let i = 0; i < numSets; i++) {
        const prevSetData = prevExerciseData?.setDetails && i < prevExerciseData.setDetails.length ? 
                             prevExerciseData.setDetails[i] : null;
                             
        const prevWeight = prevSetData && prevSetData.weight !== undefined && prevSetData.weight !== null ? 
          String(prevSetData.weight) : '';
        
        const prevReps = prevSetData && prevSetData.reps !== undefined && prevSetData.reps !== null ? 
          String(prevSetData.reps) : '';
        
        const prevNotes = prevSetData && prevSetData.notes ? prevSetData.notes : '';
        
        sets.push({
          id: `${timestamp}-set${i+1}`,
          weight: '',
          reps: '',
          type: prevSetData?.type || 'normal',
          notes: '',
          prevWeight,
          prevReps,
          prevNotes
        });
      }
      
      const exerciseToAdd: ExerciseProgress = {
        id: exerciseId,
        name: selectedExercise,
        type: exerciseType,
        sets: sets
      };

      if (prevExerciseData) {
        console.log(`Added exercise ${selectedExercise} with ${sets.length} sets using previous data`);
      } else {
        console.log(`Added exercise ${selectedExercise} with ${sets.length} sets (no previous data found)`);
      }

      setExercises(prev => [...prev, exerciseToAdd]);

      router.setParams({ id: workoutId });
    }
  }, [selectedExercise, workoutId]);

  useEffect(() => {
    if (autoStart && !isWorkoutActive && !workoutStartTime && !loading) {
      console.log('Auto-starting workout from "Start Workout" button');
      const timer = setTimeout(() => {
        startWorkout();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isWorkoutActive, workoutStartTime, loading]);

  const handleWorkoutExit = async () => {
    if (isWorkoutActive && !workoutEndTime && exercises.length > 0 && !hasExitSave) {
      await saveWorkoutAsNotDone();
      setHasExitSave(true);
    }
  };

  const handleBackPress = async () => {
    if (isWorkoutActive && !workoutEndTime) {
      Alert.alert(
        "Save Workout",
        "Do you want to save your workout progress?",
        [
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setHasExitSave(true); // Prevent save on unmount
              router.back();
            }
          },
          {
            text: "Save",
            onPress: async () => {
              const id = await saveWorkoutAsNotDone();
              if (id) {
                router.push({
                  pathname: '/profile/recent-workouts',
                  params: { highlightId: id }
                });
              } else {
                router.back();
              }
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const saveWorkoutAsNotDone = async () => {
    try {
      if (!workoutPlan || !isWorkoutActive || hasExitSave || saveOperationInProgressRef.current) {
        console.log("Skipping save: workoutPlan=", !!workoutPlan, "isWorkoutActive=", isWorkoutActive, "hasExitSave=", hasExitSave, "saveOperationInProgress=", saveOperationInProgressRef.current);
        return null;
      }
      
      // Set this flag immediately to prevent duplicate saves
      saveOperationInProgressRef.current = true;
      setHasExitSave(true);
      
      console.log("Saving workout as not done before exiting");
      
      const workoutExercises = exercises.map(exercise => {
        return {
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
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
      
      const workoutData = {
        workout_plan_id: workoutId,
        title: workoutName,
        date: new Date().toISOString(),
        start_time: workoutStartTime?.toISOString(),
        end_time: new Date().toISOString(),
        notes: notes,
        exercises: workoutExercises,
        bodyweight: bodyWeight ? parseFloat(bodyWeight) : undefined,
        user_id: workoutPlan.user_id,
        calories_burned: 0,
        done: false
      };
            
      const savedWorkout = await createWorkout(workoutData);
      setSavedWorkoutId(savedWorkout.id);
      console.log("Successfully saved workout as not done:", savedWorkout.id);
      
      return savedWorkout.id;
    } catch (error) {
      console.error('Error saving workout as not done:', error);
      return null;
    } finally {
      saveOperationInProgressRef.current = false;
    }
  };

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
        const currentSetCount = exercise.sets.length;
        let prevSetData = null;
        const exerciseData = exercisePreviousDataMap.get(exercise.id)?.exerciseData;

        if (exerciseData && exerciseData.setDetails && currentSetCount < exerciseData.setDetails.length) {

          prevSetData = exerciseData.setDetails[currentSetCount];
          console.log(`Found historical data for new set ${currentSetCount+1} in exercise ${exercise.name}`);
        }
        
        const prevWeight = prevSetData && prevSetData.weight !== undefined && prevSetData.weight !== null ? 
          String(prevSetData.weight) : '';
        
        const prevReps = prevSetData && prevSetData.reps !== undefined && prevSetData.reps !== null ? 
          String(prevSetData.reps) : '';
        
        const prevNotes = prevSetData && prevSetData.notes ? prevSetData.notes : '';

        const newSet: WorkoutSet = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          weight: '',
          reps: '',
          type: prevSetData?.type || 'normal',
          notes: '',
          prevWeight,
          prevReps,
          prevNotes
        };
        
        return {
          ...exercise,
          sets: [...exercise.sets, newSet]
        };
      }
      return exercise;
    }));
    
    if (!isWorkoutActive && !workoutStartTime) {
      console.log("Set added - will update workout plan when saved");
    } else {
      console.log("Set added - will only affect this workout session, not the plan");
    }
  };

  const updateSet = (exerciseId: string, setId: string, field: keyof WorkoutSet, value: string) => {
    if (field === 'weight' || field === 'reps') {
      const processedValue = value.replace(',', '.');
      
      const isValidNumericInput = field === 'weight' 
        ? /^(\d*\.?\d*)$/.test(processedValue) 
        : /^\d*$/.test(processedValue);
      
      if (processedValue !== '' && !isValidNumericInput) {
        return;
      }
      
      value = processedValue;
    }
    
    setExercises(prev => {
      const updatedExercises = [...prev];
      const exerciseIndex = updatedExercises.findIndex(e => e.id === exerciseId);
      if (exerciseIndex === -1) return prev;
      
      const updatedExercise = {...updatedExercises[exerciseIndex]};
      const setIndex = updatedExercise.sets.findIndex(s => s.id === setId);
      if (setIndex === -1) return prev;
      
      const updatedSets = [...updatedExercise.sets];
      updatedSets[setIndex] = {...updatedSets[setIndex], [field]: value};
      updatedExercise.sets = updatedSets;
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
      const originalPlan = workoutPlan;

      if (fromHistory) {
        const workoutExercises = exercises.map(exercise => {
          return {
            id: exercise.id,
            name: exercise.name,
            type: exercise.type,
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

        await supabase
          .from('workouts')
          .update({
            title: workoutName,
            notes: notes,
            bodyweight: bodyWeight ? parseFloat(bodyWeight) : undefined,
            exercises: workoutExercises,
            done: true
          })
          .eq('id', workoutId);
        
        console.log("Updated existing workout from history");
        router.back();
        return;
      }

      const isWorkoutSessionMode = isWorkoutActive || !!workoutStartTime;
      
      console.log(`Mode: ${isWorkoutSessionMode ? 'Active workout session' : 'Workout plan editing'}`);
      
      let savedWorkoutId = null;

      if (!isWorkoutSessionMode) {
  
        const planExercises = exercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          type: exercise.type,
          sets: exercise.sets.length
        }));

        await updateWorkoutPlan(workoutId, {
          title: workoutName,
          description: notes,
          exercises: planExercises
        });
        
        console.log("Updated workout plan with new exercise/set information");
      } else {
        console.log("Workout session active - original workout plan was NOT modified");
      }

      if (isWorkoutSessionMode) {
        const workoutExercises = exercises.map(exercise => {
          return {
            id: exercise.id,
            name: exercise.name,
            type: exercise.type,
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
        
        const endTimeToUse = workoutEndTime || new Date();
        const isDone = true;
        setHasExitSave(true);
        
        const workoutData = {
          workout_plan_id: workoutId,
          title: workoutName,
          date: new Date().toISOString(),
          start_time: workoutStartTime?.toISOString() || new Date().toISOString(),
          end_time: endTimeToUse?.toISOString(),
          notes: notes,
          exercises: workoutExercises,
          bodyweight: bodyWeight ? parseFloat(bodyWeight) : undefined,
          user_id: workoutPlan.user_id,
          calories_burned: 0,
          done: isDone
        };
                
        const savedWorkout = await createWorkout(workoutData);
        savedWorkoutId = savedWorkout.id;
        console.log("Successfully created workout session:", savedWorkout.id, "Done status:", isDone);

        if (isDone && workoutStartTime && endTimeToUse) {
  
          try {
            const user = await getCurrentUser();
            await deleteAllAISuggestions(user.id);
            console.log('Deleted all existing AI suggestions for user:', user.id);

            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.setItem('refresh_ai_suggestions', 'true');
            await AsyncStorage.setItem('last_completed_workout_id', savedWorkoutId);
            console.log('Flagged AI suggestions for refresh after workout completion');
          } catch (asyncError) {
            console.error('Error setting AI refresh flag:', asyncError);
          }
        }
      } else {
        console.log("No workout session was recorded, only the plan was updated");
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
        showExerciseSearch: "true",
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
    let idToUse = exerciseId;
    
    if (exerciseId.startsWith('custom-')) {
      idToUse = `exercise-${exerciseName.toLowerCase().replace(/\s+/g, '-')}-stats`;
    }
    
    router.push({
      pathname: '/stats/[id]',
      params: { 
        id: idToUse,
        exerciseName: exerciseName,
        workoutId: workoutId,
        returnPath: `/workouts/${workoutId}`
      }
    });
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'ios') {
      if (selectedDate) {
        if (editingTime === 'start') {
          setWorkoutStartTime(selectedDate);
          if (!isWorkoutActive) {
            setIsWorkoutActive(true);
          }
          await updateWorkoutTime({
            start_time: selectedDate.toISOString()
          });
        } else if (editingTime === 'end') {
          setWorkoutEndTime(selectedDate);
          setIsWorkoutActive(false);

          await updateWorkoutTime({
            end_time: selectedDate.toISOString()
          });
        }
      }
    } else {
      setShowTimePicker(false);
      if (selectedDate) {
        if (editingTime === 'start') {
          setWorkoutStartTime(selectedDate);
          if (!isWorkoutActive) {
            setIsWorkoutActive(true);
          }

          await updateWorkoutTime({
            start_time: selectedDate.toISOString()
          });
        } else if (editingTime === 'end') {
          setWorkoutEndTime(selectedDate);
          setIsWorkoutActive(false);
          await updateWorkoutTime({
            end_time: selectedDate.toISOString()
          });
        }
      }
      setEditingTime(null);
    }
  };

  const updateWorkoutTime = async (updates: { start_time?: string; end_time?: string }) => {
    try {
      if (!workoutId) return;
      
      const { data, error } = await supabase
        .from('workouts')
        .update(updates)
        .eq('id', workoutId)
        .select()
        .single();

      if (error) {
        console.error('Error updating workout time:', error);
        Alert.alert('Error', 'Failed to update workout time');
      } else {
        console.log('Successfully updated workout time:', updates);
      }
    } catch (error) {
      console.error('Error in updateWorkoutTime:', error);
      Alert.alert('Error', 'Failed to update workout time');
    }
  };

  const openTimePicker = (timeType: 'start' | 'end') => {
    setEditingTime(timeType);
    setShowTimePicker(true);
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
        
        <View style={styles.fixedHeader}>
          <TouchableOpacity onPress={handleBackPress} style={styles.closeButton} activeOpacity={0.7}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.date}>
              {fromHistory ? 'Edit Workout' : (() => {
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
              80 + (StatusBar.currentHeight ?? 0) : 80, 
            paddingBottom: 20 
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.workoutInfo}>
            <View>
              <TextInput
                style={styles.workoutNameInput}
                value={workoutName}
                onChangeText={setWorkoutName}
                placeholder="Workout Name"
                placeholderTextColor="#8E8E93"
              />

              <View style={styles.infoGrid}>
                <View style={[styles.infoCard, styles.fullWidthCard]}>
                  <View style={styles.infoIconContainer}>
                    <CalendarClock size={20} color="#007AFF" />
                  </View>
                  <View style={styles.infoContent}>
                    <View style={styles.workoutTimeRow}>
                      <View>
                        <Text style={styles.infoLabel}>Workout Time</Text>
                        {workoutStartTime ? (
                          <View style={styles.timeTextContainer}>
                            <TouchableOpacity 
                              onPress={() => openTimePicker('start')}
                              style={styles.timeWithEditButton}
                            >
                              <Text style={styles.infoValue}>
                                {(() => {
                                  try {
                                    return format(workoutStartTime, 'HH:mm');
                                  } catch (error) {
                                    console.warn('Error formatting start time:', error);
                                    return 'Time unavailable';
                                  }
                                })()}
                              </Text>
                            </TouchableOpacity>
                            
                            {workoutEndTime && (
                              <>
                                <Text style={styles.infoValue}> - </Text>
                                <TouchableOpacity 
                                  onPress={() => openTimePicker('end')}
                                  style={styles.timeWithEditButton}
                                >
                                  <Text style={styles.infoValue}>
                                    {(() => {
                                      try {
                                        return format(workoutEndTime, 'HH:mm');
                                      } catch (error) {
                                        console.warn('Error formatting end time:', error);
                                        return 'Time unavailable';
                                      }
                                    })()}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        ) : null}
                      </View>
                      {/* Only show workout state button if not already saved with times */}
                      {(!workoutStartTime || (workoutStartTime && !workoutEndTime && isWorkoutActive)) && (
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
                      )}
                    </View>
                  </View>
                </View>

                <View style={[styles.infoCard, styles.fullWidthCard]}>
                  <View style={styles.infoIconContainer}>
                    <Scale size={20} color="#FF9500" />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Body Weight</Text>
                    <TextInput
                      style={styles.infoInput}
                      value={bodyWeight}
                      onChangeText={(text) => setBodyWeight(text.replace(',', '.'))}
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
                      handleDragEnd();
                    } else {
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
                          placeholder={set.prevWeight ? `${set.prevWeight}` : "kg"}
                          placeholderTextColor={set.prevWeight ? "#C7C7CC" : "#C7C7CC"}
                          maxLength={6}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          selectTextOnFocus={true}
                          caretHidden={false}
                        />
                      </View>

                      <View style={[styles.inputGroup, styles.smallInputGroup]}>
                        <Text style={styles.inputLabel}>Reps</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={set.reps}
                          onChangeText={(text) => updateSet(exercise.id, set.id, 'reps', text)}
                          placeholder={set.prevReps ? set.prevReps : "#"}
                          placeholderTextColor={set.prevReps ? "#C7C7CC" : "#C7C7CC"}
                          maxLength={3}
                          returnKeyType="done"
                          blurOnSubmit={true}
                          selectTextOnFocus={true}
                          caretHidden={false}
                        />
                      </View>

                      <View style={[styles.inputGroup, styles.notesGroup]}>
                        <Text style={styles.inputLabel}>Notes</Text>
                        <TextInput
                          style={[styles.input, styles.multilineInput]}
                          value={set.notes}
                          onChangeText={(text) => updateSet(exercise.id, set.id, 'notes', text)}
                          placeholder={set.prevNotes || "Notes"}
                          placeholderTextColor={set.prevNotes ? "#C7C7CC" : "#C7C7CC"}
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

        {/* Time picker for iOS */}
        {showTimePicker && Platform.OS === 'ios' && (
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerHeader}>
              <TouchableOpacity onPress={() => {
                setShowTimePicker(false);
                setEditingTime(null);
              }}>
                <Text style={styles.timePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.timePickerTitle}>
                {editingTime === 'start' ? 'Start Time' : 'End Time'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowTimePicker(false);
                setEditingTime(null);
              }}>
                <Text style={styles.timePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={editingTime === 'start' 
                ? (workoutStartTime || new Date()) 
                : (workoutEndTime || new Date())}
              mode="time"
              is24Hour={true}
              display="default" 
              onChange={handleTimeChange}
              style={styles.timePicker}
            />
          </View>
        )}

        {/* Time picker for Android */}
        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={editingTime === 'start' 
              ? (workoutStartTime || new Date()) 
              : (workoutEndTime || new Date())}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
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
    top: Platform.OS === 'ios' ? 47 : 0, 
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
    height: Platform.OS === 'android' ? 64 + (StatusBar.currentHeight ?? 0) : 64, 
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
    paddingVertical: 4, 
  },
  date: {
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    width: 40, 
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    width: 40, 
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
  timeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeWithEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeEditButton: {
    padding: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginLeft: 8,
  },
  workoutStateButton: {
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  workoutStateButtonActive: {
    backgroundColor: '#FF3B30',
  },
  workoutStateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  workoutTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoGrid: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fullWidthCard: {
    width: '100%',
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
  prevValueHint: {
    fontSize: 10,
    color: '#34C759',
    marginTop: 2,
    textAlign: 'right',
  },
  timePickerContainer: {
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
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    backgroundColor: '#FFFFFF',
    padding: 8,
  },
  timePickerCancel: {
    fontSize: 16,
    color: '#FF3B30',
  },
  timePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  timePicker: {
    height: 120,
    alignSelf: 'stretch',
  },
});