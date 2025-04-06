import { supabase } from './supabase';

interface User {
  id: string;
  email: string;
  is_onboarded: boolean;
}

const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, is_onboarded')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

const getUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const profile = await getUserProfile(user.id);

    return {
      id: user.id,
      email: user.email || '',
      is_onboarded: profile?.is_onboarded || false,
    };
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export { getUser, getUserProfile };