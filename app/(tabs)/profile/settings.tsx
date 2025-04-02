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

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=3131&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

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
    avatar_url: '',
  });
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);

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
        avatar_url: data.avatar_url || '',
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
        avatar_url: formData.avatar_url,
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
        setTempAvatar(uri);

        const fileName = `${session.user.id}/${Date.now()}.jpg`;

        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const arrayBuffer = _base64ToArrayBuffer(base64);

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

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('avatars')
          .createSignedUrl(fileName, 60 * 60 * 24 * 365);

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
          throw signedUrlError;
        }

        const avatarUrl = signedUrlData.signedUrl;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw updateError;
        }

        setFormData((prev) => ({ ...prev, avatar_url: avatarUrl }));
        Alert.alert('Success', 'Profile picture updated successfully');
        loadProfile();
      }
    } catch (error) {
      console.error('Error updating avatar:', error);

      if (typeof error === 'object' && error !== null && 'message' in error) {
        Alert.alert('Error', `Failed to update profile picture: ${(error as any).message}`);
      } else {
        Alert.alert('Error', 'Failed to update profile picture');
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
              uri: tempAvatar || formData.avatar_url || DEFAULT_AVATAR 
            }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.changeAvatarButton} onPress={handleChangeAvatar} activeOpacity={0.7}>
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
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}>
            <LogOut size={24} color="#FF3B30" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}>
            <Trash2 size={24} color="#FFFFFF" />
            <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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