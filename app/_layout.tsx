import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { View } from 'react-native';
import { AuthProvider } from '../providers/AuthProvider';
import React from 'react';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions, setupNotificationChannels, scheduleMealNotifications, scheduleWaterReminders } from '@/utils/notifications';
import { Platform } from 'react-native';
import { getNutritionSettings, supabase } from '@/utils/supabase';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Configure default notification behavior at app startup with high priority
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.MAX : undefined,
  }),
});

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen once fonts are loaded or if there's an error
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        console.log('Setting up notifications at app startup...');
        
        // Set up Android notification channels first with MAX importance
        if (Platform.OS === 'android') {
          try {
            await Notifications.setNotificationChannelAsync('meal-reminders', {
              name: 'Meal Reminders',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#007AFF',
              sound: true,
              enableVibrate: true,
            });

            await Notifications.setNotificationChannelAsync('water-reminders', {
              name: 'Water Reminders',
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#34C759',
              sound: true,
              enableVibrate: true,
            });
            
            console.log('Android notification channels set up successfully');
          } catch (channelError) {
            console.error('Error setting up notification channels:', channelError);
          }
        }
        
        // Request notification permissions when the app starts
        let hasPermission = false;
        try {
          hasPermission = await requestNotificationPermissions();
          console.log('Notification permission status at app startup:', hasPermission);
        } catch (permissionError) {
          console.error('Error requesting notification permissions:', permissionError);
        }
        
        if (hasPermission) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
              console.log('Loading settings from database to schedule meal notifications...');
              
              try {
                const settings = await getNutritionSettings();
                
                if (settings) {
                  console.log('Found settings in database, scheduling notifications...');
                  
                  // Schedule meal notifications - will only trigger at the specific times set in settings
                  const mealNotificationIds = await scheduleMealNotifications(settings);
                  
                  // Schedule water reminders if enabled - first one will be delayed
                  if (settings.water_notifications) {
                    await scheduleWaterReminders(
                      settings.water_notifications,
                      settings.water_interval
                    );
                  }
                  
                  // List all scheduled notifications to verify proper setup
                  const scheduledNotifs = await Notifications.getAllScheduledNotificationsAsync();
                  console.log(`Now have ${scheduledNotifs.length} scheduled notifications`);
                }
              } catch (settingsError) {
                console.log('Could not load notification settings:', settingsError);
              }
            }
          } catch (error) {
            console.log('User not authenticated, skipping notification scheduling');
          }
        }
        
        // Set up notification listeners
        const subscription = Notifications.addNotificationReceivedListener(notification => {
          console.log('Notification received!', notification);
        });
        
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Notification response received!', response);
        });
        
        // Check if there are any pending notifications
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log(`App startup: ${scheduledNotifications.length} notifications scheduled`);
        
        return () => {
          subscription.remove();
          responseSubscription.remove();
        };
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };
    
    setupNotifications();
  }, []);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
        </Stack>
      </View>
    </AuthProvider>
  );
}