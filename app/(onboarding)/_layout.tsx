import React, { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';

export default function OnboardingLayout() {
  const pathname = usePathname();
  
  useEffect(() => {
    console.log("ONBOARDING LAYOUT: Current path is", pathname);
  }, [pathname]);
  
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen 
        name="index"
        options={{ 
          gestureEnabled: false
        }}
      />
      <Stack.Screen 
        name="goals" 
        options={{ 
          gestureEnabled: false
        }}
      />
      <Stack.Screen 
        name="schedule" 
        options={{ 
          gestureEnabled: false
        }}
      />
    </Stack>
  );
}