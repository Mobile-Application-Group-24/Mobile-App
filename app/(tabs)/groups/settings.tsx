import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, StatusBar, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Trash2 } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';


const STORAGE_BUCKET = 'groups';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupData, setGroupData] = useState({
    name: 'Morning Warriors',
    description: 'Early birds catching those gains! Join us for morning workouts and motivation.',
    cover_image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
    is_private: false, 
    notifications: true,
    owner_id: ''
  });

  useEffect(() => {
    loadGroupData();
  }, [groupId, session?.user?.id]);

  const loadGroupData = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;

      if (data) {
        setGroupData({
          name: data.name || '',
          description: data.description || '',
          cover_image: data.cover_image || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
          is_private: data.is_private || false, 
          notifications: true,
          owner_id: data.owner_id || ''
        });
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCoverPhoto = async () => {
    if (!session?.user?.id || !groupId) return;

    console.log("Starting cover photo change process"); 
    
    try {
      if (groupData.owner_id !== session.user.id) {
        Alert.alert('Permission Denied', 'Only the group owner can change the cover photo.');
        return;
      }

      console.log("Requesting photo library permission"); 
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Permission status:", status); 
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photo library to update the cover photo.');
        return;
      }

      console.log("Opening image picker"); 

      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });

        console.log("Image picker completed, result:", result.canceled ? "Canceled" : "Image selected"); 

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const { uri } = result.assets[0];
          
         
          const fileName = `${session.user.id}/${groupId}_${Date.now()}.jpg`;

          console.log("Preparing to upload:", fileName); 

          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          const arrayBuffer = _base64ToArrayBuffer(base64);

         
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, arrayBuffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          console.log("Upload result:", uploadData, uploadError);

          if (uploadError) {
            console.error('Upload error:', JSON.stringify(uploadError));
            throw uploadError;
          }

          
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(fileName, 60 * 60 * 24 * 365);

          if (signedUrlError) {
            console.error('Error creating signed URL:', signedUrlError);
            throw signedUrlError;
          }

          const coverImageUrl = signedUrlData.signedUrl;
          console.log('Cover Image signed URL:', coverImageUrl); 

          
          if (!coverImageUrl.includes('/sign/')) {
            console.warn('Warning: The URL does not include /sign/ path. Current URL:', coverImageUrl);
          }

          const { error: updateError } = await supabase
            .from('groups')
            .update({ cover_image: coverImageUrl })
            .eq('id', groupId);

          if (updateError) {
            console.error('Group update error:', updateError);
            throw updateError;
          }

          setGroupData(prev => ({ ...prev, cover_image: coverImageUrl }));
          Alert.alert('Success', 'Cover photo updated successfully', [
            { 
              text: 'OK', 
              onPress: () => {
                
                router.replace({
                  pathname: '/(tabs)/groups',
                  params: { refresh: Date.now().toString() }
                });
              }
            }
          ]);
        }
      } catch (pickerError) {
        console.error("Error in image picker:", pickerError);
        Alert.alert('Error', 'Could not open the photo library. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error updating cover photo:', error);
      
      if (typeof error === 'object' && error !== null && 'message' in error) {
        Alert.alert('Error', `Failed to update cover photo: ${(error as any).message}`);
      } else {
        Alert.alert('Error', 'Failed to update cover photo');
      }
    }
  };

  function _base64ToArrayBuffer(base64: string) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }

  function atob(data: string) {
    return Buffer.from(data, 'base64').toString('binary');
  }

  const handleSave = async () => {
    if (!groupId || !session?.user?.id) return;
    
    if (groupData.owner_id !== session.user.id) {
      Alert.alert('Permission Denied', 'Only the group owner can modify group settings.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('groups')
        .update({
          name: groupData.name,
          description: groupData.description,
          is_private: groupData.is_private, 
        })
        .eq('id', groupId);

      if (error) throw error;
      
      Alert.alert('Success', 'Group settings updated successfully', [
        { 
          text: 'OK', 
          onPress: () => {
            router.replace({
              pathname: '/(tabs)/groups',
              params: { refresh: Date.now().toString() }
            });
          }
        }
      ]);
    } catch (error) {
      console.error('Error updating group settings:', error);
      Alert.alert('Error', 'Failed to update group settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = () => {
    if (!groupId || !session?.user?.id) return;
    
    if (groupData.owner_id !== session.user.id) {
      Alert.alert('Permission Denied', 'Only the group owner can delete the group.');
      return;
    }

    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', groupId);

              if (error) throw error;
              
              
              router.replace({
                pathname: '/(tabs)/groups',
                params: { refresh: Date.now().toString() }
              });
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
        <SafeAreaView style={styles.safeAreaTop} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeAreaTop} />
      <ScrollView style={styles.container}>
        <View style={styles.imageSection}>
          <Image 
            source={{ uri: groupData.cover_image }} 
            style={styles.coverImage} 
          />
          <TouchableOpacity 
            style={styles.changeImageButton}
            onPress={handleChangeCoverPhoto}
            activeOpacity={0.7}>
            <Camera size={24} color="#FFFFFF" />
            <Text style={styles.changeImageText}>Change Image</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>
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
                !groupData.is_private && styles.optionButtonActive, 
              ]}
              onPress={() => setGroupData(prev => ({ ...prev, is_private: false }))}>
              <Text style={[
                styles.optionText,
                !groupData.is_private && styles.optionTextActive,
              ]}>Public</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                groupData.is_private && styles.optionButtonActive, 
              ]}
              onPress={() => setGroupData(prev => ({ ...prev, is_private: true }))}>
              <Text style={[
                styles.optionText,
                groupData.is_private && styles.optionTextActive, 
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
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeAreaTop: {
    flex: 0,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});