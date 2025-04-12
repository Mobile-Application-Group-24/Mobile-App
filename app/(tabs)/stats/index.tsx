import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ChartBar, TrendingUp, Dumbbell, ArrowRight, FolderIcon } from 'lucide-react-native';
import { getExerciseStats, ExerciseStats } from '@/utils/supabase';
import { useSession } from '@/utils/auth';

const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export default function StatsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exercises, setExercises] = useState<ExerciseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        if (!session?.user?.id) return;
        
        setLoading(true);
        const stats = await getExerciseStats(session.user.id);
        
        // Sort by last used date (most recent first)
        const sortedStats = stats.sort((a, b) => {
          return new Date(b.last_used).getTime() - new Date(a.last_used).getTime();
        });
        
        setExercises(sortedStats);
        setError(null);
      } catch (err) {
        console.error('Error loading exercise stats:', err);
        setError('Failed to load exercise statistics');
      } finally {
        setLoading(false);
      }
    };

    loadExercises();
  }, [session?.user?.id]);

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.exercise_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || 
      (exercise.exercise_name && selectedCategory.toLowerCase() === determineCategory(exercise.exercise_name));
    return matchesSearch && matchesCategory;
  });

  // Helper function to determine the category of an exercise based on its name
  const determineCategory = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('bench') || lowerName.includes('chest') || lowerName.includes('fly') || 
        (lowerName.includes('press') && !lowerName.includes('shoulder'))) {
      return 'chest';
    } else if (lowerName.includes('row') || lowerName.includes('pull') || 
              lowerName.includes('deadlift') || lowerName.includes('back')) {
      return 'back';
    } else if (lowerName.includes('squat') || lowerName.includes('leg') || 
              lowerName.includes('lunge') || lowerName.includes('calf')) {
      return 'legs';
    } else if (lowerName.includes('shoulder') || lowerName.includes('delt') || 
              lowerName.includes('military')) {
      return 'shoulders';
    } else if (lowerName.includes('curl') || lowerName.includes('tricep') || 
              lowerName.includes('extension')) {
      return 'arms';
    } else if (lowerName.includes('ab') || lowerName.includes('crunch') || 
              lowerName.includes('plank') || lowerName.includes('core')) {
      return 'core';
    }
    return 'other';
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <FolderIcon size={56} color="#8E8E93" />
        <Text style={styles.emptyStateTitle}>No exercise data yet</Text>
        <Text style={styles.emptyStateText}>
          Complete workouts to track your exercise statistics
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.safeArea} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exercise Statistics</Text>
        <Text style={styles.headerSubtitle}>Track your progress over time</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises..."
            placeholderTextColor="#8E8E93"
          />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category && styles.categoryButtonTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredExercises.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={styles.exercisesContainer}>
          {filteredExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => router.push(`/stats/${exercise.exercise_id}`)}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.exercise_name}</Text>
                  <Text style={styles.exerciseCategory}>
                    {determineCategory(exercise.exercise_name).charAt(0).toUpperCase() + 
                    determineCategory(exercise.exercise_name).slice(1)}
                  </Text>
                </View>
                
                {/* Only show progress if we have enough data (at least 2 sessions) */}
                {exercise.total_sessions > 1 && exercise.progress !== undefined && (
                  <View style={[
                    styles.progressBadge,
                    exercise.progress > 0 ? styles.progressPositive : styles.progressNegative
                  ]}>
                    <Text style={[
                      styles.progressText,
                      exercise.progress > 0 ? styles.progressTextPositive : styles.progressTextNegative
                    ]}>
                      {exercise.progress > 0 ? '+' : ''}{exercise.progress}%
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <TrendingUp size={20} color="#007AFF" />
                  <View>
                    <Text style={styles.statValue}>{exercise.max_weight} kg</Text>
                    <Text style={styles.statLabel}>Max Weight</Text>
                  </View>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                  <ChartBar size={20} color="#007AFF" />
                  <View>
                    <Text style={styles.statValue}>{(exercise.total_volume / 1000).toFixed(1)}k</Text>
                    <Text style={styles.statLabel}>Total Volume</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.viewStatsButton}
                onPress={() => router.push(`/stats/${exercise.exercise_id}`)}
              >
                <Text style={styles.viewStatsText}>View Statistics</Text>
                <ArrowRight size={20} color="#007AFF" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#3C3C43',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeArea: {
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000000',
  },
  categoriesContainer: {
    padding: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  exercisesContainer: {
    padding: 16,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#8E8E93',
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressPositive: {
    backgroundColor: '#E8FFF1',
  },
  progressNegative: {
    backgroundColor: '#FFF2F2',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressTextPositive: {
    color: '#34C759',
  },
  progressTextNegative: {
    color: '#FF3B30',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  viewStatsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});