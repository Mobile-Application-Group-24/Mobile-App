import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from '@/utils/supabase';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function Index() {
  console.log("INDEX SCREEN: Root index component rendering");
  
  const [session, setSession] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOnboarded, setIsOnboarded] = React.useState(null); // Set to null initially
  
  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Create a direct function to check the onboarding status
  const checkOnboardingStatus = async (userId) => {
    try {
      console.log("Direct check of onboarding status for user:", userId);
      
      // Direct call with no caching
      const { data, error } = await supabase
        .from('profiles')
        .select('is_onboarded')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Direct check error:", error);
        return false;
      }
      
      console.log("Direct check result:", data?.is_onboarded === true ? "COMPLETED" : "NOT COMPLETED");
      return data?.is_onboarded === true;
    } catch (err) {
      console.error("Exception in direct check:", err);
      return false;
    }
  };

  // Simplified effect to get session and check onboarding once
  useEffect(() => {
    async function initialize() {
      try {
        console.log("Initializing app...");
        // Get the session
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setIsLoading(false);
          return;
        }
        
        // Set the session state
        setSession(sessionData.session);
        
        // If logged in, check onboarding status
        if (sessionData.session?.user) {
          const userId = sessionData.session.user.id;
          console.log("User is logged in, checking onboarding status");
          
          // Check onboarding directly
          const onboardingResult = await checkOnboardingStatus(userId);
          console.log("Onboarding check result:", onboardingResult ? "USER IS ONBOARDED" : "USER NEEDS ONBOARDING");
          
          // Set the onboarding state
          setIsOnboarded(onboardingResult);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    initialize();
    
    // Set up auth listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      setSession(newSession);
      
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Check onboarding on sign in
        const onboardingResult = await checkOnboardingStatus(newSession.user.id);
        setIsOnboarded(onboardingResult);
      } else if (event === 'SIGNED_OUT') {
        setIsOnboarded(false);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Show loading while initializing
  if (isLoading || (!fontsLoaded && !fontError) || isOnboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#8E8E93' }}>Loading app...</Text>
      </View>
    );
  }

  console.log("Rendering redirects. Session:", session ? "EXISTS" : "NONE", "Onboarded:", isOnboarded ? "YES" : "NO");

  // Render the appropriate redirect with explicit paths
  if (!session) {
    return <Redirect href="/(auth)/login" replace />;
  }
  
  if (isOnboarded) {
    console.log("Redirecting to tabs/workouts");
    return <Redirect href="/(tabs)/workouts" replace />;
  }
  
  return <Redirect href="/(onboarding)/goals" replace />;
}