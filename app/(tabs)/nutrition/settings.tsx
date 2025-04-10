import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Scale, Droplets, Bell, Clock, Save, AlertTriangle } from 'lucide-react-native';
import { getNutritionSettings, updateNutritionSettings, supabase } from '@/utils/supabase';
import type { NutritionSettings } from '@/utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  requestNotificationPermissions, 
  scheduleMealNotifications, 
  scheduleWaterReminders, 
  sendTestNotification,
  sendImmediateTestNotification,
  listScheduledNotifications,
  setupNotificationChannels,
  testExactTimeNotification
} from '@/utils/notifications';

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
  const [showTimePicker, setShowTimePicker] = useState<number | null>(null);
  const [notificationsPermission, setNotificationsPermission] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        await setupNotificationChannels();
      }
      
      const hasPermission = await requestNotificationPermissions();
      setNotificationsPermission(hasPermission);
      if (!hasPermission) {
        Alert.alert(
          "Notification Permission Required",
          "To receive meal and water reminders, please enable notifications for this app in your device settings.",
          [{ text: "OK" }]
        );
      } else {
        console.log('Notification permissions granted');
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      try {
        const data = await getNutritionSettings();
        setSettings(data);
        setIsNewUser(false);
      } catch (error: any) {
        console.error('Error loading settings:', error);
        
        if (error?.message?.includes('JSON object requested, multiple (or no) rows returned')) {
          // Handle new user case
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            // If still no user after checking, try session refresh
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (!refreshData.user) {
              throw new Error('Authentication failed. Please log in again.');
            }
            
            setSettings({
              user_id: refreshData.user.id,
              updated_at: new Date().toISOString(),
              ...defaultSettings,
            });
          } else {
            setSettings({
              user_id: userData.user.id,
              updated_at: new Date().toISOString(),
              ...defaultSettings,
            });
          }
          setIsNewUser(true);
        } else if (error?.message?.includes('Not authenticated')) {
          // Handle authentication error
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (!refreshData.user) {
            Alert.alert(
              "Authentication Error",
              "Your session has expired. Please log in again.",
              [{ text: "OK", onPress: () => router.replace('/login') }]
            );
            return;
          } else {
            // Try again after refresh
            const data = await getNutritionSettings();
            setSettings(data);
            setIsNewUser(false);
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings. Please check your connection and try again.');
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
      
      // First check authentication
      try {
        await getCurrentUser();
      } catch (error) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.user) {
          Alert.alert(
            "Authentication Error",
            "Your session has expired. Please log in again.",
            [{ text: "OK", onPress: () => router.replace('/login') }]
          );
          return;
        }
      }

      // Normalize settings first
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

      // First, save to database
      try {
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
        
        console.log('Settings saved successfully to database');
      } catch (dbError) {
        console.error('Database error while saving settings:', dbError);
        throw new Error('Failed to save settings to database. Please try again.');
      }

      // Then, handle notifications if permission is granted
      if (notificationsPermission) {
        try {
          console.log('Setting up notifications with saved settings:', JSON.stringify(normalizedSettings, null, 2));
          
          // Verify meal_times structure before scheduling
          if (!normalizedSettings.meal_times || !Array.isArray(normalizedSettings.meal_times)) {
            console.error('Invalid meal_times structure:', normalizedSettings.meal_times);
            throw new Error('Invalid meal times settings. Please check your configuration.');
          }
          
          const enabledMealTimes = normalizedSettings.meal_times.filter(meal => meal.enabled);
          console.log(`Found ${enabledMealTimes.length} enabled meal times`);
          
          // Validate each meal time format before scheduling
          enabledMealTimes.forEach(meal => {
            const [hours, minutes] = meal.time.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) {
              console.error(`Invalid time format for ${meal.name}: ${meal.time}`);
              throw new Error(`Invalid time format for ${meal.name}: ${meal.time}`);
            }
            console.log(`Validated meal time: ${meal.name} at ${hours}:${minutes}`);
          });
          
          // Schedule meal notifications
          const mealNotificationIds = await scheduleMealNotifications(normalizedSettings);
          console.log('Meal notification IDs:', mealNotificationIds);
          
          // Schedule water reminders if enabled
          if (normalizedSettings.water_notifications) {
            const waterReminderId = await scheduleWaterReminders(
              normalizedSettings.water_notifications,
              normalizedSettings.water_interval
            );
            console.log('Water reminder ID:', waterReminderId);
          }
          
          // Prepare message about when notifications will appear
          const mealTimes = enabledMealTimes.map(meal => {
            const [hours, minutes] = meal.time.split(':').map(Number);
            const scheduledTime = new Date();
            scheduledTime.setHours(hours, minutes, 0, 0);
            
            // If time has passed today, show as tomorrow
            if (scheduledTime <= new Date()) {
              scheduledTime.setDate(scheduledTime.getDate() + 1);
              return `${meal.name} (tomorrow at ${hours}:${String(minutes).padStart(2, '0')})`;
            }
            
            return `${meal.name} (today at ${hours}:${String(minutes).padStart(2, '0')})`;
          }).join(', ');
          
          if (enabledMealTimes.length > 0) {
            // Show specific info about meal times from database
            const waterMessage = normalizedSettings.water_notifications 
              ? `\n\nWater reminders will occur every ${normalizedSettings.water_interval} hour(s).` 
              : '';
              
            Alert.alert(
              "Settings Saved",
              `Your settings have been saved successfully.\n\nMeal reminders will appear for: ${mealTimes}${waterMessage}`,
              [{ text: "OK" }]
            );
          } else {
            // No meal times enabled
            const waterMessage = normalizedSettings.water_notifications 
              ? `Water reminders will occur every ${normalizedSettings.water_interval} hour(s).` 
              : 'No meal or water notifications are currently enabled.';
              
            Alert.alert(
              "Settings Saved",
              `Your settings have been saved successfully.\n\n${waterMessage}`,
              [{ text: "OK" }]
            );
          }
        } catch (notificationError) {
          console.error('Error scheduling notifications:', notificationError);
          Alert.alert(
            "Settings Saved with Warning",
            `Your settings were saved, but there was an error scheduling notifications: ${notificationError.message}`,
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert(
          "Notification Permission Required",
          "Please enable notifications to receive meal and water reminders.",
          [
            { text: "Skip", style: "cancel" },
            { text: "Check Permissions", onPress: checkNotificationPermissions }
          ]
        );
      }

      router.replace('/nutrition/index-with-data');
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Check if this is an auth error
      if (error.message?.includes('Not authenticated') || error.message?.includes('JWT expired')) {
        Alert.alert(
          "Authentication Error",
          "Your session has expired. Please log in again.",
          [{ text: "OK", onPress: () => router.replace('/login') }]
        );
      } else {
        Alert.alert('Error', `Failed to save settings: ${error.message}`);
      }
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

  const handleTimePickerChange = (index: number, event: any, selectedDate?: Date) => {
    setShowTimePicker(null);

    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        return;
      }
    }

    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      handleMealTimeChange(index, 'time', timeString);
    }
  };

  const showTimepicker = (index: number) => {
    setShowTimePicker(index);
  };

  const parseTimeString = (timeString: string): Date => {
    const date = new Date();
    const [hoursStr, minutesStr] = timeString.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (!isNaN(hours) && !isNaN(minutes)) {
      date.setHours(hours);
      date.setMinutes(minutes);
    }

    return date;
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

                {Platform.OS === 'ios' ? (
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={parseTimeString(meal.time)}
                      mode="time"
                      display="default"
                      onChange={(event, selectedDate) => handleTimePickerChange(index, event, selectedDate)}
                      style={styles.iosTimePicker}
                    />
                  </View>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.timeButton}
                      onPress={() => showTimepicker(index)}
                    >
                      <Text style={styles.timeButtonText}>{meal.time}</Text>
                    </TouchableOpacity>

                    {showTimePicker === index && (
                      <DateTimePicker
                        value={parseTimeString(meal.time)}
                        mode="time"
                        is24Hour={true}
                        display="default"
                        onChange={(event, selectedDate) => handleTimePickerChange(index, event, selectedDate)}
                      />
                    )}
                  </>
                )}
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
      
      {!notificationsPermission && (
        <View style={styles.permissionWarning}>
          <AlertTriangle size={20} color="#FF9500" />
          <Text style={styles.permissionWarningText}>
            Notification permission not granted. You won't receive meal and water reminders.
          </Text>
        </View>
      )}
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
  timeButton: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    width: 100,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timePickerContainer: {
    width: 120,
    overflow: 'hidden',
  },
  iosTimePicker: {
    height: 40,
    alignSelf: 'flex-end',
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
  permissionWarning: {
    backgroundColor: '#FFF9EB',
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionWarningText: {
    color: '#FF9500',
    fontSize: 14,
    flex: 1,
  },
});