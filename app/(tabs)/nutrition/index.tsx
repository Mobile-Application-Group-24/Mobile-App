import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getNutritionSettings } from '@/utils/supabase';

export default function NutritionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      await getNutritionSettings();
      // If we get here, settings exist, redirect to the main nutrition view
      router.replace('/nutrition/index-with-data');
    } catch (error: any) {
      if (error?.message?.includes('JSON object requested, multiple (or no) rows returned')) {
        // No settings found, we'll show the setup screen
        setError(null);
      } else {
        setError('Failed to check nutrition settings');
        console.error('Error checking settings:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
    );
  }

  if (error) {
    return (
        <View style={styles.container}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={checkSettings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
    );
  }

  return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Settings size={64} color="#8E8E93" />
          <Text style={styles.title}>Welcome to Nutrition Tracking</Text>
          <Text style={styles.description}>
            Let's start by setting up your nutrition preferences and goals.
          </Text>
          <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/nutrition/settings')}
          >
            <Text style={styles.buttonText}>Set Up Nutrition</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
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