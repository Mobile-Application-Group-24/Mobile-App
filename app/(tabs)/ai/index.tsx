import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { checkDatabaseSchema, createWorkoutsTable } from '@/utils/database-checker';
import { getWorkouts, getCurrentUser, Workout, WorkoutExercise, SetDetail } from '@/utils/supabase';
import { generateWeightSuggestions } from '@/utils/deepseek';

// Workout plan additions that need to be accepted or declined
const workoutPlanSuggestions = [
  {
    id: 2,
    type: 'Addition',
    exercise: 'Core Workout',
    suggestion: 'Add planks (3 sets of 45 seconds) after your main exercises.',
    reasoning: 'Your core stability could benefit from additional focused work.',
  },
  {
    id: 3,
    type: 'Recovery',
    exercise: 'Rest Day',
    suggestion: 'Include a dedicated recovery day after your intense training sessions.',
    reasoning: 'Proper recovery is essential for muscle growth and preventing burnout.',
  },
  {
    id: 4,
    type: 'Addition',
    exercise: 'Pull-ups',
    suggestion: 'Add 3 sets of pull-ups to your back workout for improved upper body development.',
    reasoning: 'Analysis shows your back muscles could benefit from more vertical pulling movements.',
  },
];

// Interface for weight modification suggestions
interface WeightModification {
  id: number;
  exercise: string;
  suggestion: string;
  currentWeight: string;
  suggestedWeight: string;
}

export default function AIScreen() {
  const [responses, setResponses] = useState<Record<number, 'accept' | 'decline'>>({});
  const [weightModifications, setWeightModifications] = useState<WeightModification[]>([]);
  const [visibleModifications, setVisibleModifications] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchWorkoutData();
  }, []);

  const fetchWorkoutData = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      const workouts = await getWorkouts(user.id);
      
      // Send workout data to DeepSeek to generate AI-based weight suggestions
      if (workouts && workouts.length > 0) {
        // Filter completed workouts with exercises
        const completedWorkouts = workouts.filter(w => w.done && w.exercises && w.exercises.length > 0);
        
        if (completedWorkouts.length > 0) {
          // Get AI suggestions from DeepSeek
          const deepseekSuggestions = await generateWeightSuggestions(user.id, completedWorkouts);
          
          // Transform DeepSeek suggestions to our format
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
          } else {
            setWeightModifications([]);
          }
        } else {
          setWeightModifications([]);
        }
      } else {
        setWeightModifications([]);
      }
    } catch (error) {
      console.error('Error fetching workout data:', error);
      setWeightModifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = (id: number, response: 'accept' | 'decline') => {
    setResponses(prev => ({ ...prev, [id]: response }));
  };

  const dismissModification = (id: number) => {
    setVisibleModifications(prev => prev.filter(modId => modId !== id));
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

        {/* Workout Plan Suggestions (Accept/Decline) */}
        {workoutPlanSuggestions.map(suggestion => (
          <View key={suggestion.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[
                styles.cardType,
                suggestion.type === 'Addition' && styles.additionType,
                suggestion.type === 'Recovery' && styles.recoveryType,
              ]}>{suggestion.type}</Text>
              <Text style={styles.cardExercise}>{suggestion.exercise}</Text>
            </View>

            <Text style={styles.suggestion}>{suggestion.suggestion}</Text>
            
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
        ))}

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
});