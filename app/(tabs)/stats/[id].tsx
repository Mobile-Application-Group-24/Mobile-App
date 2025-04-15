import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TrendingUp, ChartBar, Calendar, Dumbbell, ArrowLeft } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSession } from '@/utils/auth';
import { ExerciseStats, getExerciseStatsFromWorkouts, getExerciseHistoryData } from '@/utils/stats';
import { format, subMonths, subYears } from 'date-fns';

export default function ExerciseStatsScreen() {
  const { id, exerciseName, workoutId } = useLocalSearchParams(); // Add workoutId parameter
  const { session } = useSession();
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState({
    volume: { labels: [], data: [] },
    maxWeight: { labels: [], data: [] }
  });
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all'>('month');
  const [weightProgress, setWeightProgress] = useState<number>(0);
  const [volumeProgress, setVolumeProgress] = useState<number>(0);
  const [repsProgress, setRepsProgress] = useState<number>(0);

  const chartConfig = {
    backgroundColor: '#FFFFFF',
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#FFFFFF',
    },
  };

  const calculateProgress = (data: any[]) => {
    if (data.length < 2) return { weightProgress: 0, volumeProgress: 0, repsProgress: 0 };

    const firstEntry = data[0];
    const lastEntry = data[data.length - 1];

    const weightProgress = firstEntry.maxWeight ? 
      ((lastEntry.maxWeight - firstEntry.maxWeight) / firstEntry.maxWeight) * 100 : 0;
    const volumeProgress = ((lastEntry.volume - firstEntry.volume) / firstEntry.volume) * 100;
    const repsProgress = firstEntry.maxReps ? 
      ((lastEntry.maxReps - firstEntry.maxReps) / firstEntry.maxReps) * 100 : 0;

    return {
      weightProgress: Math.round(weightProgress),
      volumeProgress: Math.round(volumeProgress),
      repsProgress: Math.round(repsProgress)
    };
  };

  const filterDataByTime = (data: any[]) => {
    const now = new Date();
    return data.filter(entry => {
      const entryDate = new Date(entry.date);
      switch (timeFilter) {
        case 'month':
          return entryDate >= subMonths(now, 1);
        case 'year':
          return entryDate >= subYears(now, 1);
        default:
          return true;
      }
    });
  };

  useEffect(() => {
    async function loadExerciseData() {
      if (!session?.user?.id) return;
      
      try {
        setLoading(true);
        
        // If exerciseName is available from parameters, use it
        const nameToUse = exerciseName as string || '';
        
        let exerciseData: ExerciseStats | null = null;
        
        // Load all exercise statistics
        const stats = await getExerciseStatsFromWorkouts(session.user.id);
        
        // Search by ID or name (for custom exercises)
        if (nameToUse) {
          exerciseData = stats.find(ex => 
            ex.name.toLowerCase() === nameToUse.toLowerCase() || 
            ex.id === id
          ) || null;
        } else {
          exerciseData = stats.find(ex => ex.id === id) || null;
        }
        
        // If we still haven't found an exercise, create an empty placeholder entry
        if (!exerciseData && nameToUse) {
          exerciseData = {
            id: id as string || `exercise-${Date.now()}`,
            name: nameToUse,
            type: 'other',
            totalVolume: 0,
            maxWeight: 0,
            maxReps: 0,
            totalSessions: 0,
            lastUsed: new Date().toISOString(),
          };
        }
        
        if (!exerciseData) {
          setError('Exercise not found');
          setLoading(false);
          return;
        }
        
        setExercise(exerciseData);
        
        // If the exercise was found, load its history data
        const historyData = await getExerciseHistoryData(session.user.id, exerciseData.name);
        
        if (historyData && historyData.length > 0) {
          const filteredData = filterDataByTime(historyData);
          const progress = calculateProgress(filteredData);
          setWeightProgress(progress.weightProgress);
          setVolumeProgress(progress.volumeProgress);
          setRepsProgress(progress.repsProgress);

          // Sort by date in ascending order
          filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          // Format data for volume chart
          const volumeLabels = filteredData.map(entry => 
            format(new Date(entry.date), 'MMM d')
          );
          const volumeData = filteredData.map(entry => entry.volume);
          
          // Format data for maximum weight chart
          const maxWeightLabels = filteredData.map(entry => 
            format(new Date(entry.date), 'MMM d')
          );
          const maxWeightData = filteredData.map(entry => entry.maxWeight);
          
          setChartData({
            volume: { labels: volumeLabels, data: volumeData },
            maxWeight: { labels: maxWeightLabels, data: maxWeightData }
          });
        } else {
          // Fallback to sample data if no history is available
          const volumeData = [
            exerciseData.totalVolume * 0.3, 
            exerciseData.totalVolume * 0.5,
            exerciseData.totalVolume * 0.7, 
            exerciseData.totalVolume
          ];
          
          const weightData = [
            exerciseData.maxWeight * 0.7,
            exerciseData.maxWeight * 0.8,
            exerciseData.maxWeight * 0.9,
            exerciseData.maxWeight
          ];
          
          // Generate date labels for the past 4 months
          const dateLabels = Array(4).fill(0).map((_, i) => {
            const date = subMonths(new Date(), 3 - i);
            return format(date, 'MMM');
          });
          
          setChartData({
            volume: { 
              labels: dateLabels, 
              data: volumeData 
            },
            maxWeight: { 
              labels: dateLabels, 
              data: weightData 
            }
          });
        }
      } catch (err) {
        console.error('Error loading exercise data:', err);
        setError('Failed to load exercise data');
      } finally {
        setLoading(false);
      }
    }
    
    loadExerciseData();
  }, [id, exerciseName, session?.user?.id, timeFilter]);
  
  // Updated navigation handler to return to workout if workoutId is provided
  const handleBackNavigation = () => {
    if (workoutId) {
      // Navigate back to workout detail screen if workoutId is available
      router.push({
        pathname: '/workouts/[id]',
        params: { id: workoutId }
      });
    } else {
      // Default back behavior when not coming from a workout
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  if (error || !exercise) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error || 'Exercise not found'}</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackNavigation}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackNavigation}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseCategory}>{exercise.type}</Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            timeFilter === 'month' && styles.filterButtonActive
          ]}
          onPress={() => setTimeFilter('month')}
        >
          <Text style={[
            styles.filterButtonText,
            timeFilter === 'month' && styles.filterButtonTextActive
          ]}>Last Month</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            timeFilter === 'year' && styles.filterButtonActive
          ]}
          onPress={() => setTimeFilter('year')}
        >
          <Text style={[
            styles.filterButtonText,
            timeFilter === 'year' && styles.filterButtonTextActive
          ]}>Last Year</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            timeFilter === 'all' && styles.filterButtonActive
          ]}
          onPress={() => setTimeFilter('all')}
        >
          <Text style={[
            styles.filterButtonText,
            timeFilter === 'all' && styles.filterButtonTextActive
          ]}>All Time</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#007AFF" />
          <Text style={styles.statValue}>{exercise.maxWeight} kg</Text>
          <Text style={styles.statLabel}>Max Weight</Text>
          {weightProgress !== 0 && (
            <View style={[
              styles.progressBadge,
              weightProgress > 0 ? styles.progressPositive : styles.progressNegative
            ]}>
              <Text style={[
                styles.progressText,
                weightProgress > 0 ? styles.progressTextPositive : styles.progressTextNegative
              ]}>
                {weightProgress > 0 ? '+' : ''}{weightProgress}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statCard}>
          <ChartBar size={24} color="#007AFF" />
          <Text style={styles.statValue}>{(exercise.totalVolume / 1000).toFixed(1)}k</Text>
          <Text style={styles.statLabel}>Total Volume</Text>
          {volumeProgress !== 0 && (
            <View style={[
              styles.progressBadge,
              volumeProgress > 0 ? styles.progressPositive : styles.progressNegative
            ]}>
              <Text style={[
                styles.progressText,
                volumeProgress > 0 ? styles.progressTextPositive : styles.progressTextNegative
              ]}>
                {volumeProgress > 0 ? '+' : ''}{volumeProgress}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statCard}>
          <Dumbbell size={24} color="#007AFF" />
          <Text style={styles.statValue}>{exercise.maxReps}</Text>
          <Text style={styles.statLabel}>Max Reps</Text>
          {repsProgress !== 0 && (
            <View style={[
              styles.progressBadge,
              repsProgress > 0 ? styles.progressPositive : styles.progressNegative
            ]}>
              <Text style={[
                styles.progressText,
                repsProgress > 0 ? styles.progressTextPositive : styles.progressTextNegative
              ]}>
                {repsProgress > 0 ? '+' : ''}{repsProgress}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statCard}>
          <Calendar size={24} color="#007AFF" />
          <Text style={styles.statValue}>{exercise.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Volume Progress</Text>
        <LineChart
          data={{
            labels: chartData.volume.labels,
            datasets: [{ data: chartData.volume.data }],
          }}
          width={340}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          fromZero={true}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Max Weight Progress</Text>
        <LineChart
          data={{
            labels: chartData.maxWeight.labels,
            datasets: [{ data: chartData.maxWeight.data }],
          }}
          width={340}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=" kg"
          fromZero={true}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
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
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    flex: 1,
  },
  exerciseCategory: {
    fontSize: 14,
    color: '#8E8E93',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  filterContainer: {
    padding: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  progressBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPositive: {
    backgroundColor: '#E8FFF1',
  },
  progressNegative: {
    backgroundColor: '#FFF2F2',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTextPositive: {
    color: '#34C759',
  },
  progressTextNegative: {
    color: '#FF3B30',
  },
});