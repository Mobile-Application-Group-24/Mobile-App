import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, SafeAreaView, Platform } from 'react-native';
import { Award, Dumbbell, Flame, Timer, Target, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { getProfile, type Profile } from '@/utils/supabase';

type AchievementType = 'overall' | 'exercise' | 'volume' | 'workouts' | 'hours';

interface EnhancedAchievement {
  title: string;
  description: string;
  date_earned?: string;
  type: AchievementType;
  exercise_name?: string;
  icon_color?: string;
  icon?: React.ReactNode;
}

export default function AllAchievementsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [achievements, setAchievements] = useState<EnhancedAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      loadAchievements();
    }
  }, [session?.user?.id]);

  const loadAchievements = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const profileData = await getProfile(session.user.id);
      
      const enhancedAchievements: EnhancedAchievement[] = [];
      
      if (profileData.achievements && profileData.achievements.length > 0) {
        profileData.achievements.forEach(achievement => {
          enhancedAchievements.push({
            ...achievement,
            type: 'overall',
            icon_color: '#007AFF',
            icon: <Award size={20} color="#007AFF" />
          });
        });
      }
      
      const volume = profileData.stats?.volume || 0;
      const volumeAchievements = generateVolumeAchievements(volume);
      enhancedAchievements.push(...volumeAchievements);
      
      const workouts = profileData.stats?.workouts || 0;
      const workoutAchievements = generateWorkoutAchievements(workouts);
      enhancedAchievements.push(...workoutAchievements);
      
      const hours = profileData.stats?.hours || 0;
      const hourAchievements = generateHourAchievements(hours);
      enhancedAchievements.push(...hourAchievements);
      
      if (profileData.exercise_stats) {
        const exerciseAchievements = generateExerciseAchievements(profileData.exercise_stats);
        enhancedAchievements.push(...exerciseAchievements);
      }
      
      setAchievements(enhancedAchievements);
      
    } catch (err) {
      console.error('Error loading achievements:', err);
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const generateVolumeAchievements = (volume: number): EnhancedAchievement[] => {
    const achievements: EnhancedAchievement[] = [];
    const iconColor = '#FF9500';
    
    const volumeThresholds = [
      { threshold: 1000, title: 'Volume Beginner', description: 'Lifted over 1,000 kg in total' },
      { threshold: 5000, title: 'Volume Enthusiast', description: 'Lifted over 5,000 kg in total' },
      { threshold: 10000, title: 'Volume Pro', description: 'Lifted over 10,000 kg in total' },
      { threshold: 25000, title: 'Volume Master', description: 'Lifted over 25,000 kg in total' },
      { threshold: 50000, title: 'Volume Legend', description: 'Lifted over 50,000 kg in total' },
    ];
    
    volumeThresholds.forEach(({ threshold, title, description }) => {
      if (volume >= threshold) {
        achievements.push({
          title,
          description,
          date_earned: new Date().toISOString(),
          type: 'volume',
          icon_color: iconColor,
          icon: <Dumbbell size={20} color={iconColor} />
        });
      }
    });
    
    return achievements;
  };
  
  const generateWorkoutAchievements = (workouts: number): EnhancedAchievement[] => {
    const achievements: EnhancedAchievement[] = [];
    const iconColor = '#34C759';
    
    const workoutThresholds = [
      { threshold: 5, title: 'Workout Beginner', description: 'Completed 5 workouts' },
      { threshold: 10, title: 'Workout Regular', description: 'Completed 10 workouts' },
      { threshold: 25, title: 'Workout Enthusiast', description: 'Completed 25 workouts' },
      { threshold: 50, title: 'Workout Pro', description: 'Completed 50 workouts' },
      { threshold: 100, title: 'Workout Master', description: 'Completed 100 workouts' },
    ];
    
    workoutThresholds.forEach(({ threshold, title, description }) => {
      if (workouts >= threshold) {
        achievements.push({
          title,
          description,
          date_earned: new Date().toISOString(), 
          type: 'workouts',
          icon_color: iconColor,
          icon: <Flame size={20} color={iconColor} />
        });
      }
    });
    
    return achievements;
  };
  
  const generateHourAchievements = (hours: number): EnhancedAchievement[] => {
    const achievements: EnhancedAchievement[] = [];
    const iconColor = '#5856D6';
    
    const hourThresholds = [
      { threshold: 5, title: 'Time Beginner', description: 'Spent 5 hours working out' },
      { threshold: 10, title: 'Time Regular', description: 'Spent 10 hours working out' },
      { threshold: 25, title: 'Time Enthusiast', description: 'Spent 25 hours working out' },
      { threshold: 50, title: 'Time Pro', description: 'Spent 50 hours working out' },
      { threshold: 100, title: 'Time Master', description: 'Spent 100 hours working out' },
    ];
    
    hourThresholds.forEach(({ threshold, title, description }) => {
      if (hours >= threshold) {
        achievements.push({
          title,
          description,
          date_earned: new Date().toISOString(), 
          type: 'hours',
          icon_color: iconColor,
          icon: <Timer size={20} color={iconColor} />
        });
      }
    });
    
    return achievements;
  };

  const generateExerciseAchievements = (exerciseStats: any[]): EnhancedAchievement[] => {
    const achievements: EnhancedAchievement[] = [];
    
    exerciseStats.forEach(stat => {
      const exerciseName = stat.exercise_name || 'Unknown Exercise';
      const iconColor = getRandomColor();
      
      achievements.push({
        title: `${exerciseName} Master`,
        description: `Completed ${exerciseName} multiple times with great form`,
        date_earned: new Date().toISOString(),
        type: 'exercise',
        exercise_name: exerciseName,
        icon_color: iconColor,
        icon: <Target size={20} color={iconColor} />
      });
    });
    
    return achievements;
  };

  const getRandomColor = () => {
    const colors = ['#FF9500', '#34C759', '#5856D6', '#FF2D55', '#AF52DE'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const overallAchievements = achievements.filter(a => a.type === 'overall');
  const exerciseAchievements = achievements.filter(a => a.type === 'exercise');
  const volumeAchievements = achievements.filter(a => a.type === 'volume');
  const workoutAchievements = achievements.filter(a => a.type === 'workouts');
  const hourAchievements = achievements.filter(a => a.type === 'hours');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadAchievements}
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Achievements</Text>
        <View style={styles.spacer} />
      </View>
      
      <ScrollView style={styles.container}>
        {achievements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No achievements yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Complete workouts to earn achievements
            </Text>
          </View>
        ) : (
          <>
            {overallAchievements.length > 0 && (
              <View style={styles.achievementCategory}>
                <Text style={styles.achievementCategoryTitle}>Overall Achievements</Text>
                {overallAchievements.map((achievement, index) => (
                  <View key={`overall-${index}`} style={styles.achievementCard}>
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
                ))}
              </View>
            )}
            
            {volumeAchievements.length > 0 && (
              <View style={styles.achievementCategory}>
                <Text style={styles.achievementCategoryTitle}>Volume Achievements</Text>
                {volumeAchievements.map((achievement, index) => (
                  <View key={`volume-${index}`} style={[
                    styles.achievementCard,
                    { borderLeftWidth: 4, borderLeftColor: achievement.icon_color || '#FF9500' }
                  ]}>
                    <View style={styles.achievementHeader}>
                      {achievement.icon || <Dumbbell size={20} color={achievement.icon_color || '#FF9500'} />}
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
                ))}
              </View>
            )}
            
            {workoutAchievements.length > 0 && (
              <View style={styles.achievementCategory}>
                <Text style={styles.achievementCategoryTitle}>Workout Achievements</Text>
                {workoutAchievements.map((achievement, index) => (
                  <View key={`workout-${index}`} style={[
                    styles.achievementCard,
                    { borderLeftWidth: 4, borderLeftColor: achievement.icon_color || '#34C759' }
                  ]}>
                    <View style={styles.achievementHeader}>
                      {achievement.icon || <Flame size={20} color={achievement.icon_color || '#34C759'} />}
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
                ))}
              </View>
            )}
            
            {hourAchievements.length > 0 && (
              <View style={styles.achievementCategory}>
                <Text style={styles.achievementCategoryTitle}>Time Achievements</Text>
                {hourAchievements.map((achievement, index) => (
                  <View key={`hour-${index}`} style={[
                    styles.achievementCard,
                    { borderLeftWidth: 4, borderLeftColor: achievement.icon_color || '#5856D6' }
                  ]}>
                    <View style={styles.achievementHeader}>
                      {achievement.icon || <Timer size={20} color={achievement.icon_color || '#5856D6'} />}
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
                ))}
              </View>
            )}
            
            {exerciseAchievements.length > 0 && (
              <View style={styles.achievementCategory}>
                <Text style={styles.achievementCategoryTitle}>Exercise Achievements</Text>
                {exerciseAchievements.map((achievement, index) => (
                  <View key={`exercise-${index}`} style={[
                    styles.achievementCard,
                    { borderLeftWidth: 4, borderLeftColor: achievement.icon_color || '#007AFF' }
                  ]}>
                    <View style={styles.achievementHeader}>
                      {achievement.icon || <Target size={20} color={achievement.icon_color || '#007AFF'} />}
                      <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    </View>
                    <Text style={styles.achievementDescription}>
                      {achievement.description}
                    </Text>
                    {achievement.exercise_name && (
                      <Text style={styles.exerciseName}>
                        Exercise: {achievement.exercise_name}
                      </Text>
                    )}
                    {achievement.date_earned && (
                      <Text style={styles.achievementDate}>
                        Earned on {new Date(achievement.date_earned).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 16,
  },
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 4,
  },
  spacer: {
    width: 24,
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
  emptyState: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 16,
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
  achievementCategory: {
    marginBottom: 24,
  },
  achievementCategoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
  exerciseName: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '500',
  },
});
