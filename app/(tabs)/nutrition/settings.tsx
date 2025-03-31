import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Scale, Droplets, Bell, Clock, Save } from 'lucide-react-native';
import { getNutritionSettings, updateNutritionSettings, supabase } from '@/utils/supabase';
import type { NutritionSettings } from '@/utils/supabase';

const defaultSettings: Omit<NutritionSettings, 'user_id' | 'updated_at'> = {
  calorie_goal: 2200,
  water_goal: 8,
  water_notifications: true,
  water_interval: 2,
  meal_times: [
    { name: 'Breakfast', time: '08:00', enabled: true },
    { name: 'Lunch', time: '13:00', enabled: true },
    { name: 'Dinner', time: '19:00', enabled: true },
    { name: 'Snacks', time: '11:00', enabled: false },
  ],
};

export default function NutritionSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NutritionSettings | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      try {
        const data = await getNutritionSettings();
        setSettings(data);
        setIsNewUser(false);
      } catch (error: any) {
        if (error?.message?.includes('JSON object requested, multiple (or no) rows returned')) {
          // No settings found, use defaults
          setSettings({
            user_id: userData.user.id,
            updated_at: new Date().toISOString(),
            ...defaultSettings,
          });
          setIsNewUser(true);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCalorieGoalChange = (value: string) => {
    if (!settings) return;

    if (value === '') {
      setSettings({
        ...settings,
        calorie_goal: '' as unknown as number,
      });
      return;
    }

    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setSettings({
        ...settings,
        calorie_goal: numValue,
      });
    }
  };

  const handleWaterGoalChange = (value: string) => {
    if (!settings) return;

    if (value === '') {
      setSettings({
        ...settings,
        water_goal: '' as unknown as number,
      });
      return;
    }

    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setSettings({
        ...settings,
        water_goal: numValue,
      });
    }
  };

  const handleWaterIntervalChange = (value: string) => {
    if (!settings) return;

    if (value === '') {
      setSettings({
        ...settings,
        water_interval: '' as unknown as number,
      });
      return;
    }

    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      setSettings({
        ...settings,
        water_interval: numValue,
      });
    }
  };

  const handleSave = async () => {
    if (!settings || saving) return;

    try {
      setSaving(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const normalizedSettings = {
        ...settings,
        calorie_goal:
typeof settings.calorie_goal === 'string' || settings.calorie_goal === null
            ? settings.calorie_goal === ''
              ? 2200
              : parseInt(String(settings.calorie_goal), 10) || 2200
            : settings.calorie_goal,
        water_goal:
          typeof settings.water_goal === 'string' || settings.water_goal === null
            ? settings.water_goal === ''
              ? 8
              : parseInt(String(settings.water_goal), 10) || 8
            : settings.water_goal,
        water_interval:
          typeof settings.water_interval === 'string' || settings.water_interval === null
            ? settings.water_interval === ''
              ? 2
              : parseInt(String(settings.water_interval), 10) || 2
            : settings.water_interval,
      };

      if (isNewUser) {
        const { error: insertError } = await supabase.from('nutrition_settings').insert({
          user_id: userData.user.id,
          calorie_goal: normalizedSettings.calorie_goal,
          water_goal: normalizedSettings.water_goal,
          water_notifications: normalizedSettings.water_notifications,
          water_interval: normalizedSettings.water_interval,
          meal_times: normalizedSettings.meal_times,
          updated_at: new Date().toISOString(),
        });

        if (insertError) throw insertError;
      } else {
        await updateNutritionSettings({
          calorie_goal: normalizedSettings.calorie_goal,
          water_goal: normalizedSettings.water_goal,
          water_notifications: normalizedSettings.water_notifications,
          water_interval: normalizedSettings.water_interval,
          meal_times: normalizedSettings.meal_times,
        });
      }

      router.replace('/nutrition/index-with-data');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMealTimeChange = (
    index: number,
    field: keyof (typeof defaultSettings.meal_times)[0],
    value: string | boolean
  ) => {
    if (!settings) return;

    const updatedMealTimes = [...settings.meal_times];
    updatedMealTimes[index] = {
      ...updatedMealTimes[index],
      [field]: value,
    };

    setSettings({
      ...settings,
      meal_times: updatedMealTimes,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load settings</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Scale size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Calorie Goals</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Daily Calorie Target</Text>
          <TextInput
            style={styles.input}
            value={String(settings.calorie_goal)}
            onChangeText={handleCalorieGoalChange}
            keyboardType="numeric"
            placeholder="Enter daily calorie goal"
          />
          <Text style={styles.hint}>Recommended: 2000-2500 calories for adults</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Droplets size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Water Intake</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Daily Water Goal (glasses)</Text>
          <TextInput
            style={styles.input}
            value={String(settings.water_goal)}
            onChangeText={handleWaterGoalChange}
            keyboardType="numeric"
            placeholder="Enter number of glasses"
          />
          <Text style={styles.hint}>Recommended: 8 glasses (2 liters) per day</Text>
        </View>

        <View style={styles.toggleContainer}>
          <View style={styles.toggleInfo}>
            <Bell size={20} color="#007AFF" />
            <Text style={styles.toggleText}>Water Intake Reminders</Text>
          </View>
          <Switch
            value={settings.water_notifications}
            onValueChange={(value) =>
              setSettings({
                ...settings,
                water_notifications: value,
              })
            }
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {settings.water_notifications && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Reminder Interval (hours)</Text>
            <TextInput
              style={styles.input}
              value={String(settings.water_interval)}
              onChangeText={handleWaterIntervalChange}
              keyboardType="numeric"
              placeholder="Enter hours between reminders"
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Clock size={24} color="#007AFF" />
          <Text style={styles.sectionTitle}>Meal Reminders</Text>
        </View>

        {settings.meal_times.map((meal, index) => (
          <View key={meal.name} style={styles.mealSetting}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Switch
                value={meal.enabled}
                onValueChange={(value) => handleMealTimeChange(index, 'enabled', value)}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {meal.enabled && (
              <View style={styles.timeContainer}>
                <Text style={styles.timeLabel}>Reminder Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={meal.time}
                  onChangeText={(value) => handleMealTimeChange(index, 'time', value)}
                  placeholder="HH:MM"
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                />
              </View>
            )}
          </View>
        ))}
        <Text style={styles.hint}>Set reminders to log your meals at specific times</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Save size={24} color="#FFFFFF" />
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : isNewUser ? 'Create Settings' : 'Save Settings'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
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
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    fontStyle: 'italic',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontSize: 16,
  },
  mealSetting: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    width: 100,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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