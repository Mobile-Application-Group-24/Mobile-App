import React from 'react';
import { Stack } from 'expo-router';

export default function WorkoutsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Create Workout Plan',
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          presentation: 'modal'
        }}
      />
    </Stack>
  );
}