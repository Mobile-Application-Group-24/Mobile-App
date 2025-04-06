import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { checkDatabaseSchema, createWorkoutsTable } from '@/utils/database-checker';

const suggestions = [
  {
    id: 1,
    type: 'Modification',
    exercise: 'Bench Press',
    suggestion: 'Consider increasing weight by 5kg and reducing reps to 8-10 for better strength gains.',
    reasoning: 'Based on your recent progress, you are ready for progressive overload.',
  },
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
];

export default function AIScreen() {
  const [responses, setResponses] = useState<Record<number, 'accept' | 'decline'>>({});
  const [isChecking, setIsChecking] = useState(false);
  const router = useRouter();

  const handleResponse = (id: number, response: 'accept' | 'decline') => {
    setResponses(prev => ({ ...prev, [id]: response }));
  };

  const handleDatabaseCheck = async () => {
    setIsChecking(true);
    try {
      const result = await checkDatabaseSchema();
      
      // Add a button to create the workouts table if it doesn't exist
      if (!result.tablesExist?.workouts) {
        Alert.alert(
          'Database Check',
          `Authentication: ${result.authentication ? '✅' : '❌'}\n` +
          `User ID: ${result.userId || 'None'}\n` +
          `Nutrition Settings: ${result.nutritionSettings ? '✅' : '❌'}\n` +
          `Workouts: ❌ (Table does not exist)\n`,
          [
            { 
              text: 'Create Workouts Table', 
              onPress: async () => {
                const created = await createWorkoutsTable();
                if (created) {
                  Alert.alert('Success', 'Workouts table was created successfully');
                } else {
                  Alert.alert('Error', 'Failed to create workouts table');
                }
              } 
            },
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert(
          'Database Check',
          `Authentication: ${result.authentication ? '✅' : '❌'}\n` +
          `User ID: ${result.userId || 'None'}\n` +
          `Nutrition Settings: ${result.nutritionSettings ? '✅' : '❌'}\n` +
          `Workouts: ${result.workouts ? '✅' : '❌'}\n`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', `Failed to check database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChecking(false);
    }
  };

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
        {suggestions.map(suggestion => (
          <View key={suggestion.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[
                styles.cardType,
                suggestion.type === 'Modification' && styles.modificationType,
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

        <TouchableOpacity 
          style={[styles.debugButton, isChecking && styles.debugButtonDisabled]} 
          onPress={handleDatabaseCheck}
          disabled={isChecking}
        >
          <Text style={styles.debugButtonText}>
            {isChecking ? 'Checking...' : 'Check Database Connection'}
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
});