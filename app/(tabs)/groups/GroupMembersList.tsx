import React from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { GroupMember } from '../../../utils/supabase';
import { getAvatarUrl, getDisplayName } from '../../../utils/avatar';

interface GroupMembersListProps {
  members: GroupMember[];
}

export default function GroupMembersList({ members }: GroupMembersListProps) {
  const renderMember = ({ item }: { item: GroupMember }) => (
    <View style={styles.memberItem}>
      <Image 
        source={{ uri: getAvatarUrl(item.profile.avatar_url) }} 
        style={styles.avatar} 
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{getDisplayName(item.profile.full_name)}</Text>
        <Text style={styles.memberRole}>{item.role}</Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.id}
      renderItem={renderMember}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  memberInfo: {
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 14,
    color: '#666666',
    textTransform: 'capitalize',
  },
});
