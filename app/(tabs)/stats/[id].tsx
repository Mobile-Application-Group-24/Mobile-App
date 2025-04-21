import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, usePathname } from 'expo-router';
import { TrendingUp, ChartBar, Calendar, Dumbbell, ArrowLeft } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { useSession } from '@/utils/auth';
import { ExerciseStats, getExerciseStatsFromWorkouts, getExerciseHistoryData } from '@/utils/stats';
import { format, subMonths, subYears } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

let bool = false;

interface ChartData {
  volume: { labels: string[], data: number[] },
  maxWeight: { labels: string[], data: number[] },
  bestSetVolume: { labels: string[], data: number[] }
}

const calculateSetVolume = (set: any) => {
  const weight = parseFloat(set.weight) || 0;
  const reps = parseInt(set.reps) || 0;
  return weight * reps;
};

const determineYAxisRange = (data: number[]) => {
  if (data.length === 0) return { yMin: 0, yMax: 100 };
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  bool = false;
  
  if (min === max) {
    bool = true;
    const value = min;
    const range = Math.max(value * 0.6, 20); 
    const paddingBottom = range / 3; 
    const paddingTop = range / 1.5; 
    
    
    return {
      yMin: Math.max(0, value - paddingBottom),
      yMax: value + paddingTop

    };
  }
  
  
  const range = max - min;
  const padding = range * 0.1; 
  const bottomPadding = range * 0.2; 
  
  return {
    yMin: Math.max(0, min - bottomPadding),
    yMax: max + padding
  };
};

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
  formatYLabel: (value) => Math.round(parseFloat(value)).toString(),
  paddingRight: 32,
  paddingLeft: 16,
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: 'rgba(0, 0, 0, 0.1)', 
    strokeDasharray: [] 
  }
};

const weightChartConfig = {
  ...chartConfig,
  decimalPlaces: 1, 
  formatYLabel: (value: string) => parseFloat(value).toFixed(1), 
};

const calculateProgress = (data: any[], isBodyweightExercise: boolean = false) => {
  if (data.length < 2) return { weightProgress: 0, volumeProgress: 0, repsProgress: 0 };

  
  const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
 
  const firstEntry = sortedData[0];
  const lastEntry = sortedData[sortedData.length - 1];

  if (isBodyweightExercise) {
    const repsProgress = firstEntry.bestSetReps ? 
      ((lastEntry.bestSetReps - firstEntry.bestSetReps) / firstEntry.bestSetReps) * 100 : 0;
    return {
      weightProgress: 0,
      volumeProgress: 0,
      repsProgress: Math.round(repsProgress)
    };
  }

  const weightProgress = firstEntry.maxWeight ? 
    ((lastEntry.maxWeight - firstEntry.maxWeight) / firstEntry.maxWeight) * 100 : 0;
  const volumeProgress = firstEntry.volume ? 
    ((lastEntry.volume - firstEntry.volume) / firstEntry.volume) * 100 : 0;
  const repsProgress = firstEntry.maxReps ? 
    ((lastEntry.maxReps - firstEntry.maxReps) / firstEntry.maxReps) * 100 : 0;

  return {
    weightProgress: Math.round(weightProgress),
    volumeProgress: Math.round(volumeProgress),
    repsProgress: Math.round(repsProgress)
  };
};

