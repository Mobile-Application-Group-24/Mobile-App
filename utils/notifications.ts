import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NutritionSettings } from './supabase';

// Configure notification behavior - better handling for both platforms
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.HIGH : undefined,
  }),
});

// Request notification permissions with more comprehensive handling
export async function requestNotificationPermissions() {
  // Check if device has notification capabilities
  const devicePushTokenData = await Notifications.getDevicePushTokenAsync();
  console.log('Device push token:', devicePushTokenData);

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('Existing notification permissions status:', existingStatus);
  
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    console.log('Requesting notification permissions...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('New notification permissions status:', status);
  }

  // For Android, check if we need additional channel setup
  if (Platform.OS === 'android') {
    await setupNotificationChannels();
  }

  return finalStatus === 'granted';
}

// Export setup channels function so it can be called from _layout.tsx
export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name: 'Meal Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: 'Water Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34C759',
      sound: 'default',
    });
    
    console.log('Android notification channels set up successfully');
  }
}

// Schedule a notification with improved trigger format
export async function scheduleNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  channelId?: string
) {
  try {
    console.log(`Scheduling notification: "${title}" with trigger:`, JSON.stringify(trigger));
    
    const notificationContent: Notifications.NotificationContentInput = {
      title,
      body,
      sound: true,
    };
    
    // Add Android specific properties
    if (Platform.OS === 'android' && channelId) {
      notificationContent.channelId = channelId;
      notificationContent.priority = Notifications.AndroidNotificationPriority.HIGH;
    }

    // Fix for Android's potential issue with exact time triggers
    let finalTrigger = trigger;
    if (Platform.OS === 'android' && trigger && 'hour' in trigger && 'minute' in trigger) {
      const date = new Date();
      date.setHours(trigger.hour as number, trigger.minute as number, 0, 0);
      
      // If the time has already passed today, set it for tomorrow
      if (date.getTime() < Date.now()) {
        date.setDate(date.getDate() + 1);
      }
      
      // On Android, we use a date-based trigger instead of hour/minute
      finalTrigger = {
        date: date,
        repeats: false, // We'll handle repetition manually
      };
      
      console.log(`Android: converted time trigger to date: ${date.toISOString()}`);
    }
    
    const id = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: finalTrigger,
    });
    
    console.log(`Notification scheduled with ID: ${id}`);
    return id;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

// Send an immediate notification to test if notifications work at all
export async function sendImmediateTestNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }
    
    // Create a notification that triggers immediately
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Immediate Test Notification',
        body: 'This notification should appear immediately.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // null trigger means send immediately
    });
    
    console.log(`Immediate test notification sent with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Failed to send immediate test notification:', error);
    return null;
  }
}

// Test notification function to verify notification system is working
export async function sendTestNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }
    
    // Schedule a notification for 5 seconds in the future
    const notificationId = await scheduleNotification(
      'Test Notification',
      'This is a test notification to verify the system is working.',
      { seconds: 5 }, // Will trigger 5 seconds after scheduling
      Platform.OS === 'android' ? 'meal-reminders' : undefined
    );
    
    console.log(`Delayed test notification scheduled with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return null;
  }
}

// List all scheduled notifications for debugging
export async function listScheduledNotifications() {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  console.log('Currently scheduled notifications:', 
    scheduledNotifications.map(n => ({
      id: n.identifier,
      title: n.content.title,
      trigger: n.trigger
    }))
  );
  return scheduledNotifications;
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All notifications canceled');
}

