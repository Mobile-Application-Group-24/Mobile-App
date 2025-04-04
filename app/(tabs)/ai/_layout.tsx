import { Stack } from 'expo-router';
import React from 'react';

export default function AILayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: 'AI Coach Chat',
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