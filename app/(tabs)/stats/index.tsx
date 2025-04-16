import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Search, ChartBar, TrendingUp, Dumbbell, ArrowRight, FolderIcon } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useSession } from '@/utils/auth';
import { ExerciseStats, getExerciseStatsFromWorkouts, getExerciseHistoryData } from '@/utils/stats';

const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

// Add volumeProgress to the interface
interface ExtendedExerciseStats extends ExerciseStats {
  volumeProgress?: number;
  totalReps?: number;
  progress?: number;
}

export default function StatsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exercises, setExercises] = useState<ExtendedExerciseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExercises = async () => {
    try {
      if (!session?.user?.id) return;
      
      setLoading(true);
      console.log('Fetching exercise stats for user:', session.user.id);
      const stats = await getExerciseStatsFromWorkouts(session.user.id);
      
      // Calculate progress for each exercise
      const statsWithProgress = await Promise.all(stats.map(async (exercise) => {
        const historyData = await getExerciseHistoryData(session.user.id, exercise.name);
        
        if (historyData && historyData.length >= 2) {
          const sortedData = historyData.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          const firstEntry = sortedData[0];
          const lastEntry = sortedData[sortedData.length - 1];
          
          if (exercise.totalVolume > 0) {
            // Für Übungen mit Gewicht: Berechne Volume Progress
            const volumeProgress = ((lastEntry.volume - firstEntry.volume) / firstEntry.volume) * 100;
            return {
              ...exercise,
              volumeProgress: Math.round(volumeProgress)
            };
          } else {
            // Für Übungen ohne Gewicht: Berechne Reps Progress
            const firstReps = firstEntry.totalReps || 0;
            const lastReps = lastEntry.totalReps || 0;
            const totalReps = sortedData.reduce((sum, entry) => sum + (entry.totalReps || 0), 0);
            
            const repsProgress = firstReps ? ((lastReps - firstReps) / firstReps) * 100 : 0;
            
            return {
              ...exercise,
              totalReps: totalReps, // Gesamtsumme aller Wiederholungen
              progress: Math.round(repsProgress)
            };
          }
        }
        
        return exercise;
      }));
      
      const sortedStats = statsWithProgress.sort((a, b) => {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
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

  useFocusEffect(
    useCallback(() => {
      console.log('Stats screen focused, refreshing data');
      loadExercises();
    }, [session?.user?.id])
  );

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || 
      (exercise.type && selectedCategory.toLowerCase() === exercise.type);
    return matchesSearch && matchesCategory;
  });

  const determineCategory = (name: string): string => {
    const exercise = exercises.find(e => e.name === name);
    if (exercise && exercise.type) {
      return exercise.type;
    }

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
              onPress={() => router.push(`/stats/${exercise.id}`)}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseCategory}>
                    {exercise.type?.charAt(0).toUpperCase() + 
                    exercise.type?.slice(1) || 'Other'}
                  </Text>
                </View>
                
                {exercise.totalSessions > 1 && 
                 (exercise.totalVolume > 0 ? exercise.volumeProgress : exercise.progress) !== 0 && (
                  <View style={[
                    styles.progressBadge,
                    (exercise.totalVolume > 0 ? exercise.volumeProgress : exercise.progress) > 0 
                      ? styles.progressPositive 
                      : styles.progressNegative
                  ]}>
                    <Text style={[
                      styles.progressText,
                      (exercise.totalVolume > 0 ? exercise.volumeProgress : exercise.progress) > 0 
                        ? styles.progressTextPositive 
                        : styles.progressTextNegative
                    ]}>
                      {(exercise.totalVolume > 0 ? exercise.volumeProgress : exercise.progress) > 0 ? '+' : ''}
                      {exercise.totalVolume > 0 ? exercise.volumeProgress : exercise.progress}%
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.statsGrid}>
                {exercise.totalVolume > 0 ? (
                  <>
                    <View style={styles.statItem}>
                      <TrendingUp size={20} color="#007AFF" />
                      <View>
                        <Text style={styles.statValue}>{exercise.maxWeight} kg</Text>
                        <Text style={styles.statLabel}>Max Weight</Text>
                      </View>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                      <ChartBar size={20} color="#007AFF" />
                      <View>
                        <Text style={styles.statValue}>{(exercise.totalVolume / 1000).toFixed(1)}k</Text>
                        <Text style={styles.statLabel}>Total Volume</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.statItem}>
                      <Dumbbell size={20} color="#007AFF" />
                      <View>
                        <Text style={styles.statValue}>{exercise.maxReps}</Text>
                        <Text style={styles.statLabel}>Max Reps</Text>
                      </View>
                    </View>

                    <View style={styles.statDivider} />

                    <View style={styles.statItem}>
                      <ChartBar size={20} color="#007AFF" />
                      <View>
                        <Text style={styles.statValue}>{exercise.totalReps || 0}</Text>
                        <Text style={styles.statLabel}>Total Reps</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity 
                style={styles.viewStatsButton}
                onPress={() => router.push(`/stats/${exercise.id}`)}
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