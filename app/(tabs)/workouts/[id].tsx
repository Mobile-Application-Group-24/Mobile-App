import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, StatusBar, SafeAreaView, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Clock, ChartBar as BarChart3, Plus, CalendarClock, Scale, File as FileEdit, Dumbbell, Trash, Save, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { getWorkout, deleteWorkout, updateWorkout, Workout, Exercise } from '@/utils/workout';
import { Swipeable } from 'react-native-gesture-handler';

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
}

export default function WorkoutDetailScreen() {
  const params = useLocalSearchParams();
  const workoutId = params.id as string;
  const selectedExercise = params.selectedExercise;
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bodyWeight, setBodyWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);
  const [showTypeLabel, setShowTypeLabel] = useState<{ id: string, show: boolean }>({ id: '', show: false });
  const [draggingExercise, setDraggingExercise] = useState<string | null>(null);

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

  useEffect(() => {
    if (workoutId) {
      loadWorkout(workoutId);
    } else {
      setError('Workout ID not found');
      setLoading(false);
    }
  }, [workoutId]);

  const loadWorkout = async (workoutId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkout(workoutId);
      setWorkout(data);
      setNotes(data.notes || '');
      setBodyWeight(data.bodyweight?.toString() || '');
      setExercises(data.exercises.map(exercise => {
        if (exercise.setDetails && exercise.setDetails.length > 0) {
          return {
            id: exercise.id,
            name: exercise.name,
            sets: exercise.setDetails.map(set => ({
              id: set.id.toString(),
              weight: set.weight?.toString() || '',
              reps: set.reps?.toString() || '',
              type: set.type || 'normal',
              notes: set.notes || ''
            }))
          };
        } else {
          return {
            id: exercise.id,
            name: exercise.name,
            sets: Array(exercise.sets).fill(null).map((_, index) => ({
              id: (index + 1).toString(),
              weight: exercise.weight?.toString() || '',
              reps: exercise.reps?.toString() || '',
              type: 'normal'
            }))
          };
        }
      }));
    } catch (error) {
      console.error('Error loading workout:', error);
      setError('Failed to load workout details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExercise && typeof selectedExercise === 'string') {
      const timestamp = Date.now();
      const exerciseToAdd: ExerciseProgress = {
        id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        name: selectedExercise,
        sets: [{
          id: `${timestamp}-set1`,
          weight: '',
          reps: '',
          type: 'normal',
          notes: ''
        }]
      };

      setExercises(prev => [...prev, exerciseToAdd]);

      const timeout = setTimeout(() => {
        router.setParams({ id: workoutId });
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [selectedExercise, workoutId]);

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
                await deleteWorkout(workoutId);
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

  const updateSet = (exerciseId: string, setId: string, field: keyof WorkoutSet, value: string) => {
    setExercises(prev => prev.map(exercise => {
      if (exercise.id === exerciseId) {
        return {
          ...exercise,
          sets: exercise.sets.map(set => {
            if (set.id === setId) {
              return { ...set, [field]: value };
            }
            return set;
          })
        };
      }
      return exercise;
    }));
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

  const renderRightActions = (exerciseId: string, setId: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteSet(exerciseId, setId)}
      >
        <Trash2 size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  };

  const saveWorkoutChanges = async () => {
    if (!workout || !workoutId) return;

    try {
      const updatedExercises = exercises.map(exercise => {
        const exerciseData = {
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets.length,
          reps: exercise.sets[0]?.reps ? parseInt(exercise.sets[0].reps, 10) : undefined,
          weight: exercise.sets[0]?.weight ? parseFloat(exercise.sets[0].weight) : undefined,
          setDetails: exercise.sets.map(set => ({
            id: set.id,
            weight: set.weight ? parseFloat(set.weight) : undefined,
            reps: set.reps ? parseInt(set.reps, 10) : undefined,
            type: set.type,
            notes: set.notes || ''
          }))
        };
        return exerciseData;
      });

      const updatedWorkout = {
        ...workout,
        notes: notes,
        exercises: updatedExercises,
        bodyweight: bodyWeight ? parseFloat(bodyWeight) : undefined,
      };

      console.log('Saving workout:', JSON.stringify(updatedWorkout, null, 2));
      await updateWorkout(workoutId, updatedWorkout);
      router.back();
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Error', 'Failed to update workout');
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !workout) {
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <ScrollView
            style={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} activeOpacity={0.7}>
                <X size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.date}>{format(new Date(), 'dd. MMMM')}</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                  <Clock size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>{workout?.name || 'Workout'}</Text>
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
                    if (draggingExercise && draggingExercise !== exercise.id) {
                      handleMoveExercise(draggingExercise, exercise.id);
                      handleDragEnd();
                    }
                  }}
                  delayLongPress={200}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                  </View>
                  {exercise.sets.map((set, setIndex) => (
                    <Swipeable
                      key={setIndex}
                      renderRightActions={() => renderRightActions(exercise.id, set.id)}
                      rightThreshold={40}
                    >
                      <View style={styles.setContainer}>
                        <TouchableOpacity
                          onPress={() => toggleSetType(exercise.id, set.id)}
                          style={[
                            styles.setNumber,
                            set.type === 'warmup' && styles.warmupNumber,
                            set.type === 'dropset' && styles.dropsetNumber,
                          ]}>
                          <Text style={[
                            styles.setNumberText,
                            showTypeLabel.id === set.id && showTypeLabel.show ? styles.hideNumber : null
                          ]}>
                            {showTypeLabel.id === set.id && showTypeLabel.show ?
                              (set.type === 'warmup' ? 'W' : set.type === 'dropset' ? 'D' : 'N') :
                              (setIndex + 1)
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
                              placeholder={set.weight || "kg"}
                              placeholderTextColor="#C7C7CC"
                            />
                          </View>

                          <View style={[styles.inputGroup, styles.smallInputGroup]}>
                            <Text style={styles.inputLabel}>Reps</Text>
                            <TextInput
                              style={styles.input}
                              keyboardType="numeric"
                              value={set.reps}
                              onChangeText={(text) => updateSet(exercise.id, set.id, 'reps', text)}
                              placeholder={set.reps || "#"}
                              placeholderTextColor="#C7C7CC"
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
                    </Swipeable>
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
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Clock size={20} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
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
        </SafeAreaView>
      </TouchableWithoutFeedback>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 16 + (StatusBar.currentHeight ?? 0) : 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 8,
  },
  date: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
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
  workoutName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
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
    marginBottom: 12,
    flex: 1,
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
    height: 40,
    marginTop: 21,
    borderRadius: 8,
    width: 100,
    marginLeft: 8,
    marginBottom: 12,
  },
});