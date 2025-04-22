import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NutritionSettings } from './supabase';

let isStartupSuppression = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.HIGH : undefined,
  }),
});

export function suppressNotificationsOnStartup() {
  isStartupSuppression = true;
  console.log('Notification suppression enabled during startup');
}

export function enableNotificationsAfterStartup() {
  isStartupSuppression = false;
  console.log('Startup complete, notifications now enabled');
}

setTimeout(() => {
  enableNotificationsAfterStartup();
  console.log('Automatically enabled notifications after startup delay');
}, 5000);

export function areNotificationsSuppressed() {
  return isStartupSuppression;
}

export async function requestNotificationPermissions() {

  const devicePushTokenData = await Notifications.getDevicePushTokenAsync();
  console.log('Device push token:', devicePushTokenData);

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('Existing notification permissions status:', existingStatus);
  
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    console.log('Requesting notification permissions...');
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('New notification permissions status:', status);
  }

  if (Platform.OS === 'android') {
    await setupNotificationChannels();
  }

  return finalStatus === 'granted';
}

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
export async function scheduleNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  channelId?: string
) {
  try {
    if (isStartupSuppression) {
      console.log(`Notification "${title}" suppressed during app startup`);
      return null;
    }
    
    console.log(`Scheduling notification: "${title}" with trigger:`, JSON.stringify(trigger));
    
    const notificationContent: Notifications.NotificationContentInput = {
      title,
      body,
      sound: true,
    };

    if (Platform.OS === 'android' && channelId) {
      notificationContent.channelId = channelId;
      notificationContent.priority = Notifications.AndroidNotificationPriority.HIGH;
    }

    let finalTrigger = trigger;
    if (Platform.OS === 'android' && trigger && 'hour' in trigger && 'minute' in trigger) {
      const date = new Date();
      date.setHours(trigger.hour as number, trigger.minute as number, 0, 0);

      if (date.getTime() < Date.now()) {
        date.setDate(date.getDate() + 1);
      }

      finalTrigger = {
        date: date,
        repeats: false, 
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

export async function sendImmediateTestNotification() {
  try {
    if (isStartupSuppression) {
      console.log(`Immediate test notification suppressed during app startup`);
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Immediate Test Notification',
        body: 'This notification should appear immediately.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, 
    });
    
    console.log(`Immediate test notification sent with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Failed to send immediate test notification:', error);
    return null;
  }
}

export async function sendTestNotification() {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }

    const notificationId = await scheduleNotification(
      'Test Notification',
      'This is a test notification to verify the system is working.',
      { seconds: 5 }, 
      Platform.OS === 'android' ? 'meal-reminders' : undefined
    );
    
    console.log(`Delayed test notification scheduled with ID: ${notificationId}`);
    return notificationId;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return null;
  }
}

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

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('All notifications canceled');
}

export async function scheduleMealNotifications(settings: NutritionSettings): Promise<string[]> {
  try {
    console.log('Scheduling meal notifications with settings:', JSON.stringify(settings, null, 2));

    await cancelExistingMealNotifications();
    
    const notificationIds: string[] = [];
    
    const enabledMealTimes = settings.meal_times.filter(meal => meal.enabled);
    
    if (enabledMealTimes.length === 0) {
      console.log('No enabled meal times found, skipping meal notifications');
      return [];
    }
    
    for (const meal of enabledMealTimes) {
      const [hoursStr, minutesStr] = meal.time.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      
      if (isNaN(hours) || isNaN(minutes)) {
        console.error(`Invalid time format for ${meal.name}: ${meal.time}`);
        continue;
      }

      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      if (scheduledTime <= new Date()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
        console.log(`Time already passed for ${meal.name}, scheduling for tomorrow at ${hours}:${minutes}`);
      }

      const now = new Date();
      const triggerSeconds = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);
      
      console.log(`Scheduling ${meal.name} notification for ${scheduledTime.toLocaleString()} (${triggerSeconds} seconds from now)`);

      const notificationContent = {
        title: `Time for ${meal.name}!`,
        body: `Don't forget to log your ${meal.name.toLowerCase()} in the app.`,
        data: { type: 'meal', mealName: meal.name },
      };

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

async function scheduleNotificationWithExactTime(content: any, scheduledTime: Date): Promise<string> {
  try {
    if (isStartupSuppression) {
      console.log(`Notification "${content.title}" suppressed during app startup`);
      return '';
    }

    const trigger = {
      type: 'date',
      date: scheduledTime,
    };

    const notificationId = await scheduleNotificationWithTrigger(content, trigger);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification with exact time:', error);
    throw error;
  }
}

async function scheduleNotificationWithTrigger(content: any, trigger: any): Promise<string> {
  try {
    if (isStartupSuppression) {
      console.log(`Notification "${content.title}" suppressed during app startup`);
      return '';
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permission not granted');
      return '';
    }

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

async function cancelExistingMealNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    const mealNotifications = scheduledNotifications.filter(
      notification => notification.content.data?.type === 'meal'
    );

    for (const notification of mealNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`Cancelled existing meal notification: ${notification.identifier}`);
    }
    
    console.log(`Cancelled ${mealNotifications.length} existing meal notifications`);
  } catch (error) {
    console.error('Error cancelling existing meal notifications:', error);
  }
}

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

export async function scheduleWaterReminders(
  waterNotifications: boolean, 
  intervalHours: number
) {
  try {
    if (isStartupSuppression) {
      console.log(`Water reminders suppressed during app startup`);
      return null;
    }

    await cancelWaterReminders();

    if (!waterNotifications || intervalHours <= 0) {
      console.log('Water notifications disabled or invalid interval');
      return null;
    }

    console.log(`Scheduling water reminder with interval of ${intervalHours} hours`);

    const initialDelayMinutes = 30;
    const secondsInterval = intervalHours * 60 * 60;

    const firstReminderTime = new Date(Date.now() + initialDelayMinutes * 60 * 1000);
    console.log(`First water reminder scheduled for: ${firstReminderTime.toLocaleString()}`);
 
    if (Platform.OS === 'ios') {
 
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

export async function testExactTimeNotification(hour: number, minute: number) {
  try {
    
    if (isStartupSuppression) {
      console.log(`Exact time test notification suppressed during app startup`);
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('No notification permissions');
      return null;
    }
   
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      console.log(`Time ${hour}:${minute} already passed, scheduling for tomorrow: ${scheduledTime.toLocaleString()}`);
    } else {
      console.log(`Scheduling for today at ${hour}:${minute}: ${scheduledTime.toLocaleString()}`);
    }
    
    const minutesUntilNotification = Math.round((scheduledTime.getTime() - now.getTime()) / 60000);

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
