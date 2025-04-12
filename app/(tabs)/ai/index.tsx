import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { checkDatabaseSchema, createWorkoutsTable } from '@/utils/database-checker';
import { getWorkouts, getCurrentUser, Workout, WorkoutExercise, SetDetail, addExerciseToWorkout, getWorkoutPlans, WorkoutPlan, addExerciseToPlan } from '@/utils/supabase';
import { generateWeightSuggestions, generateExerciseSuggestions } from '@/utils/deepseek';

// Interface for weight modification suggestions
interface WeightModification {
  id: number;
  exercise: string;
  suggestion: string;
  currentWeight: string;
  suggestedWeight: string;
}

// Interface for exercise suggestions
interface ExerciseSuggestion {
  id: number;
  type: string;
  exercise: string;
  suggestion: string;
  reasoning: string;
  target_workout?: string;
}

export default function AIScreen() {
  const [responses, setResponses] = useState<Record<number, 'accept' | 'decline'>>({});
  const [weightModifications, setWeightModifications] = useState<WeightModification[]>([]);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [visibleModifications, setVisibleModifications] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  const [isWorkoutModalVisible, setIsWorkoutModalVisible] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchWorkoutData();
  }, []);

  const fetchWorkoutData = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      const workoutData = await getWorkouts(user.id);
      
      // Fetch workout plans instead of workouts
      const workoutPlanData = await getWorkoutPlans(user.id);
      setWorkoutPlans(workoutPlanData);
      
      // Keep existing workouts for weight suggestions
      setWorkouts(workoutData);
      
      // Get weight suggestions from DeepSeek
      if (workoutData && workoutData.length > 0) {
        const completedWorkouts = workoutData.filter(w => w.done && w.exercises && w.exercises.length > 0);
        
        if (completedWorkouts.length > 0) {
          // Get weight suggestions
          const deepseekSuggestions = await generateWeightSuggestions(user.id, completedWorkouts);
          
          if (deepseekSuggestions && deepseekSuggestions.length > 0) {
            const formattedSuggestions: WeightModification[] = deepseekSuggestions.map((suggestion, index) => ({
              id: 100 + index,
              exercise: suggestion.exercise,
              suggestion: suggestion.suggestion,
              currentWeight: `${suggestion.currentWeight}kg`,
              suggestedWeight: `${suggestion.suggestedWeight}kg`
            }));
            
            setWeightModifications(formattedSuggestions);
            setVisibleModifications(formattedSuggestions.map(s => s.id));
          }
        }
        
        try {
          // Get exercise suggestions from DeepSeek
          if (typeof generateExerciseSuggestions === 'function') {
            const exerciseSuggestions = await generateExerciseSuggestions(user.id);
            
            if (exerciseSuggestions && exerciseSuggestions.length > 0) {
              const formattedExerciseSuggestions: ExerciseSuggestion[] = exerciseSuggestions.map((suggestion, index) => ({
                id: 200 + index,
                type: suggestion.type || 'New Exercise',
                exercise: suggestion.exercise,
                suggestion: suggestion.suggestion,
                reasoning: suggestion.reasoning,
                target_workout: suggestion.target_workout
              }));
              
              setExerciseSuggestions(formattedExerciseSuggestions);
            }
          } else {
            // Fallback: Hardcoded sample exercise suggestions
            console.log('Using fallback exercise suggestions');
            const fallbackSuggestions: ExerciseSuggestion[] = [
              {
                id: 201,
                type: 'New Exercise',
                exercise: 'Bulgarian Split Squats',
                suggestion: 'Add 3 sets of 10-12 reps per leg to your leg workout',
                reasoning: 'This unilateral exercise will help address muscle imbalances and enhance your leg development',
                target_workout: 'Leg Day'
              },
              {
                id: 202,
                type: 'Additional Set',
                exercise: 'Bench Press',
                suggestion: 'Add 2 more sets of your bench press with slightly lower weight',
                reasoning: 'Increasing volume on compound exercises can boost muscle growth and strength',
                target_workout: 'Chest Day'
              }
            ];
            
            setExerciseSuggestions(fallbackSuggestions);
          }
        } catch (suggestionError) {
          console.error('Error with exercise suggestions:', suggestionError);
          // Provide fallback suggestions
          const fallbackSuggestions: ExerciseSuggestion[] = [
            {
              id: 201,
              type: 'New Exercise',
              exercise: 'Bulgarian Split Squats',
              suggestion: 'Add 3 sets of 10-12 reps per leg to your leg workout',
              reasoning: 'This unilateral exercise will help address muscle imbalances and enhance your leg development',
              target_workout: 'Leg Day'
            },
            {
              id: 202,
              type: 'Additional Set',
              exercise: 'Bench Press',
              suggestion: 'Add 2 more sets of your bench press with slightly lower weight',
              reasoning: 'Increasing volume on compound exercises can boost muscle growth and strength',
              target_workout: 'Chest Day'
            }
          ];
          
          setExerciseSuggestions(fallbackSuggestions);
        }
      }
    } catch (error) {
      console.error('Error fetching workout data:', error);
      Alert.alert('Error', 'Failed to load workout suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = (id: number, response: 'accept' | 'decline') => {
    if (response === 'accept') {
      // Find the suggestion by ID
      const suggestion = exerciseSuggestions.find(s => s.id === id);
      if (suggestion) {
        setSelectedSuggestionId(id);
        setIsWorkoutModalVisible(true);
      } else {
        setResponses(prev => ({ ...prev, [id]: response }));
      }
    } else {
      // For decline, just update the response state
      setResponses(prev => ({ ...prev, [id]: response }));
    }
  };

  const dismissModification = (id: number) => {
    setVisibleModifications(prev => prev.filter(modId => modId !== id));
  };

  const handleWorkoutSelect = async (planId: string) => {
    if (!selectedSuggestionId) return;
    
    setIsWorkoutModalVisible(false);
    
    try {
      const suggestion = exerciseSuggestions.find(s => s.id === selectedSuggestionId);
      if (!suggestion) return;
      
      // Extract sets count from suggestion text or default to 3
      const setsMatch = suggestion.suggestion.match(/(\d+)\s*sets/i);
      const sets = setsMatch ? parseInt(setsMatch[1]) : 3;
      
      // Add the exercise to the selected workout plan
      await addExerciseToPlan(planId, {
        name: suggestion.exercise,
        sets: sets
      });
      
      // Update the responses state
      setResponses(prev => ({ ...prev, [selectedSuggestionId]: 'accept' }));
      
      // Show success message
      const selectedPlan = workoutPlans.find(p => p.id === planId);
      const planName = selectedPlan?.title || 'your workout plan';
      Alert.alert('Success', `Added ${suggestion.exercise} to ${planName}!`);
    } catch (error) {
      console.error('Error adding exercise to workout plan:', error);
      Alert.alert('Error', 'Failed to update workout plan with suggestion');
    } finally {
      setSelectedSuggestionId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeAreaHeader}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>AI Workout Assistant</Text>
              <Text style={styles.headerSubtitle}>Personalized workout suggestions</Text>
            </View>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => router.push('/ai/chat')}
            >
              <MessageSquare size={20} color="#FFFFFF" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your workout data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaHeader}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI Workout Assistant</Text>
            <Text style={styles.headerSubtitle}>Personalized workout suggestions</Text>
          </View>
          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => router.push('/ai/chat')}
          >
            <MessageSquare size={20} color="#FFFFFF" />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        {/* Weight Modification Suggestions (Dismissible) */}
        {weightModifications.length > 0 ? (
          weightModifications
            .filter(mod => visibleModifications.includes(mod.id))
            .map(mod => (
              <View key={mod.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardType, styles.modificationType]}>Weight Modification</Text>
                  <TouchableOpacity 
                    style={styles.dismissButton}
                    onPress={() => dismissModification(mod.id)}
                  >
                    <X size={18} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.cardExercise}>{mod.exercise}</Text>
                <Text style={styles.suggestion}>{mod.suggestion}</Text>
                
                <View style={styles.weightContainer}>
                  <View style={styles.weightBox}>
                    <Text style={styles.weightLabel}>Current</Text>
                    <Text style={styles.weightValue}>{mod.currentWeight}</Text>
                  </View>
                  <View style={styles.weightArrow}>
                    <Text style={styles.weightArrowText}>→</Text>
                  </View>
                  <View style={styles.weightBox}>
                    <Text style={styles.weightLabel}>Suggested</Text>
                    <Text style={[styles.weightValue, styles.suggestedWeight]}>
                      {mod.suggestedWeight}
                    </Text>
                  </View>
                </View>
              </View>
            ))
        ) : (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>
              Complete some workouts with weights to receive personalized weight progression suggestions.
            </Text>
          </View>
        )}

        {/* Exercise Addition Suggestions */}
        {exerciseSuggestions.length > 0 ? (
          exerciseSuggestions.map(suggestion => (
            <View key={suggestion.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[
                  styles.cardType,
                  suggestion.type.includes('New') && styles.additionType,
                  suggestion.type.includes('Additional') && styles.modificationType,
                  suggestion.type === 'Recovery' && styles.recoveryType,
                ]}>{suggestion.type}</Text>
              </View>
              
              <Text style={styles.cardExercise}>{suggestion.exercise}</Text>
              <Text style={styles.suggestion}>{suggestion.suggestion}</Text>
              
              {suggestion.target_workout && (
                <View style={styles.targetWorkoutContainer}>
                  <Text style={styles.targetWorkoutLabel}>Recommended for:</Text>
                  <Text style={styles.targetWorkoutValue}>{suggestion.target_workout}</Text>
                </View>
              )}
              
              <View style={styles.reasoningContainer}>
                <Text style={styles.reasoningTitle}>Why this suggestion?</Text>
                <Text style={styles.reasoning}>{suggestion.reasoning}</Text>
              </View>

              {!responses[suggestion.id] ? (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleResponse(suggestion.id, 'accept')}>
                    <ThumbsUp size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleResponse(suggestion.id, 'decline')}>
                    <ThumbsDown size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.responseContainer}>
                  <Text style={[
                    styles.responseText,
                    responses[suggestion.id] === 'accept' ? styles.acceptedText : styles.declinedText
                  ]}>
                    {responses[suggestion.id] === 'accept' ? 'Accepted ✓' : 'Declined ×'}
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.noDataCard}>
            <Text style={styles.noDataText}>
              Continue logging workouts to receive personalized exercise suggestions.
            </Text>
          </View>
        )}

        {/* Refresh Button */}
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={fetchWorkoutData}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>
            {isLoading ? 'Refreshing...' : 'Refresh Suggestions'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Workout Selection Modal */}
      <Modal
        visible={isWorkoutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsWorkoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Workout Plan</Text>
              <TouchableOpacity 
                onPress={() => setIsWorkoutModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Choose a workout plan to add this exercise to:
            </Text>
            
            {workoutPlans.length > 0 ? (
              <FlatList
                data={workoutPlans}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[
                      styles.workoutItem,
                      selectedWorkoutId === item.id && styles.selectedWorkoutItem
                    ]}
                    onPress={() => handleWorkoutSelect(item.id)}
                  >
                    <View style={styles.workoutItemContent}>
                      <Text style={styles.workoutItemTitle}>{item.title}</Text>
                      <Text style={styles.workoutItemType}>
                        {item.workout_type === 'split' ? 'Split' : 'Custom'} • {item.exercises?.length || 0} exercises
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.workoutList}
              />
            ) : (
              <View style={styles.noWorkoutsContainer}>
                <Text style={styles.noWorkoutsText}>
                  No workout plans found. Create a workout plan first.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeAreaHeader: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardType: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  modificationType: {
    backgroundColor: '#E8F1FF',
    color: '#007AFF',
  },
  additionType: {
    backgroundColor: '#E8FFF1',
    color: '#34C759',
  },
  recoveryType: {
    backgroundColor: '#FFF1E8',
    color: '#FF9500',
  },
  dismissButton: {
    padding: 4,
  },
  cardExercise: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  suggestion: {
    fontSize: 16,
    lineHeight: 24,
    color: '#1C1C1E',
  },
  reasoningContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  reasoningTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reasoning: {
    fontSize: 14,
    color: '#8E8E93',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  weightBox: {
    flex: 2,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  weightArrow: {
    flex: 1,
    alignItems: 'center',
  },
  weightArrowText: {
    fontSize: 20,
    color: '#8E8E93',
  },
  weightLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  suggestedWeight: {
    color: '#007AFF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  responseContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    alignItems: 'center',
  },
  responseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  acceptedText: {
    color: '#34C759',
  },
  declinedText: {
    color: '#FF3B30',
  },
  debugButton: {
    backgroundColor: '#FF9500',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    alignItems: 'center',
  },
  debugButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  noDataCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#8E8E93',
    lineHeight: 22,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 16,
    color: '#666',
  },
  workoutList: {
    paddingBottom: 8,
  },
  workoutItem: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutItemContent: {
    flex: 1,
  },
  selectedWorkoutItem: {
    backgroundColor: '#E8F1FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  completedWorkoutItem: {
    opacity: 0.7,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  workoutCompletedTag: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
    backgroundColor: '#E8FFF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noWorkoutsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noWorkoutsText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  targetWorkoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  targetWorkoutLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    color: '#8E8E93',
  },
  targetWorkoutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  workoutItemType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});