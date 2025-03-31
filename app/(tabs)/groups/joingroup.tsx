import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getGroupInvitation, useGroupInvitation, getGroupDetails, joinGroup } from '../../../utils/supabase';
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
          const groupDetails = await getGroupDetails(groupId as string);
          setGroupName(groupDetails.name);
          setMemberCount(groupDetails.member_count || 0);
          setStatus('success');
          return;
        }
        
        if (code) {
          try {
            const invitation = await getGroupInvitation(code as string);
            setGroupName(invitation.group?.name || 'Group');
            
            if (invitation.group?.id && !groupId) {
              router.setParams({ groupId: invitation.group.id });
              
              try {
                const groupDetails = await getGroupDetails(invitation.group.id);
                setMemberCount(groupDetails.member_count || 0);
              } catch (error) {
                console.error('Error fetching group details:', error);
                setMemberCount(0); // Fallback
              }
            } else {
              setMemberCount(0); 
            }
          } catch (error) {
            console.error('Error with invitation code:', error);
            setStatus('error');
            setMessage('Invitation code invalid or expired');
            return;
          }
        } else if (groupId) {
          try {
            const groupDetails = await getGroupDetails(groupId as string);
            setGroupName(groupDetails.name);
            setMemberCount(groupDetails.member_count || 0);
          } catch (error) {
            console.error('Error fetching group details:', error);
            setStatus('error');
            setMessage('Group not found');
            return;
          }
        }
        
        setStatus('success');
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
      let groupToJoin = groupId as string;
      
      if (groupId) {
        try {
          await joinGroup(groupId as string);
          groupToJoin = groupId as string;
        } catch (error) {
          console.error('Could not join with groupId, trying code:', error);
          // If joining with ID fails, try with the code
          if (code) {
            const group = await useGroupInvitation(code as string);
            groupToJoin = group.id;
          } else {
            throw error; 
          }
        }
      } 
      else if (code) {
        try {
          const group = await useGroupInvitation(code as string);
          groupToJoin = group.id;
        } catch (error) {
          console.error('Error using invitation code:', error);
          throw error;
        }
      } else {
        throw new Error('No group found to join');
      }
      
      setStatus('success');
      setTimeout(() => {
        router.replace(`/groups/${groupToJoin}`);
      }, 1500);
    } catch (error) {
      console.error('Error joining group:', error);
      setStatus('error');
      setMessage(error instanceof Error 
        ? error.message 
        : 'An error occurred while joining');
    }
  };

  return (
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
          >
            <Text style={styles.joinButtonText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 18,
  },
});
