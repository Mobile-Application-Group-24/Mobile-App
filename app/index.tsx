import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { supabase } from '@/utils/supabase';

SplashScreen.preventAutoHideAsync();

export default function Index() {
  console.log("INDEX SCREEN: Root index component rendering");
  
  const [session, setSession] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isOnboarded, setIsOnboarded] = React.useState(null); 

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const checkOnboardingStatus = async (userId) => {
    try {
      console.log("Direct check of onboarding status for user:", userId);

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

  useEffect(() => {
    async function initialize() {
      try {
        console.log("Initializing app...");

        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          setIsLoading(false);
          return;
        }

        setSession(sessionData.session);

        if (sessionData.session?.user) {
          const userId = sessionData.session.user.id;
          console.log("User is logged in, checking onboarding status");

          const onboardingResult = await checkOnboardingStatus(userId);
          console.log("Onboarding check result:", onboardingResult ? "USER IS ONBOARDED" : "USER NEEDS ONBOARDING");

          setIsOnboarded(onboardingResult);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      setSession(newSession);
      
      if (event === 'SIGNED_IN' && newSession?.user) {
   
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (isLoading || (!fontsLoaded && !fontError) || isOnboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#8E8E93' }}>Loading app...</Text>
      </View>
    );
  }

  console.log("Rendering redirects. Session:", session ? "EXISTS" : "NONE", "Onboarded:", isOnboarded ? "YES" : "NO");

  if (!session) {
    console.log("INDEX SCREEN: No auth session, redirecting to login");
    return <Redirect href="/(auth)/login" replace />;
  }
  
  if (isOnboarded) {
    console.log("INDEX SCREEN: User is authenticated and onboarded, redirecting to tabs with timestamp");
    return <Redirect href={`/(tabs)/workouts?t=${Date.now()}`} replace />;
  }
  
  console.log("INDEX SCREEN: User needs onboarding, redirecting to goals");
  return <Redirect href="/(onboarding)/goals" replace />;
}