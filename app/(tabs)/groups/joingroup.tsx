import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getGroupInvitation, useGroupInvitation, getGroupDetails, joinGroup, getGroups } from '../../../utils/supabase';
import { Users, AlertCircle } from 'lucide-react-native';

export default function JoinGroupScreen() {
  const { groupId, code } = useLocalSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [message, setMessage] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (!code && !groupId) {
      setStatus('error');
      setMessage('Invalid invitation link. Please ask for a new link.');
      return;
    }

    const fetchInvitation = async () => {
      try {
        if (code && groupId) {
          try {
            const groupDetails = await getGroupDetails(groupId as string);
            setGroupName(groupDetails.name);
            setMemberCount(groupDetails.member_count || 0);
            setStatus('success');
            return;
          } catch (error) {
            console.error('Error fetching group details:', error);
          }
        }
        
        if (groupId) {
          try {
            const groupDetails = await getGroupDetails(groupId as string);
            setGroupName(groupDetails.name);
            setMemberCount(groupDetails.member_count || 0);
            setStatus('success');
            return;
          } catch (error) {
            console.error('Error fetching group details:', error);
            setStatus('error');
            setMessage('Group not found');
            return;
          }
        }
        
        if (code) {
          try {
            const groups = await getGroups(false);
            const matchingGroup = groups.find(group => 
              group.id.toLowerCase().startsWith((code as string).toLowerCase())
            );
            
            if (matchingGroup) {
              router.setParams({ groupId: matchingGroup.id });
              setGroupName(matchingGroup.name);
              setMemberCount(matchingGroup.member_count || 0);
              setStatus('success');
              return;
            }
          } catch (error) {
            console.error('Error finding matching group:', error);
          }
          
          setGroupName('Group');
          setMemberCount(0);
          setStatus('success');
          return;
        }
        
        setStatus('error');
        setMessage('Could not find group information');
      } catch (error) {
        console.error('Error in invitation flow:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'An error occurred');
      }
    };

    fetchInvitation();
  }, [code, groupId, router]);

  const handleJoinGroup = async () => {
    setStatus('loading');
    
    try {
      if (groupId) {
        try {
          await joinGroup(groupId as string);
          router.replace(`/groups/${groupId}`);
          return;
        } catch (error) {
          console.error('Error joining with group ID:', error);
        }
      }
      
      if (code) {
        try {
          if ((code as string).includes('-') && (code as string).length >= 32) {
            try {
              await joinGroup(code as string);
              router.replace(`/groups/${code}`);
              return;
            } catch (codeIdError) {
              console.error('Error joining with code as ID:', codeIdError);
            }
          }
          
          try {
            const groups = await getGroups(false);
            const matchingGroup = groups.find(group => 
              group.id.toLowerCase().startsWith((code as string).toLowerCase())
            );
            
            if (matchingGroup) {
              await joinGroup(matchingGroup.id);
              router.replace(`/groups/${matchingGroup.id}`);
              return;
            }
          } catch (findError) {
            console.error('Error finding matching group:', findError);
          }
          
          const group = await useGroupInvitation(code as string);
          router.replace(`/groups/${group.id}`);
          return;
        } catch (error) {
          console.error('Error joining with code:', error);
          throw error;
        }
      }
      
      throw new Error('No valid group ID or invitation code provided');
    } catch (error) {
      console.error('Error joining group:', error);
      setStatus('error');
      setMessage(error instanceof Error 
        ? error.message 
        : 'An error occurred while joining');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Stack.Screen options={{ 
          title: 'Join Group', 
          headerBackVisible: true 
        }} />
        
        {status === 'loading' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading group information...</Text>
          </View>
        )}
        
        {status === 'error' && (
          <View style={styles.contentContainer}>
            <AlertCircle size={64} color="#FF3B30" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{message}</Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => router.replace('/groups')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Back to Groups</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {status === 'success' && (
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <Users size={48} color="#007AFF" />
            </View>
            
            <Text style={styles.groupName}>{groupName}</Text>
            
            <View style={styles.infoRow}>
              <Users size={20} color="#8E8E93" />
              <Text style={styles.memberCount}>{memberCount} Members</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.joinButton}
              onPress={handleJoinGroup}
              activeOpacity={0.7}
            >
              <Text style={styles.joinButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#3C3C43',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    justifyContent: 'center',
  },
  memberCount: {
    fontSize: 16,
    color: '#3C3C43',
    marginLeft: 8,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#3C3C43',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
  },
});
