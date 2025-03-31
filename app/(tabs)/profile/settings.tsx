import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Switch, Alert, ActivityIndicator, Platform, StatusBar, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, Bell, Lock, LogOut, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import { getProfile, updateProfile, type Profile } from '@/utils/supabase';
import { supabase } from '@/utils/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    notifications: true,
    privateProfile: false,
  });

  useEffect(() => {
    loadProfile();
  }, [session?.user?.id]);

  const loadProfile = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const data = await getProfile(session.user.id);
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        bio: data.bio || '',
        notifications: true,
        privateProfile: false,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session?.user?.id) return;

    try {
      setSaving(true);
      await updateProfile(session.user.id, {
        full_name: formData.full_name,
        bio: formData.bio,
      });
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.admin.deleteUser(
                session?.user?.id as string
              );
              if (error) throw error;
              await signOut();
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleChangeAvatar = async () => {
    if (!session?.user?.id) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need access to your photo library to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const { uri } = result.assets[0];
        
        // Create the bucket if it doesn't exist (this is actually handled on server side)
        try {
          // Check if bucket exists first (optional)
          const { data: buckets } = await supabase.storage.listBuckets();
          const bucketExists = buckets?.some(bucket => bucket.name === 'avatars');
          
          if (!bucketExists) {
            console.log('Bucket does not exist, it will be created automatically on upload');
          }
        } catch (err) {
          console.log('Error checking buckets:', err);
        }
        
        // Create a file path that includes the user ID as a folder name
        const fileName = `${session.user.id}/${Date.now()}.jpg`;

        // Read file as Base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert Base64 string to Uint8Array
        const arrayBuffer = _base64ToArrayBuffer(base64);

        // Upload the file to Supabase
        const { data, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get the public URL of the uploaded file
        // Instead of getPublicUrl, use createSignedUrl for longer-lived tokens
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('avatars')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiration

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
          throw signedUrlError;
        }

        const avatarUrl = signedUrlData.signedUrl;
        console.log('Avatar URL:', avatarUrl); // For debugging

        // Update the user's profile with the new avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw updateError;
        }

        // Update local state and notify user
        setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
        Alert.alert('Success', 'Profile picture updated successfully');

        // Reload profile to ensure we have the latest data
        loadProfile();
      }
    } catch (error) {
      console.error('Error updating avatar:', error);

      // Display detailed error message
      if (typeof error === 'object' && error !== null && 'message' in error) {
        Alert.alert('Error', `Failed to update profile picture: ${(error as any).message}`);
      } else {
        Alert.alert('Error', 'Failed to update profile picture');
      }
    }
  };

  // Helper function to convert Base64 to ArrayBuffer
  function _base64ToArrayBuffer(base64: string) {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
  }

  // Helper function for Base64 decoding
  function atob(data: string) {
    return Buffer.from(data, 'base64').toString('binary');
  }

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeAreaTop} />
      <ScrollView style={styles.container}>
        <View style={styles.avatarSection}>
          <Image 
            source={{ 
              uri: profile?.avatar_url || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
            }} 
            style={styles.avatar} 
          />
          <TouchableOpacity style={styles.changeAvatarButton} onPress={handleChangeAvatar}>
            <Camera size={24} color="#FFFFFF" />
            <Text style={styles.changeAvatarText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
              placeholder="Enter your name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={session?.user?.email || ''}
              editable={false}
              placeholder="Email address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.preference}>
            <View style={styles.preferenceInfo}>
              <Bell size={24} color="#007AFF" />
              <Text style={styles.preferenceText}>Push Notifications</Text>
            </View>
            <Switch
              value={formData.notifications}
              onValueChange={(value) => setFormData(prev => ({ ...prev, notifications: value }))}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.preference}>
            <View style={styles.preferenceInfo}>
              <Lock size={24} color="#007AFF" />
              <Text style={styles.preferenceText}>Private Profile</Text>
            </View>
            <Switch
              value={formData.privateProfile}
              onValueChange={(value) => setFormData(prev => ({ ...prev, privateProfile: value }))}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}>
            <LogOut size={20} color="#FF3B30" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}>
            <Trash2 size={20} color="#FFFFFF" />
            <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
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
  avatarSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  changeAvatarText: {
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
  inputDisabled: {
    color: '#8E8E93',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  preference: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceText: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteAccountButtonText: {
    color: '#FFFFFF',
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
  saveButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});