// Schedule meal notifications based on settings with improved platform handling and error reporting
export async function scheduleMealNotifications(settings: NutritionSettings): Promise<string[]> {
  try {
    console.log('Scheduling meal notifications with settings:', JSON.stringify(settings, null, 2));
    
    // Clear any existing meal notifications first
    await cancelExistingMealNotifications();
    
    const notificationIds: string[] = [];
    
    // Filter to only enabled meal times
    const enabledMealTimes = settings.meal_times.filter(meal => meal.enabled);
    
    if (enabledMealTimes.length === 0) {
      console.log('No enabled meal times found, skipping meal notifications');
      return [];
    }
    
    // Create notifications for each enabled meal time
    for (const meal of enabledMealTimes) {
      // Parse the time string (format: "HH:MM")
      const [hoursStr, minutesStr] = meal.time.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.error(`Invalid time format for ${meal.name}: ${meal.time}`);
        continue;
      }
      
      // Create a Date object for today at the specified time
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (scheduledTime <= new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        console.log(`Time already passed for ${meal.name}, scheduling for tomorrow at ${hours}:${minutes}`);
      }
      
      // Calculate trigger in seconds from now (precise timing)
      const now = new Date();
      const triggerSeconds = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);
      
      console.log(`Scheduling ${meal.name} notification for ${scheduledTime.toLocaleString()} (${triggerSeconds} seconds from now)`);
      
      // Schedule the meal notification with precise trigger
      const notificationContent = {
        title: `Time for ${meal.name}!`,
        body: `Don't forget to log your ${meal.name.toLowerCase()} in the app.`,
        data: { type: 'meal', mealName: meal.name },
      };
      
      // Use exact timing for the notification
      const notificationId = await scheduleNotificationWithExactTime(
        notificationContent,
        scheduledTime
      );
      
      if (notificationId) {
        notificationIds.push(notificationId);
        console.log(`Successfully scheduled ${meal.name} notification with ID ${notificationId}`);
      }
    }
    
    return notificationIds;
  } catch (error) {
    console.error('Error scheduling meal notifications:', error);
    throw error;
  }
}

// Function to schedule notification at an exact time
async function scheduleNotificationWithExactTime(content: any, scheduledTime: Date): Promise<string> {
  try {
    // Create a trigger for the exact date
    const trigger = {
      type: 'date',
      date: scheduledTime,
    };
    
    // Schedule the notification with the trigger
    const notificationId = await scheduleNotificationWithTrigger(content, trigger);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification with exact time:', error);
    throw error;
  }
}

// Generic function to schedule a notification with a specific trigger
async function scheduleNotificationWithTrigger(content: any, trigger: any): Promise<string> {
  try {
    // Request permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return '';
    }
    
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data || {},
        sound: true,
      },
      trigger,
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

// Helper function to cancel existing meal notifications
async function cancelExistingMealNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Filter for meal notifications
    const mealNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.type === 'meal'
    );
    
    // Cancel each meal notification
    for (const notification of mealNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`Cancelled existing meal notification: ${notification.identifier}`);
    }
    
    console.log(`Cancelled ${mealNotifications.length} existing meal notifications`);
  } catch (error) {
    console.error('Error cancelling existing meal notifications:', error);
  }
}

// Cancel meal notifications with improved logging
export async function cancelMealNotifications() {
  console.log('Canceling all existing meal notifications...');
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  let cancelCount = 0;
  
  for (const notification of scheduledNotifications) {
    if (notification.content.title?.includes('Time for')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`Canceled meal notification: "${notification.content.title}" (ID: ${notification.identifier})`);
      cancelCount++;
    }
  }
  
  console.log(`Canceled ${cancelCount} meal notifications in total`);
}

