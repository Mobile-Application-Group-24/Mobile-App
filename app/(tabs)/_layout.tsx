import { Tabs } from 'expo-router';
import { Dumbbell, Users, Brain, Apple, User, ChartBar } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Platform, Keyboard, View, StyleSheet } from 'react-native';

// Export the tab bar height as a constant for reuse in other components
export const TAB_BAR_HEIGHT = 60;

export default function TabLayout() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
          setKeyboardVisible(true);
        }
      );
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setKeyboardVisible(false);
        }
      );

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, []);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
            backgroundColor: '#FFFFFF',
            ...(Platform.OS === 'android' && {
              height: TAB_BAR_HEIGHT,
              display: keyboardVisible ? 'none' : 'flex',
            }),
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="workouts"
          options={{
            title: 'Workouts',
            tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
        name="stats"
        options={{
          title: 'Statistics',
          tabBarIcon: ({ color, size }) => <ChartBar size={size} color={color} />,
        }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: 'Groups',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          }}
        />
        {<Tabs.Screen
          name="ai"
          options={{
            title: 'AI Coach',
            tabBarIcon: ({ color, size }) => <Brain size={size} color={color} />,
          }}
        />}
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutrition',
            tabBarIcon: ({ color, size }) => <Apple size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
      
      {/* This view provides bottom padding when keyboard is not visible */}
      {Platform.OS === 'android' && !keyboardVisible && (
        <View style={[styles.tabBarPlaceholder]} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  tabBarPlaceholder: {
    height: TAB_BAR_HEIGHT,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: -1, // Ensure it stays behind other content
  }
});