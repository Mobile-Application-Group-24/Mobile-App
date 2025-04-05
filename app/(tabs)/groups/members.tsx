import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Search, UserPlus, X, Copy, Check, Clock, ArrowLeft, LogOut } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { createGroupInvitation, getGroupMembers, removeMember, GroupMember, leaveGroup } from '../../../utils/supabase';
import { getAvatarUrl, getDisplayName } from '../../../utils/avatar';
import { useAuth } from '../../../providers/AuthProvider';

export default function MembersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [invitationExpiry, setInvitationExpiry] = useState('24 hours');
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadMembers();
    } else {
      router.replace('/groups');
    }
  }, [groupId]);

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      const data = await getGroupMembers(groupId as string);
      setMembers(data);
      
      // Check if current user is owner
      const currentUserId = session?.user?.id;
      const currentUserMember = data.find(member => member.user_id === currentUserId);
      setIsOwner(currentUserMember?.role === 'owner');
      setCurrentUserRole(currentUserMember?.role || '');
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load group members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveMember = async (userId: string) => {
    try {
      if (!groupId) return;
      
      await removeMember(groupId as string, userId);
      
      // Update members list
      setMembers(prevMembers => prevMembers.filter(member => member.user_id !== userId));
      
      Alert.alert('Success', 'Member removed from the group');
    } catch (error) {
      console.error('Error removing member:', error);
      Alert.alert('Error', 'Failed to remove member from the group');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      if (!groupId) return;

      Alert.alert(
        'Leave Group',
        'Are you sure you want to leave this group?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                await leaveGroup(groupId as string);
                Alert.alert('Success', 'You have left the group');
                router.replace('/groups');
              } catch (error) {
                console.error('Error leaving group:', error);
                Alert.alert('Error', 'Failed to leave the group');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave the group');
    }
  };

  const generateInviteLink = async () => {
    setIsLoading(true);

    try {
      if (!groupId) {
        throw new Error('No group ID found');
      }

      const invitation = await createGroupInvitation(groupId as string);

      const deepLink = Linking.createURL(`groups/joingroup`, {
        queryParams: { code: invitation.code, groupId: groupId as string }
      });

      setInvitationCode(invitation.code);
      setInviteLink(deepLink);
      setInviteModalVisible(true);
    } catch (error) {
      console.error('Error generating invitation:', error);
      Alert.alert(
        'Error',
        'An error occurred while creating the invitation. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  const copyCodeToClipboard = async () => {
    await Clipboard.setStringAsync(invitationCode);
    setCodeCopied(true);

    setTimeout(() => {
      setCodeCopied(false);
    }, 3000);
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
          activeOpacity={0.7}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        
        
        {/* Leave Group Button for non-owners */}
        {!isOwner && currentUserRole && (
          <TouchableOpacity 
            style={styles.leaveButton} 
            onPress={handleLeaveGroup}
            activeOpacity={0.7}>
            <LogOut size={20} color="#FF3B30" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {isOwner && (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={generateInviteLink}
            disabled={isLoading}
            activeOpacity={0.7}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <UserPlus size={20} color="#FFFFFF" />
                <Text style={styles.inviteButtonText}>Invite</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loadingMembers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : (
        <ScrollView style={styles.membersList}>
          {filteredMembers.map((member) => (
            <TouchableOpacity 
              key={member.id} 
              style={styles.memberCard}
              onPress={() => router.push({
                pathname: '/profile/Profileview',
                params: { userId: member.user_id }
              })}
            >
              <View style={styles.memberInfo}>
                <Image 
                  source={{ uri: getAvatarUrl(member.profile.avatar_url) }} 
                  style={styles.avatar} 
                />
                <View style={styles.textContainer}>
                  <Text style={styles.memberName}>{getDisplayName(member.profile.full_name)}</Text>
                  <Text style={[
                    styles.roleText,
                    member.role === 'owner' && styles.ownerText
                  ]}>{member.role}</Text>
                </View>
              </View>
              {isOwner && member.role !== 'owner' && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onPress
                    handleRemoveMember(member.user_id);
                  }}
                >
                  <X size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Invite Link Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isInviteModalVisible}
        onRequestClose={() => setInviteModalVisible(false)}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invitation Link</Text>
              <TouchableOpacity
                onPress={() => setInviteModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}>
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeLabel}>Invitation code:</Text>
              <View style={styles.codeRow}>
                <Text style={styles.inviteCode}>{invitationCode}</Text>
                <TouchableOpacity
                  style={styles.codeCopyButton}
                  onPress={copyCodeToClipboard}
                >
                  {codeCopied ? (
                    <Check size={20} color="#34C759" />
                  ) : (
                    <Copy size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.expiryContainer}>
              <Clock size={16} color="#8E8E93" />
              <Text style={styles.expiryText}>
                Valid for {invitationExpiry}
              </Text>
            </View>

            <Text style={styles.modalText}>
              Share this link with people you want to invite to the group:
            </Text>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText} numberOfLines={1}>
                {inviteLink}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyToClipboard}
              >
                {copied ? (
                  <Check size={20} color="#34C759" />
                ) : (
                  <Copy size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                Linking.openURL(`mailto:?subject=Join my fitness group&body=Join my fitness group by clicking this link: ${inviteLink} or use the code: ${invitationCode}`);
              }}
            >
              <Text style={styles.shareButtonText}>Share via Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 12 + (StatusBar.currentHeight ?? 0) : 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  leaveButton: {
    padding: 8,
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  inviteButton: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  membersList: {
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  ownerText: {
    color: '#FFB100',
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalText: {
    marginBottom: 16,
    fontSize: 16,
    color: '#3C3C43',
  },
  linkContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
  },
  copyButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  inviteCodeContainer: {
    backgroundColor: '#F8F8FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#007AFF',
    marginRight: 8,
  },
  codeCopyButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  expiryText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
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
});