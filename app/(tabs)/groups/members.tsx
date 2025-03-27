import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput } from 'react-native';
import { Search, UserPlus, X } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';

const members = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Owner',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
  },
  {
    id: 2,
    name: 'Mike Chen',
    role: 'Member',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
  },
  {
    id: 3,
    name: 'Emily Davis',
    role: 'Member',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
  },
];

export default function MembersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const { groupId } = useLocalSearchParams();
  const isOwner = true; // In a real app, this would be determined by the user's role

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveMember = (memberId: number) => {
    // Handle member removal logic
    console.log('Remove member:', memberId);
  };

  return (
    <View style={styles.container}>
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
          <TouchableOpacity style={styles.inviteButton}>
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.membersList}>
        {filteredMembers.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <Image source={{ uri: member.avatar }} style={styles.avatar} />
              <View style={styles.textContainer}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={[
                  styles.roleText,
                  member.role === 'Owner' && styles.ownerText
                ]}>{member.role}</Text>
              </View>
            </View>
            {isOwner && member.role !== 'Owner' && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveMember(member.id)}
              >
                <X size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
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
  },
});