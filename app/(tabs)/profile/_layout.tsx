import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Profile Settings',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          presentation: 'modal'
        }}
      />
      <Stack.Screen 
        name="all-achievements"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="recent-workouts"
        options={{
          headerShown: false
        }}
      />
    </Stack>
  );
}