// Schedule water intake reminders with more reliable implementation
export async function scheduleWaterReminders(
  waterNotifications: boolean, 
  intervalHours: number
) {
  try {
    // Cancel any existing water reminders
    await cancelWaterReminders();

    if (!waterNotifications || intervalHours <= 0) {
      console.log('Water notifications disabled or invalid interval');
      return null;
    }

    console.log(`Scheduling water reminder with interval of ${intervalHours} hours`);
    
    // Schedule the first water reminder in 30 minutes (not seconds) to avoid immediate notification
    const initialDelayMinutes = 30;
    const secondsInterval = intervalHours * 60 * 60;
    
    // Calculate the time for the first notification
    const firstReminderTime = new Date(Date.now() + initialDelayMinutes * 60 * 1000);
    console.log(`First water reminder scheduled for: ${firstReminderTime.toLocaleString()}`);
    
    // Different implementation for iOS and Android
    if (Platform.OS === 'ios') {
      // For iOS, better to use date-based trigger for the first notification to prevent immediate firing
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Water Reminder',
          body: 'Time to drink water! Stay hydrated throughout the day.',
          sound: true,
        },
        trigger: {
          date: firstReminderTime,
        },
      });
      
      // Then schedule the recurring notification with interval
      const recurringId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Water Reminder',
          body: 'Time to drink water! Stay hydrated throughout the day.',
          sound: true,
        },
        trigger: {
          seconds: secondsInterval,
          repeats: true
        },
      });

      console.log(`iOS water reminders scheduled with IDs: ${id} (first at ${firstReminderTime.toLocaleTimeString()}), ${recurringId} (recurring every ${intervalHours} hours)`);
      return { firstId: id, recurringId: recurringId };
    } else {
      // For Android, use explicit date-based triggers
      const initialId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Water Reminder',
          body: 'Time to drink water! Stay hydrated throughout the day.',
          sound: true,
          channelId: 'water-reminders',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: firstReminderTime,
        },
      });
      
      // Schedule additional reminders at specific times throughout the day
      const reminderIds = [];
      for (let i = 1; i <= 4; i++) {
        const reminderTime = new Date(Date.now() + ((initialDelayMinutes + (intervalHours * 60 * i)) * 60 * 1000));
        
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Water Reminder',
            body: 'Time to drink water! Stay hydrated throughout the day.',
            sound: true,
            channelId: 'water-reminders',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            date: reminderTime,
          },
        });
        
        reminderIds.push(id);
        console.log(`Android water reminder #${i} scheduled for ${reminderTime.toLocaleString()} with ID: ${id}`);
      }

      console.log(`Android water reminders scheduled: first reminder ID: ${initialId}, additional reminders: ${reminderIds.join(', ')}`);
      return { firstId: initialId, additionalIds: reminderIds };
    }
  } catch (error) {
    console.error('Failed to schedule water reminders:', error);
    return null;
  }
}

// Cancel water reminders
export async function cancelWaterReminders() {
  console.log('Canceling water reminders...');
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduledNotifications) {
    if (notification.content.title === 'Water Reminder') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`Canceled water reminder notification: ${notification.identifier}`);
    }
  }
}

// Test notification function with exact time for debugging
export async function testExactTimeNotification(hour: number, minute: number) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }
    
    // Create a date object for the specified time
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);
    
    // If this time already passed today, set it for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      console.log(`Time ${hour}:${minute} already passed, scheduling for tomorrow: ${scheduledTime.toLocaleString()}`);
    } else {
      console.log(`Scheduling for today at ${hour}:${minute}: ${scheduledTime.toLocaleString()}`);
    }
    
    // Calculate time until notification in minutes
    const minutesUntilNotification = Math.round((scheduledTime.getTime() - now.getTime()) / 60000);
    
    // Create appropriate trigger based on platform
    let trigger: any;
    if (Platform.OS === 'ios') {
      trigger = {
        hour,
        minute,
        repeats: false
      };
    } else {
      trigger = {
        date: scheduledTime
      };
    }
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Exact Time Test',
        body: `This notification was scheduled for exactly ${hour}:${minute} (${minutesUntilNotification} minutes from now)`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: Platform.OS === 'android' ? 'meal-reminders' : undefined,
      },
      trigger: trigger,
    });
    
    console.log(`Exact time test notification scheduled with ID: ${notificationId}`);
    return {
      id: notificationId, 
      scheduledTime: scheduledTime.toLocaleString(),
      minutesFromNow: minutesUntilNotification
    };
  } catch (error) {
    console.error('Failed to schedule exact time test notification:', error);
    return null;
  }
}
