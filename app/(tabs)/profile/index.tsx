import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Settings, Award, Calendar, ChartBar as BarChart } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { getProfile, type Profile } from '@/utils/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (session?.user?.id) {
        loadProfile();
      }
    }, [session?.user?.id])
  );

  const loadProfile = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getProfile(session.user.id);
      // Ensure achievements and stats have default values
      setProfile({
        ...data,
        achievements: data.achievements || [],
        stats: data.stats || { workouts: 0, hours: 0, volume: 0 },
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
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
          onPress={loadProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.safeArea} />
      <View style={styles.header}>
        <Image
          source={{ 
            uri: profile.avatar_url || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
          }}
          style={styles.profileImage}
          onError={(e) => {
            console.log("Fehler beim Laden des Profilbilds:", profile.avatar_url);
            // If image failed to load, try to use default image
            if (e.nativeEvent.error && profile.avatar_url) {
              // Update the component state to use default image
              setProfile(prev => prev ? {...prev, avatar_url: null} : null);
            }
          }}
        />
        <Text style={styles.name}>{profile.full_name || 'Anonymous User'}</Text>
        <Text style={styles.bio}>{profile.bio || 'No bio yet'}</Text>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push('/profile/settings')}
        >
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
        <View style={styles.activityChart}>
          <BarChart size={24} color="#8E8E93" />
          <Text style={styles.chartLabel}>Activity data visualization would go here</Text>
        </View>
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
  safeArea: {
    height: 44,
    backgroundColor: '#FFFFFF',
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
});