import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, Flame, Users, Settings, ArrowLeft } from 'lucide-react-native';
import { getGroupDetails, getGroupMembers, type GroupMember } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { DEFAULT_AVATAR } from '@/utils/avatar';

export default function GroupScreen() {
  const { id, viaLink } = useLocalSearchParams(); // viaLink is either "true" or undefined
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    loadGroupData();
  }, [id]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch group details
      const groupData = await getGroupDetails(id as string);
      setGroup(groupData);

      // Fetch group members
      const membersData = await getGroupMembers(id as string);
      setMembers(membersData.sort((a, b) => b.points - a.points));
    } catch (err) {
      console.error('Error loading group:', err);
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleMembersPress = () => {
    router.push({
      pathname: '/groups/members',
      params: { groupId: id }
    });
  };

  const handleProfilePress = (userId: string) => {
    router.push({
      pathname: '/profile/Profileview',
      params: { userId }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Group not found'}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadGroupData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = session?.user?.id === group.owner_id;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* Header with back button */}
      <View style={styles.navigationHeader}>
        {viaLink === "true" && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.push('/groups')}
            activeOpacity={0.7}>
            <ArrowLeft size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.navTitle}>{group.name}</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollContent}>
        <Image 
          source={{ uri: group.cover_image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48' }} 
          style={styles.coverImage} 
        />
        
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.description}>{group.description}</Text>
            
            <TouchableOpacity 
              style={styles.stats}
              onPress={handleMembersPress}
              activeOpacity={0.7}>
              <View style={styles.stat}>
                <Users size={20} color="#007AFF" />
                <Text style={styles.statText}>{group.member_count} members</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          {isOwner && (
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => router.push({ pathname: '/groups/settings', params: { groupId: id } })}
              activeOpacity={0.7}>
              <Settings size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          {members.map((member, index) => (
            <TouchableOpacity 
              key={member.id} 
              style={styles.userCard}
              onPress={() => handleProfilePress(member.user_id)}
            >
              <View style={styles.rankContainer}>
                {index === 0 && <Trophy size={24} color="#FFD700" />}
                {index === 1 && <Trophy size={24} color="#C0C0C0" />}
                {index === 2 && <Trophy size={24} color="#CD7F32" />}
                {index > 2 && <Text style={styles.rank}>#{index + 1}</Text>}
              </View>
              <Image 
                source={{ 
                  uri: member.profile?.avatar_url || DEFAULT_AVATAR
                }} 
                style={styles.avatar} 
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {member.profile?.full_name || 'Anonymous User'}
                </Text>
                <View style={styles.pointsContainer}>
                  <Flame size={16} color="#FF9500" />
                  <Text style={styles.points}>{member.points || 0} pts</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
    paddingTop: Platform.OS === 'android' ? 12 + (StatusBar.currentHeight || 0) : 12,
  },
  backButton: {
    padding: 8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40, // Same width as backButton for symmetry
  },
  scrollContent: {
    flex: 1,
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
  coverImage: {
    width: '100%',
    height: 200,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    marginLeft: 6,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginHorizontal: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  points: {
    marginLeft: 4,
    color: '#8E8E93',
  },
});