export default function ExerciseStatsScreen() {
  const { id, exerciseName, workoutId, returnPath } = useLocalSearchParams();
  const { session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useNavigation();
  const [exercise, setExercise] = useState<ExerciseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData>({
    volume: { labels: [], data: [] },
    maxWeight: { labels: [], data: [] },
    bestSetVolume: { labels: [], data: [] }
  });
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all' | 'custom'>('month');
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({ startDate: null, endDate: null });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [weightProgress, setWeightProgress] = useState<number>(0);
  const [volumeProgress, setVolumeProgress] = useState<number>(0);
  const [repsProgress, setRepsProgress] = useState<number>(0);

  const filterDataByTime = (data: any[]) => {
    const now = new Date();
    return data.filter(entry => {
      const entryDate = new Date(entry.date);
      switch (timeFilter) {
        case 'month':
          return entryDate >= subMonths(now, 1);
        case 'year':
          return entryDate >= subYears(now, 1);
        case 'custom':
          if (customDateRange.startDate && customDateRange.endDate) {
            const start = new Date(customDateRange.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customDateRange.endDate);
            end.setHours(23, 59, 59, 999);
            return entryDate >= start && entryDate <= end;
          }
          return true;
        case 'all':
          return true;
        default:
          return true;
      }
    });
  };

  const loadExerciseData = async () => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      
      const nameToUse = exerciseName as string || '';
      let exerciseData: ExerciseStats | null = null;
      
      const stats = await getExerciseStatsFromWorkouts(session.user.id);
      
      if (nameToUse) {
        exerciseData = stats.find(ex => 
          ex.name.toLowerCase() === nameToUse.toLowerCase() || 
          ex.id === id
        ) || null;
      } else {
        exerciseData = stats.find(ex => ex.id === id) || null;
      }
      
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
      
      const historyData = await getExerciseHistoryData(session.user.id, exerciseData.name);
      
      if (historyData && historyData.length > 0) {
        const filteredData = filterDataByTime(historyData);
        filteredData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const labels = filteredData.map(entry => format(new Date(entry.date), 'MMM d'));

        if (!exerciseData.totalVolume) {
          setChartData({
            volume: { 
              labels, 
              data: filteredData.map(entry => entry.totalReps || 0)
            },
            maxWeight: { 
              labels, 
              data: filteredData.map(entry => entry.bestSetReps || 0)
            },
            bestSetVolume: { labels, data: [] }
          });

          if (exerciseData) {
            exerciseData.maxReps = Math.max(...filteredData.map(entry => entry.bestSetReps || 0));
            setExercise(exerciseData);
          }
        } else {
          setChartData({
            volume: { 
              labels, 
              data: filteredData.map(entry => entry.volume || 0)
            },
            maxWeight: { 
              labels, 
              data: filteredData.map(entry => entry.maxWeight || 0)
            },
            bestSetVolume: { 
              labels,
              data: filteredData.map(entry => entry.maxSetVolume || 0)
            }
          });
        }

        const progress = calculateProgress(filteredData, !exerciseData.totalVolume);
        setWeightProgress(progress.weightProgress);
        setVolumeProgress(progress.volumeProgress);
        setRepsProgress(progress.repsProgress);
      } else {
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
          },
          bestSetVolume: { 
            labels: dateLabels, 
            data: [0, 0, 0, 0] 
          }
        });
      }
    } catch (err) {
      console.error('Error loading exercise data:', err);
      setError('Failed to load exercise data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      if (pathname?.includes('/stats/')) {
        e.preventDefault();
        if (workoutId) {
          const path = returnPath 
            ? returnPath.toString() 
            : `/workouts/${workoutId}`;
          
          router.push(path);
        } else {
          router.replace('/(tabs)/stats/');
        }
      }
    });

    return unsubscribe;
  }, [navigation, router, pathname, workoutId, returnPath]);

  useEffect(() => {
    if (workoutId && navigation.setOptions) {
      navigation.setOptions({
        headerShown: true,
        headerLeft: () => null,
        headerTitle: '',
        headerStyle: {
          height: Platform.OS === 'android' ? 60 : 44,
          backgroundColor: '#FFFFFF',
        },
        headerShadowVisible: false
      });
    }
  }, [navigation, workoutId]);

  useEffect(() => {
    if (timeFilter !== 'custom' || (customDateRange.startDate && customDateRange.endDate)) {
      loadExerciseData();
    }
  }, [id, exerciseName, session?.user?.id, timeFilter]);

  useEffect(() => {
    if (timeFilter === 'custom' && customDateRange.startDate && customDateRange.endDate) {
      loadExerciseData();
    }
  }, [customDateRange.startDate, customDateRange.endDate]);

  const handleDateChange = (selectedDate: Date | undefined) => {
    setIsDatePickerVisible(false);
    if (selectedDate) {
      if (datePickerMode === 'start') {
        setCustomDateRange(prev => ({ ...prev, startDate: selectedDate }));
        setDatePickerMode('end');
        setIsDatePickerVisible(true);
      } else {
        setCustomDateRange(prev => ({ ...prev, endDate: selectedDate }));
      }
    }
  };

  const handleBackNavigation = () => {
    if (workoutId) {
      const path = returnPath 
        ? returnPath.toString() 
        : `/workouts/${workoutId}`;
      
      router.push(path);
    } else {
      router.push('/(tabs)/stats/');
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

  const hasVolume = exercise.totalVolume > 0;

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
          ]}>Month</Text>
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
          ]}>Year</Text>
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
          ]}>Alltime</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            timeFilter === 'custom' && styles.filterButtonActive
          ]}
          onPress={() => {
            setTimeFilter('custom');
            setDatePickerMode('start');
            setIsDatePickerVisible(true);
          }}
        >
          <Text style={[
            styles.filterButtonText,
            timeFilter === 'custom' && styles.filterButtonTextActive
          ]}>
            {customDateRange.startDate ? 
              format(customDateRange.startDate, 'MMM d') + ' - ' + 
              (customDateRange.endDate ? format(customDateRange.endDate, 'MMM d') : '...') 
              : 'Custom'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {isDatePickerVisible && (
        <DateTimePicker
          value={datePickerMode === 'start' ? 
            customDateRange.startDate || new Date() : 
            customDateRange.endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => handleDateChange(selectedDate || undefined)}
        />
      )}

      <View style={styles.statsGrid}>
        {hasVolume ? (
          <>
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
          </>
        ) : (
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
        )}

        <View style={styles.statCard}>
          <Calendar size={24} color="#007AFF" />
          <Text style={styles.statValue}>{exercise.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      {hasVolume ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Volume Progress</Text>
            <LineChart
              data={{
                labels: chartData.volume.labels,
                datasets: [{ data: chartData.volume.data }],
              }}
              width={330}
              height={220}
              chartConfig={{
                ...chartConfig,
                propsForBackgroundLines: {
                  strokeWidth: 1,
                  stroke: 'rgba(0, 0, 0, 0.1)',
                  strokeDasharray: []
                },
              }}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" kg"
              
              segments={5}
              withInnerLines={true}
              getDotColor={() => '#007AFF'}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              yAxisInterval={1}
              horizontalLabelRotation={0}
            
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Max Weight Progress</Text>
            <LineChart
              data={{
                labels: chartData.maxWeight.labels,
                datasets: [{ data: chartData.maxWeight.data }],
              }}
              width={330}
              height={220}
              chartConfig={weightChartConfig} 
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" kg"
              fromZero={bool}
              segments={5}
              withInnerLines={true}
              getDotColor={() => '#007AFF'}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              yAxisInterval={10}
              horizontalLabelRotation={0}
              
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Best Set Volume Progress</Text>
            <LineChart
              data={{
                labels: chartData.bestSetVolume.labels,
                datasets: [{ data: chartData.bestSetVolume.data }],
              }}
              width={330}
              height={220}
              chartConfig={{
                ...chartConfig,
                propsForBackgroundLines: {
                  strokeWidth: 1,
                  stroke: 'rgba(0, 0, 0, 0.1)',
                  strokeDasharray: []
                },
              }}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" kg"
              fromZero={bool}
              segments={5}
              withInnerLines={true}
              getDotColor={() => '#007AFF'}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              yAxisInterval={1}
              horizontalLabelRotation={0}
              
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Total Repetitions Progress</Text>
            <LineChart
              data={{
                labels: chartData.volume.labels,
                datasets: [{ data: chartData.volume.data }],
              }}
              width={330}
              height={220}
              chartConfig={{
                ...chartConfig,
                propsForBackgroundLines: {
                  strokeWidth: 1,
                  stroke: 'rgba(0, 0, 0, 0.1)',
                  strokeDasharray: []
                },
              }}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" reps"
              fromZero={false}
              segments={5}
              withInnerLines={true}
              getDotColor={() => '#007AFF'}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              yAxisInterval={1}
              horizontalLabelRotation={0}
             
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Best Set Repetitions</Text>
            <LineChart
              data={{
                labels: chartData.maxWeight.labels,
                datasets: [{ data: chartData.maxWeight.data }],
              }}
              width={330}
              height={220}
              chartConfig={{
                ...chartConfig,
                propsForBackgroundLines: {
                  strokeWidth: 1,
                  stroke: 'rgba(0, 0, 0, 0.1)',
                  strokeDasharray: []
                },
              }}
              bezier
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=" reps"
              fromZero={false}
              segments={5}
              withInnerLines={true}
              getDotColor={() => '#007AFF'}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              yAxisInterval={1}
              horizontalLabelRotation={0}
              
            />
          </View>
        </>
      )}
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
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    marginHorizontal: -8,
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    minWidth: 70,
    width: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 13,
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
  customFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: '100%',
  },
});