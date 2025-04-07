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
import { requestNotificationPermissions, setupNotificationChannels } from '@/utils/notifications';
import { Platform } from 'react-native';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Configure default notification behavior at app startup
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.HIGH : undefined,
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
        // Request notification permissions when the app starts
        const hasPermission = await requestNotificationPermissions();
        console.log('Notification permission status at app startup:', hasPermission);
        
        if (Platform.OS === 'android') {
          await setupNotificationChannels();
        }
        
        // Make sure we have permission to receive notifications
        if (!hasPermission) {
          console.warn('No notification permissions - notifications will not work');
          return;
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