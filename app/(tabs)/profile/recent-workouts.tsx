import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, Platform, StatusBar } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Clock, ChevronRight, Dumbbell, Flame, Calendar, Plus, Trash2, ArrowLeft } from 'lucide-react-native';
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
      const workoutsData = await getRecentWorkouts(session.user.id, 30);
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
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteWorkout(workout.id);
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
      day: 'numeric'
    });
  };

  const renderWorkoutItem = ({ item }: { item: Workout }) => (
    <View style={styles.workoutCard}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Dumbbell size={20} color="#007AFF" />
          <Text style={styles.workoutTitle}>{item.title}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.done ? '#E8FFF1' : '#FFF9E6' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.done ? '#34C759' : '#FFB100' }
          ]}>
            {item.done ? 'Completed' : 'Planned'}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Calendar size={16} color="#8E8E93" />
          <Text style={styles.statText}>{formatDate(item.date)}</Text>
        </View>

        {item.calories_burned > 0 && (
          <View style={styles.statItem}>
            <Flame size={16} color="#FF9500" />
            <Text style={[styles.statText, { color: '#FF9500' }]}>
              {item.calories_burned} cal
            </Text>
          </View>
        )}
      </View>

      {item.exercises && item.exercises.length > 0 && (
        <View style={styles.exercisesContainer}>
          {item.exercises.slice(0, 3).map((exercise, index) => (
            <View key={index} style={styles.exerciseItem}>
              <View style={styles.exerciseDot} />
              <Text style={styles.exerciseName}>
                {exercise.name}
                {exercise.sets && (
                  <Text style={styles.exerciseDetail}>
                    {' '}· {exercise.sets} sets
                  </Text>
                )}
              </Text>
            </View>
          ))}
          {item.exercises.length > 3 && (
            <Text style={styles.moreExercises}>
              +{item.exercises.length - 3} more exercises
            </Text>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteWorkout(item)}
        >
          <Trash2 size={18} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => router.push({
            pathname: '/workout/[id]',
            params: { id: item.id }
          })}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <ChevronRight size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ArrowLeft size={24} color="#007AFF" onPress={() => router.back()} />
          <Text style={styles.sectionTitle}>Recent Activities</Text>
        </View>
      </View>
      
      <FlatList
        data={workouts}
        renderItem={renderWorkoutItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Dumbbell size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Workouts Yet</Text>
            <Text style={styles.emptyText}>
              Start tracking your fitness journey by creating your first workout
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/workout/new')}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Workout</Text>
            </TouchableOpacity>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading}
        onRefresh={loadWorkoutsData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  workoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  exercisesContainer: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
  },
  exerciseName: {
    fontSize: 14,
    color: '#000000',
  },
  exerciseDetail: {
    color: '#8E8E93',
  },
  moreExercises: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 4,
  },
  separator: {
    height: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});