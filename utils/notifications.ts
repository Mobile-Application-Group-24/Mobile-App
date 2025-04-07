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
      sound: true,
    });

    await Notifications.setNotificationChannelAsync('water-reminders', {
      name: 'Water Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34C759',
      sound: true,
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
    if (Platform.OS === 'android' && 'hour' in trigger && 'minute' in trigger) {
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

// Schedule meal notifications based on settings with improved platform handling
export async function scheduleMealNotifications(settings: NutritionSettings) {
  try {
    // Cancel any existing meal notifications
    await cancelMealNotifications();

    const enabledMealTimes = settings.meal_times.filter(meal => meal.enabled);
    const notificationIds: Record<string, string> = {};

    console.log(`Scheduling ${enabledMealTimes.length} meal notifications`);

    for (const meal of enabledMealTimes) {
      const [hours, minutes] = meal.time.split(':').map(Number);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.log(`Invalid time format for ${meal.name}: ${meal.time}`);
        continue;
      }

      console.log(`Scheduling notification for ${meal.name} at ${hours}:${minutes}`);
      
      // Create a date for today at the specified time
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      // If time is in past, schedule for tomorrow
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        console.log(`Time already passed today, scheduling for tomorrow: ${scheduledTime.toISOString()}`);
      }
      
      // Create a platform-specific trigger
      let trigger: Notifications.NotificationTriggerInput;
      
      if (Platform.OS === 'ios') {
        // iOS can handle daily repeating notifications with hour/minute
        trigger = { 
          hour: hours,
          minute: minutes,
          repeats: true 
        };
      } else {
        // For Android, use a specific date/time trigger
        trigger = {
          date: scheduledTime,
          channelId: 'meal-reminders'
        };
      }

      const id = await scheduleNotification(
        `Time for ${meal.name}!`,
        `Don't forget to log your ${meal.name.toLowerCase()} in the nutrition tracker.`,
        trigger,
        'meal-reminders'
      );

      if (id) {
        notificationIds[meal.name] = id;
        console.log(`Successfully scheduled notification for ${meal.name} with ID: ${id}`);
      }
    }

    // List all scheduled notifications after scheduling
    await listScheduledNotifications();
    
    return notificationIds;
  } catch (error) {
    console.error('Failed to schedule meal notifications:', error);
    return null;
  }
}

// Cancel meal notifications
export async function cancelMealNotifications() {
  console.log('Canceling meal notifications...');
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduledNotifications) {
    if (notification.content.title?.includes('Time for')) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`Canceled notification: ${notification.content.title}`);
    }
  }
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
    
    // Schedule first water reminder to happen in 30 seconds, to test if it works
    // Then regular ones at the specified interval
    const initialDelay = 30; // seconds
    const secondsInterval = intervalHours * 60 * 60;
    
    // Different implementation for iOS and Android
    if (Platform.OS === 'ios') {
      // For iOS, use time interval with seconds
      const id = await scheduleNotification(
        'Water Reminder',
        'Time to drink water! Stay hydrated throughout the day.',
        {
          seconds: initialDelay, // first notification after 30 seconds
          repeats: false
        },
        undefined
      );
      
      // Also schedule the recurring notification
      const recurringId = await scheduleNotification(
        'Water Reminder',
        'Time to drink water! Stay hydrated throughout the day.',
        {
          seconds: secondsInterval,
          repeats: true
        },
        undefined
      );

      console.log(`iOS water reminders scheduled with IDs: ${id} (initial), ${recurringId} (recurring)`);
      return recurringId;
    } else {
      // For Android, schedule the initial quick notification
      const initialId = await scheduleNotification(
        'Water Reminder',
        'Time to drink water! Stay hydrated throughout the day.',
        {
          seconds: initialDelay,
          channelId: 'water-reminders'
        },
        'water-reminders'
      );
      
      // And one that's on the regular interval
      const futureTime = new Date(Date.now() + (secondsInterval * 1000));
      const regularId = await scheduleNotification(
        'Water Reminder',
        'Time to drink water! Stay hydrated throughout the day.',
        {
          date: futureTime,
          channelId: 'water-reminders'
        },
        'water-reminders'
      );

      console.log(`Android water reminders scheduled with IDs: ${initialId} (initial), ${regularId} (regular)`);
      return initialId;
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
