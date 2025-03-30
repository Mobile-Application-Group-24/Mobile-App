import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Switch, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Users, Lock, Globe as Globe2, X } from 'lucide-react-native';
import { createGroup } from '@/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/utils/supabase';
import { Buffer } from 'buffer';
import { useAuth } from '@/providers/AuthProvider';

const coverImages = [
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
  'https://images.unsplash.com/photo-1574680096145-d05b474e2155',
];

const STORAGE_BUCKET = 'groups';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    cover_image: coverImages[0],
    is_private: false,
    max_members: '20',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const pickImage = async () => {
    try {
      setUploadingImage(true);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photo library to set a group cover image.');
        setUploadingImage(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        setUploadingImage(false);
        return;
      }

      const { uri } = result.assets[0];
      const timestamp = Date.now();
      const fileName = `${session?.user?.id || 'anonymous'}_temp_${timestamp}.jpg`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const arrayBuffer = _base64ToArrayBuffer(base64);

      console.log(`Trying to upload to ${STORAGE_BUCKET} bucket with filename: ${fileName}`);

      try {
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);
        if (bucketError) {
          console.warn(`Bucket check error: ${bucketError.message}. Will try to use it anyway.`);
        } else {
          console.log(`Bucket ${STORAGE_BUCKET} exists`);
        }
      } catch (bucketCheckError) {
        console.warn('Error checking bucket:', bucketCheckError);
      }

      
      const { data, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error details:', JSON.stringify(uploadError));
        throw uploadError;
      }

      console.log('File uploaded successfully, creating signed URL');
      
      const { data: urlData, error: signUrlError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (signUrlError) {
        console.error('Error creating signed URL:', JSON.stringify(signUrlError));
        throw signUrlError;
      }

      if (urlData && urlData.signedUrl) {
        console.log('Successfully obtained signed URL:', urlData.signedUrl);
        // Überprüfe die URL-Struktur, um sicherzustellen, dass sie korrekt ist
        const url = new URL(urlData.signedUrl);
        console.log('URL structure:', {
          protocol: url.protocol,
          host: url.host,
          pathname: url.pathname,
          search: url.search
        });
        
        setGroupData(prev => ({ ...prev, cover_image: urlData.signedUrl }));
        setIsCustomImage(true);
      } else {
        console.warn('Creating signed URL failed, falling back to public URL');
        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(fileName);
        
        if (publicUrlData && publicUrlData.publicUrl) {
          console.log('Using public URL instead:', publicUrlData.publicUrl);
          setGroupData(prev => ({ ...prev, cover_image: publicUrlData.publicUrl }));
          setIsCustomImage(true);
        } else {
          throw new Error('Failed to get image URL');
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorString = typeof error === 'object' ? JSON.stringify(error) : String(error);
      console.error('Detailed error:', errorString);
      if (typeof error === 'object' && error !== null && 'message' in error) {
        Alert.alert('Error', `Failed to upload image: ${(error as any).message}`);
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } finally {
      setUploadingImage(false);
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
    if (!groupData.name || !groupData.description) return;
    
    try {
      setIsCreating(true);
      const newGroup = await createGroup({
        name: groupData.name,
        description: groupData.description,
        cover_image: groupData.cover_image,
        is_private: groupData.is_private,
        max_members: parseInt(groupData.max_members),
      });
      router.push({
        pathname: '/groups',
        params: { refresh: Date.now().toString() }
      });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert(
        'Error',
        'Failed to create group. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X size={24} color="#FF3B30" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Group</Text>
        <View style={styles.placeholderView} />
      </View>

      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <View style={styles.coverSection}>
            <Image 
              source={{ uri: groupData.cover_image }} 
              style={styles.coverImage}
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={(e) => {
                console.error('Error loading image:', e.nativeEvent.error);
                if (isCustomImage) {
                  Alert.alert(
                    'Image Error', 
                    'Could not load the uploaded image. The URL might be invalid.',
                    [
                      { 
                        text: 'Use Default', 
                        onPress: () => {
                          setGroupData(prev => ({ ...prev, cover_image: coverImages[0] }));
                          setIsCustomImage(false);
                        }
                      },
                      { text: 'Try Again' }
                    ]
                  );
                }
              }}
            />
            {imageLoading && (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.changeCoverButton} 
              onPress={pickImage}
              disabled={uploadingImage}
            >
              <Camera size={20} color="#FFFFFF" />
              <Text style={styles.changeCoverText}>
                {uploadingImage ? 'Uploading...' : 'Gallery'}
              </Text>
            </TouchableOpacity>
          </View>

          {!isCustomImage && (
            <View style={styles.coverSelector}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.coverOptions}
              >
                {coverImages.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setGroupData(prev => ({ ...prev, cover_image: image }))}
                    style={[
                      styles.coverOption,
                      groupData.cover_image === image && styles.coverOptionSelected
                    ]}
                  >
                    <Image source={{ uri: image }} style={styles.coverThumbnail} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {isCustomImage && (
            <TouchableOpacity 
              style={styles.resetImageButton}
              onPress={() => {
                setGroupData(prev => ({ ...prev, cover_image: coverImages[0] }));
                setIsCustomImage(false);
              }}
            >
              <Text style={styles.resetImageText}>Use default images</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              value={groupData.name}
              onChangeText={(text) => setGroupData(prev => ({ ...prev, name: text }))}
              placeholder="Enter group name"
              placeholderTextColor="#8E8E93"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={groupData.description}
              onChangeText={(text) => setGroupData(prev => ({ ...prev, description: text }))}
              placeholder="What's your group about?"
              multiline
              numberOfLines={4}
              placeholderTextColor="#8E8E93"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <Users size={20} color="#007AFF" />
              <Text style={styles.settingTitle}>Maximum Members</Text>
            </View>
            <View style={styles.memberCounter}>
              <TextInput
                style={styles.memberInput}
                value={groupData.max_members}
                onChangeText={(text) => setGroupData(prev => ({ ...prev, max_members: text }))}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.memberLabel}>members</Text>
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              {groupData.is_private ? (
                <Lock size={20} color="#34C759" />
              ) : (
                <Globe2 size={20} color="#007AFF" />
              )}
              <Text style={styles.settingTitle}>Privacy</Text>
            </View>
            <View style={styles.privacyToggle}>
              <Text style={[
                styles.privacyLabel,
                { color: groupData.is_private ? '#34C759' : '#8E8E93' }
              ]}>
                {groupData.is_private ? 'Private Group' : 'Public Group'}
              </Text>
              <Switch
                value={groupData.is_private}
                onValueChange={(value) => setGroupData(prev => ({ ...prev, is_private: value }))}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Users size={20} color="#8E8E93" />
            <Text style={styles.infoText}>
              Create a group to connect with people who share your fitness goals and motivate each other.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity 
          style={[
            styles.createButton,
            (!groupData.name || !groupData.description || isCreating) && styles.createButtonDisabled
          ]}
          onPress={handleSave}
          disabled={!groupData.name || !groupData.description || isCreating}
        >
          <Text style={[
            styles.createButtonText,
            (!groupData.name || !groupData.description || isCreating) && styles.createButtonTextDisabled
          ]}>{isCreating ? 'Creating...' : 'Create Group'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 80 : 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16, 
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderView: {
    width: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  coverSection: {
    position: 'relative',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  changeCoverButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  changeCoverText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  coverSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  coverOptions: {
    gap: 12,
  },
  coverOption: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  coverOptionSelected: {
    borderColor: '#007AFF',
  },
  coverThumbnail: {
    width: '100%',
    height: '100%',
  },
  resetImageButton: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  resetImageText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  inputWrapper: {
    flex: 1,
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
  settingCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberInput: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  memberLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 24, // Einheitliches Padding für iOS und Android
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#FFFFFF',
  },
});