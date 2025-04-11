import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, StatusBar, SafeAreaView, Platform } from 'react-native';
import { Settings, Award, Calendar, ChartBar as BarChart, Clock } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { getProfile, type Profile, getRecentWorkouts, type Workout } from '@/utils/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (session?.user?.id) {
        loadProfileData();
      }
    }, [session?.user?.id])
  );

  const loadProfileData = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const [profileData, workoutsData] = await Promise.all([
        getProfile(session.user.id),
        getRecentWorkouts(session.user.id, 3)
      ]);
      
      setProfile({
        ...profileData,
        achievements: profileData.achievements || [],
        stats: profileData.stats || { workouts: 0, hours: 0, volume: 0 },
      });
      
      setRecentWorkouts(workoutsData.slice(0, 3));
    } catch (err) {
      console.error('Error loading profile data:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadProfileData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={Platform.OS === 'android'} 
      />
      <SafeAreaView style={[styles.safeAreaTop, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]} />
      <ScrollView style={styles.container}>
        <View style={[styles.header, Platform.OS === 'android' && { paddingTop: 20 }]}>
          <Image
            source={{ 
              uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
            }}
            style={styles.profileImage}
          />
          <Text style={styles.name}>{profile.full_name || 'Anonymous User'}</Text>
          <Text style={styles.bio}>{profile.bio || 'No bio yet'}</Text>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/profile/settings')}
            activeOpacity={0.7}>
            <Settings size={20} color="#007AFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats?.workouts || 0}</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats?.hours || 0}</Text>
            <Text style={styles.statLabel}>Hours</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {((profile.stats?.volume || 0) / 1000).toFixed(1)}k
            </Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Achievements</Text>
          </View>
          {!profile.achievements?.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No achievements yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Complete workouts to earn achievements
              </Text>
            </View>
          ) : (
            profile.achievements.map((achievement, index) => (
              <View key={index} style={styles.achievementCard}>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
                {achievement.date_earned && (
                  <Text style={styles.achievementDate}>
                    Earned on {new Date(achievement.date_earned).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={24} color="#007AFF" />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          
          {recentWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent workouts</Text>
              <Text style={styles.emptyStateSubtext}>
                Your most recent workouts will appear here
              </Text>
            </View>
          ) : (
            recentWorkouts.map((workout) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutTitle} numberOfLines={1}>
                    {workout.title}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: workout.done ? '#34C759' : '#FF9500' }]}>
                    <Text style={styles.statusText}>{workout.done ? 'Completed' : 'Planned'}</Text>
                  </View>
                </View>
                
                <View style={styles.workoutInfo}>
                  <View style={styles.workoutDetail}>
                    <Clock size={16} color="#8E8E93" />
                    <Text style={styles.workoutDetailText}>{formatDate(workout.date)}</Text>
                  </View>
                  
                  {workout.calories_burned > 0 && (
                    <Text style={styles.caloriesText}>
                      {workout.calories_burned} cal
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bio: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  editButtonText: {
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  achievementCard: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  activityChart: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  chartLabel: {
    marginTop: 8,
    color: '#8E8E93',
    fontSize: 14,
  },
  // New styles for workout cards
  workoutCard: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 16,
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
  workoutInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutDetailText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  caloriesText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  workoutNotes: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});