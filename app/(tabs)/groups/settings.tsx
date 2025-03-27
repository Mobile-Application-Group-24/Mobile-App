import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Trash2 } from 'lucide-react-native';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const [groupData, setGroupData] = useState({
    name: 'Morning Warriors',
    description: 'Early birds catching those gains! Join us for morning workouts and motivation.',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
    privacy: 'public',
    notifications: true,
  });

  const handleSave = () => {
    // Handle saving group settings
    console.log('Saving group settings:', groupData);
    router.back();
  };

  const handleDeleteGroup = () => {
    // Handle group deletion
    console.log('Deleting group:', groupId);
    router.replace('/groups');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageSection}>
        <Image source={{ uri: groupData.image }} style={styles.coverImage} />
        <TouchableOpacity style={styles.changeImageButton}>
          <Camera size={24} color="#FFFFFF" />
          <Text style={styles.changeImageText}>Change Cover Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            value={groupData.name}
            onChangeText={(text) => setGroupData(prev => ({ ...prev, name: text }))}
            placeholder="Enter group name"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={groupData.description}
            onChangeText={(text) => setGroupData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your group"
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Settings</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              groupData.privacy === 'public' && styles.optionButtonActive,
            ]}
            onPress={() => setGroupData(prev => ({ ...prev, privacy: 'public' }))}>
            <Text style={[
              styles.optionText,
              groupData.privacy === 'public' && styles.optionTextActive,
            ]}>Public</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.optionButton,
              groupData.privacy === 'private' && styles.optionButtonActive,
            ]}
            onPress={() => setGroupData(prev => ({ ...prev, privacy: 'private' }))}>
            <Text style={[
              styles.optionText,
              groupData.privacy === 'private' && styles.optionTextActive,
            ]}>Private</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteGroup}>
          <Trash2 size={20} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Delete Group</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  imageSection: {
    position: 'relative',
    height: 200,
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});