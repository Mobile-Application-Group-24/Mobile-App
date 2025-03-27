import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { Search, Users, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getGroups, type Group } from '@/utils/supabase';

export default function GroupsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOwned, setShowOwned] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadGroups}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.safeArea} />
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
            style={styles.createButton}
            onPress={() => router.push('/groups/new')}>
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showOwned && styles.filterButtonActive]}
          onPress={() => setShowOwned(!showOwned)}>
          <Text style={[styles.filterButtonText, showOwned && styles.filterButtonTextActive]}>
            My Groups Only
          </Text>
        </TouchableOpacity>
      </View>

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
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
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
    height: '100%',
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
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
});