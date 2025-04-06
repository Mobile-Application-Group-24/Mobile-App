import React, { useEffect } from 'react';
import { Redirect } from 'expo-router';

export default function OnboardingIndex() {
  console.log("SCREEN: Onboarding index page rendering");
  
  useEffect(() => {
    console.log("NAVIGATION: Onboarding index mounted, will redirect to goals");
  }, []);
  
  return <Redirect href="/(onboarding)/goals" />;
}
