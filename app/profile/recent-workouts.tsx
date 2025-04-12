import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, StatusBar, SafeAreaView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Calendar, Clock, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { getRecentWorkouts, type Workout } from '@/utils/supabase';
import { deleteWorkout } from '@/utils/workout';

export default function RecentWorkoutsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadWorkoutsData();
    }
  }, [session?.user?.id]);

  const loadWorkoutsData = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const workoutsData = await getRecentWorkouts(session.user.id, 30); // Get more workouts (up to 30)
      setWorkouts(workoutsData);
      
    } catch (err) {
      console.error('Error loading recent workouts:', err);
      setError('Failed to load recent workouts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = (workout: Workout) => {
    Alert.alert(
      "Delete Workout",
      `Are you sure you want to delete "${workout.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              await deleteWorkout(workout.id);
              
              // Update the local state without making another API call
              setWorkouts(currentWorkouts => 
                currentWorkouts.filter(w => w.id !== workout.id)
              );
              
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderWorkoutItem = ({ item }: { item: Workout }) => {
    return (
      <View style={styles.workoutCardContainer}>
        <TouchableOpacity
          style={styles.workoutCard}
          onPress={() => router.push({
            pathname: '/workout/[id]',
            params: { id: item.id }
          })}
        >
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.done ? '#34C759' : '#FF9500' }]}>
              <Text style={styles.statusText}>{item.done ? 'Completed' : 'Planned'}</Text>
            </View>
          </View>
          
          <View style={styles.workoutDateRow}>
            <Clock size={16} color="#8E8E93" />
            <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
          </View>
          
          {item.calories_burned > 0 && (
            <Text style={styles.caloriesText}>
              Calories: {item.calories_burned}
            </Text>
          )}
          
          {item.exercises && item.exercises.length > 0 ? (
            <View style={styles.exercisesContainer}>
              <Text style={styles.exercisesHeader}>Exercises:</Text>
              <View style={styles.exercisesList}>
                {item.exercises.slice(0, 3).map((exercise, index) => (
                  <Text key={index} style={styles.exerciseItem}>
                    • {exercise.name} {exercise.sets ? `(${exercise.sets} sets)` : ''}
                  </Text>
                ))}
                {item.exercises.length > 3 && (
                  <Text style={styles.moreExercises}>
                    +{item.exercises.length - 3} more
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.noExercises}>No exercises recorded</Text>
          )}
          
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <ChevronRight size={16} color="#007AFF" />
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteWorkout(item)}
        >
          <Trash2 size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
        title: 'Recent Workouts',
        headerShown: true,
      }} />
      <SafeAreaView style={styles.container}>
        <FlatList
          data={workouts}
          renderItem={renderWorkoutItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recent workouts found</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => router.push('/workout/new')}
              >
                <Text style={styles.createButtonText}>Create a Workout</Text>
              </TouchableOpacity>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshing={loading}
          onRefresh={loadWorkoutsData}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  headerButton: {
    padding: 8,
  },
  workoutCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flex: 1,
  },
  deleteButton: {
    padding: 12,
    marginLeft: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  workoutDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  workoutDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
  },
  caloriesText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
    marginBottom: 10,
  },
  exercisesContainer: {
    marginTop: 8,
  },
  exercisesHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  exercisesList: {
    marginLeft: 4,
  },
  exerciseItem: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 4,
  },
  moreExercises: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  noExercises: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 8,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
