import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal, Alert, Clipboard, ActivityIndicator } from 'react-native';
import { Search, UserPlus, X, Copy, Check, Clock } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { createGroupInvitation } from '../../../utils/supabase';

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
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitationExpiry, setInvitationExpiry] = useState('24 Stunden');
  const { groupId } = useLocalSearchParams();
  const isOwner = true; 

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveMember = (memberId: number) => {
    // Handle member removal logic
    console.log('Remove member:', memberId);
  };

  const generateInviteLink = async () => {
    setIsLoading(true);

    try {
      if (!groupId) {
        throw new Error('No group ID found');
      }

      const invitation = await createGroupInvitation(groupId as string);

      const deepLink = Linking.createURL(`groups/join-group`, {
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

  const copyToClipboard = () => {
    Clipboard.setString(inviteLink);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 3000);
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
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={generateInviteLink}
            disabled={isLoading}
          >
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

      <ScrollView style={styles.membersList}>
        {filteredMembers.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <Image source={{ uri: member.avatar || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}} style={styles.avatar} />
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

      {/* Invite Link Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isInviteModalVisible}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Einladungslink</Text>
              <TouchableOpacity
                onPress={() => setInviteModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCodeLabel}>Invitation code:</Text>
              <Text style={styles.inviteCode}>{invitationCode}</Text>
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
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#007AFF',
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
});