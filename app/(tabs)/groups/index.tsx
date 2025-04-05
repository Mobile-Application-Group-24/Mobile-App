import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, StatusBar, SafeAreaView, Modal, Alert, Platform } from 'react-native';
import { Search, Users, Plus, KeyRound, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getGroups, type Group, joinGroupWithCode } from '@/utils/supabase';
import { TAB_BAR_HEIGHT } from '../_layout';

export default function GroupsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOwned, setShowOwned] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadGroups();
  }, [showOwned]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGroups(showOwned);
      setGroups(data || []); // Ensure we always have an array
    } catch (err) {
      setError('Failed to load groups. Please try again.');
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invitation code');
      return;
    }

    try {
      setJoiningGroup(true);
      const result = await joinGroupWithCode(inviteCode.trim());
      
      if (result) {
        setJoinModalVisible(false);
        setInviteCode('');
        
        if (result.redirectToJoin) {
          // If we should redirect to the join screen
          if (result.groupId) {
            router.push({
              pathname: '/groups/joingroup',
              params: { groupId: result.groupId, code: result.code || inviteCode.trim() }
            });
          } else if (result.code) {
            router.push({
              pathname: '/groups/joingroup',
              params: { code: result.code }
            });
          }
        } else if (result.groupId) {
          // Direct join (legacy behavior)
          Alert.alert('Success', 'You have joined the group!', [
            { 
              text: 'OK', 
              onPress: () => {
                loadGroups(); // Reload groups to show the newly joined one
                router.push(`/groups/${result.groupId}`);
              }
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Error joining group:', err);
      Alert.alert('Error', 'Failed to join group. The code may be invalid or expired.');
    } finally {
      setJoiningGroup(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
        <SafeAreaView style={styles.safeAreaTop} />
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadGroups}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeAreaTop} />
      <View style={styles.mainContainer}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color="#8E8E93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search groups..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => setJoinModalVisible(true)}
              activeOpacity={0.7}>
              <KeyRound size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/groups/new')}
              activeOpacity={0.7}>
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.filterButton, showOwned && styles.filterButtonActive]}
            onPress={() => setShowOwned(!showOwned)}
            activeOpacity={0.7}>
            <Text style={[styles.filterButtonText, showOwned && styles.filterButtonTextActive]}>
              My Groups Only
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Groups</Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : filteredGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={48} color="#8E8E93" />
                <Text style={styles.emptyStateText}>No groups found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {showOwned 
                    ? "You haven't created any groups yet"
                    : "No groups match your search"}
                </Text>
              </View>
            ) : (
              filteredGroups.map((group) => (
                <TouchableOpacity 
                  key={group.id} 
                  style={styles.groupCard}
                  onPress={() => router.push(`/groups/${group.id}`)}
                >
                  <Image 
                    source={{ uri: group.cover_image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48' }} 
                    style={styles.groupImage}
                    onError={() => {
                      console.log("Fehler beim Laden des Gruppenbilds:", group.cover_image);
                      // If image loading fails, we could update the state to use a default image,
                      // but that would require adding a state management for each group
                    }}
                  />
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <View style={styles.groupStats}>
                      <Users size={16} color="#8E8E93" />
                      <Text style={styles.groupMembers}>{group.member_count} members</Text>
                      {group.owner_id === (group as any).currentUserId && (
                        <View style={styles.ownerBadge}>
                          <Text style={styles.ownerText}>Owner</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
          
          {/* Add extra padding at the bottom to ensure content isn't hidden */}
          {Platform.OS === 'android' && <View style={{ height: TAB_BAR_HEIGHT }} />}
        </ScrollView>

        {/* Join Group Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={joinModalVisible}
          onRequestClose={() => setJoinModalVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Join Group</Text>
                <TouchableOpacity
                  onPress={() => {
                    setJoinModalVisible(false);
                    setInviteCode('');
                  }}
                  style={styles.closeButton}
                  activeOpacity={0.7}>
                  <X size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalText}>
                Enter the invitation code to join a group
              </Text>
              
              <TextInput
                style={styles.codeInput}
                placeholder="Enter invitation code"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              <TouchableOpacity
                style={styles.joinGroupButton}
                onPress={handleJoinWithCode}
                disabled={joiningGroup}
                activeOpacity={0.7}>
                {joiningGroup ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.joinGroupButtonText}>Join Group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? TAB_BAR_HEIGHT : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
    ...(Platform.OS === 'android' && {
      paddingTop: StatusBar.currentHeight || 24,
    }),
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    height: Platform.OS === 'android' ? 52 : 44,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: Platform.OS === 'android' ? 48 : 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    height: '100%',
    ...(Platform.OS === 'android' && {
      paddingVertical: 8,
      paddingTop: 8,
      paddingBottom: 8,
    }),
  },
  createButton: {
    width: Platform.OS === 'android' ? 48 : 44,
    height: Platform.OS === 'android' ? 48 : 44,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButton: {
    width: Platform.OS === 'android' ? 48 : 44,
    height: Platform.OS === 'android' ? 48 : 44,
    borderRadius: 12,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  groupImage: {
    width: '100%',
    height: 120,
  },
  groupInfo: {
    padding: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  groupStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMembers: {
    marginLeft: 6,
    color: '#8E8E93',
  },
  ownerBadge: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  ownerText: {
    color: '#FFB100',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  codeInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  joinGroupButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  joinGroupButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});