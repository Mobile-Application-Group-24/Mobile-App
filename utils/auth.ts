import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    console.log('Session hook initializing');
    
    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          console.log('Session loaded:', data.session ? 'Found' : 'Not found');
          setSession(data.session);
        }
      } catch (err) {
        console.error('Exception getting session:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session ? 'User logged in' : 'No session');
      setSession(session);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}

export async function checkAuthState() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error checking auth state:', error);
      return { authenticated: false, error };
    }
    
    if (!data.session) {
      return { authenticated: false };
    }
    
    return { 
      authenticated: true, 
      user: data.session.user,
      session: data.session
    };
  } catch (error) {
    console.error('Exception checking auth state:', error);
    return { authenticated: false, error };
  }
}
