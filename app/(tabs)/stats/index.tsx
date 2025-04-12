import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ChartBar, TrendingUp, Dumbbell, ArrowRight } from 'lucide-react-native';

// Dummy data - replace with real data later
const exercises = [
  {
    id: '1',
    name: 'Bench Press',
    category: 'Chest',
    maxWeight: 100,
    totalVolume: 15000,
    progress: 5,
  },
  {
    id: '2',
    name: 'Squat',
    category: 'Legs',
    maxWeight: 120,
    totalVolume: 18000,
    progress: -2,
  },
  {
    id: '3',
    name: 'Deadlift',
    category: 'Back',
    maxWeight: 140,
    totalVolume: 20000,
    progress: 8,
  },
  // Add more exercises...
];

const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export default function StatsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
                <Text style={styles.exerciseCategory}>{exercise.category}</Text>
              </View>
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
            </View>

            <View style={styles.statsGrid}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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