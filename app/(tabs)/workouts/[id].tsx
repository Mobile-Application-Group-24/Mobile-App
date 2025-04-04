import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, StatusBar, SafeAreaView, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, Clock, ChartBar as BarChart3, Star, Plus, MoveVertical as MoreVertical, CalendarClock, Scale, File as FileEdit, Dumbbell, Trash } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { getWorkout, deleteWorkout, updateWorkout, Workout, Exercise } from '@/utils/workout';

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
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bodyWeight, setBodyWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseProgress[]>([]);

  useEffect(() => {
    if (id) {
      loadWorkout(id as string);
    } else {
      setError('Workout ID not found');
      setLoading(false);
    }
  }, [id]);

  const loadWorkout = async (workoutId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkout(workoutId);
      setWorkout(data);
      setNotes(data.notes || '');

      // Initialize exercises from the workout data
      setExercises(data.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        sets: Array(exercise.sets).fill(null).map((_, index) => ({
          id: (index + 1).toString(),
          weight: exercise.weight?.toString() || '',
          reps: exercise.reps.toString() || '',
          type: 'normal'
        }))
      })));
      
    } catch (error) {
      console.error('Error loading workout:', error);
      setError('Failed to load workout details');
    } finally {
      setLoading(false);
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
              if (id) {
                await deleteWorkout(id as string);
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
        const lastSet = exercise.sets[exercise.sets.length - 1];
        const newSet: WorkoutSet = {
          id: (exercise.sets.length + 1).toString(),
          weight: lastSet?.weight || '',
          reps: lastSet?.reps || '',
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
              return { ...set, type: nextType };
            }
            return set;
          })
        };
      }
      return exercise;
    }));
  };

  const saveWorkoutChanges = async () => {
    if (!workout || !id) return;

    try {
      const updatedWorkout = {
        ...workout,
        notes: notes
        // Add other fields you want to update
      };

      await updateWorkout(id as string, updatedWorkout);
      Alert.alert('Success', 'Workout updated successfully');
    } catch (error) {
      console.error('Error updating workout:', error);
      Alert.alert('Error', 'Failed to update workout');
    }
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
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                  <MoreVertical size={24} color="#007AFF" />
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
              exercises.map((exercise, exerciseIndex) => (
                <View key={exerciseIndex} style={styles.exerciseCard}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  {exercise.sets.map((set, setIndex) => (
                    <View key={setIndex} style={styles.setContainer}>
                      <View style={styles.setNumber}>
                        <Text style={styles.setNumberText}>{setIndex + 1}</Text>
                      </View>
                      <View style={styles.setInputs}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Weight</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={set.weight}
                            onChangeText={(text) => updateSet(exercise.id, set.id, 'weight', text)}
                            placeholder="kg"
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Reps</Text>
                          <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={set.reps}
                            onChangeText={(text) => updateSet(exercise.id, set.id, 'reps', text)}
                            placeholder="#"
                          />
                        </View>
                        <TouchableOpacity 
                          style={[
                            styles.setType,
                            set.type === 'warmup' && styles.warmupType,
                            set.type === 'dropset' && styles.dropsetType,
                          ]} 
                          onPress={() => toggleSetType(exercise.id, set.id)}
                          activeOpacity={0.7}>
                          <Text style={[
                            styles.setTypeText,
                            set.type === 'warmup' && styles.warmupTypeText,
                            set.type === 'dropset' && styles.dropsetTypeText,
                          ]}>
                            {set.type === 'normal' ? 'Normal' : 
                             set.type === 'warmup' ? 'Warm-up' : 'Drop Set'}
                          </Text>
                        </TouchableOpacity>
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
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Clock size={20} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <BarChart3 size={20} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                        <Star size={20} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
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
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
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
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  setContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  setNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  setInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 8,
    color: '#000000',
    fontSize: 16,
  },
  setType: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  setTypeText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  warmupType: {
    backgroundColor: '#FFF9E6',
  },
  warmupTypeText: {
    color: '#FFB100',
  },
  dropsetType: {
    backgroundColor: '#FFF2F2',
  },
  dropsetTypeText: {
    color: '#FF3B30',
  },
  setActions: {
    marginTop: 16,
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
});