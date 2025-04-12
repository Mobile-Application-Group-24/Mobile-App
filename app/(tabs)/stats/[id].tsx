import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { TrendingUp, ChartBar, Dumbbell, Calendar } from 'lucide-react-native';

// Dummy data - replace with real data later
const exerciseData = {
  '1': {
    name: 'Bench Press',
    category: 'Chest',
    history: {
      volume: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [2000, 2200, 2400, 2300, 2600, 2800],
      },
      maxWeight: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [80, 85, 87, 85, 90, 92],
      },
    },
    stats: {
      maxWeight: 92,
      totalVolume: 28000,
      totalSessions: 24,
      averageReps: 8,
    },
  },
  // Add more exercises...
};

export default function ExerciseStatsScreen() {
  const { id } = useLocalSearchParams();
  const exercise = exerciseData[id as keyof typeof exerciseData];

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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseCategory}>{exercise.category}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#007AFF" />
          <Text style={styles.statValue}>{exercise.stats.maxWeight} kg</Text>
          <Text style={styles.statLabel}>Max Weight</Text>
        </View>

        <View style={styles.statCard}>
          <ChartBar size={24} color="#007AFF" />
          <Text style={styles.statValue}>{(exercise.stats.totalVolume / 1000).toFixed(1)}k</Text>
          <Text style={styles.statLabel}>Total Volume</Text>
        </View>

        <View style={styles.statCard}>
          <Dumbbell size={24} color="#007AFF" />
          <Text style={styles.statValue}>{exercise.stats.averageReps}</Text>
          <Text style={styles.statLabel}>Avg Reps</Text>
        </View>

        <View style={styles.statCard}>
          <Calendar size={24} color="#007AFF" />
          <Text style={styles.statValue}>{exercise.stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Volume Progress</Text>
        <LineChart
          data={{
            labels: exercise.history.volume.labels,
            datasets: [{ data: exercise.history.volume.data }],
          }}
          width={340}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Max Weight Progress</Text>
        <LineChart
          data={{
            labels: exercise.history.maxWeight.labels,
            datasets: [{ data: exercise.history.maxWeight.data }],
          }}
          width={340}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
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
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseCategory: {
    fontSize: 16,
    color: '#8E8E93',
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
});