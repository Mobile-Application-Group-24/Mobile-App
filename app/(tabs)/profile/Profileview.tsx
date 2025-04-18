import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, StatusBar, SafeAreaView } from 'react-native';
import { ArrowLeft, Award, Calendar, ChartBar as BarChart, Clock, Flame, Users } from 'lucide-react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { getProfile, type Profile, getRecentWorkouts, type Workout } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function ViewProfileScreen() {
  const { userId, groupId } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  const getCurrentUserId = () => {
    if (!userId || (userId === 'undefined' && !groupId)) {
      return session?.user?.id;
    }
    return userId as string;
  };

  useEffect(() => {
    const currentUserId = getCurrentUserId();
    
    if (currentUserId) {
      setIsOwnProfile(currentUserId === session?.user?.id);
      loadProfile(currentUserId);
    }
  }, [userId, session, groupId]);

  const loadProfile = async (profileId: string) => {
    if (!profileId) return;

    try {
      setLoading(true);
      setError(null);
      const [data, workoutsData] = await Promise.all([
        getProfile(profileId),
        getRecentWorkouts(profileId, 3)
      ]);
      
      setProfile({
        ...data,
        achievements: data.achievements || [],
        stats: data.stats || { workouts: 0, hours: 0, volume: 0 },
      });
      
      setRecentWorkouts(workoutsData.slice(0, 3));
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
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

  const handleBackNavigation = () => {
    if (isOwnProfile && !groupId) {
      return;
    }
    
    if (groupId) {
      router.push(`/groups/${groupId}`);
    } else {
      router.back();
    }
  };

  const retryLoading = () => {
    loadProfile(getCurrentUserId());
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
          onPress={retryLoading}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
        title: '' 
      }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeAreaTop} />
      
      <View style={styles.navigationHeader}>
        {(!isOwnProfile || groupId) && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackNavigation}
          >
            <ArrowLeft size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.navTitle}>
          {isOwnProfile && !groupId ? "My Profile" : "Profile"}
        </Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={{ 
              uri: profile.avatar_url || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
            }}
            style={styles.profileImage}
            onError={(e) => {
              console.log("Fehler beim Laden des Profilbilds:", profile.avatar_url);
              if (e.nativeEvent.error && profile.avatar_url) {
                setProfile(prev => prev ? {...prev, avatar_url: null} : null);
              }
            }}
          />
          <Text style={styles.name}>{profile.full_name || 'Anonymous User'}</Text>
          <Text style={styles.bio}>{profile.bio || 'No bio yet'}</Text>
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
                This user hasn't earned any achievements
              </Text>
            </View>
          ) : (
            profile.achievements.slice(0, 3).map((achievement, index) => (
              <View key={index} style={styles.achievementCard}>
                <View style={styles.achievementHeader}>
                  <Award size={20} color="#007AFF" />
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                </View>
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
                This user hasn't recorded any workouts yet
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
                
                {workout.notes && (
                  <Text style={styles.workoutNotes} numberOfLines={2}>
                    {workout.notes}
                  </Text>
                )}
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
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
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
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  }
});
