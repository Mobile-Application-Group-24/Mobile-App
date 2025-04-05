import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { startOfDay, endOfDay } from 'date-fns';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please connect to Supabase first.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  achievements: Achievement[];
  stats: UserStats;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  title: string;
  description: string;
  date_earned?: string;
}

export interface UserStats {
  workouts: number;
  hours: number;
  volume: number;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  max_members: number;
  is_private: boolean;
  created_at: string;
  owner_id: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface MealTime {
  name: string;
  time: string;
  enabled: boolean;
}

export interface NutritionSettings {
  user_id: string;
  calorie_goal: number;
  water_goal: number;
  water_notifications: boolean;
  water_interval: number;
  meal_times: MealTime[];
  updated_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'water';
  consumed_at: string;
  created_at: string;
}
export interface GroupInvitation {
  id: string;
  group_id: string;
  code: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  uses_left: number | null; // null means unlimited uses
  group?: Group;
}

// Store invitation codes in memory since database operations are failing
// This is a temporary solution until database issues are resolved
const invitationCodeMap = new Map<string, string>();

// Profile functions
export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

  if (error) throw error;
  return data;
}

export async function createGroup(groupData: Omit<Group, 'id' | 'created_at' | 'owner_id'>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
      .from('groups')
      .insert({
        ...groupData,
        owner_id: userData.user.id,
      })
      .select()
      .single();

  if (error) throw error;

  // Automatically add creator as owner in group_members
  const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: data.id,
        user_id: userData.user.id,
        role: 'owner',
      });

  if (memberError) throw memberError;

  return data;
}

export async function getGroups(showOwned = false) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // First get groups where user is a member
  const { data: memberGroups } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userData.user.id);

  const memberGroupIds = memberGroups?.map(g => g.group_id) || [];

  let query = supabase
    .from('groups')
    .select(`
      *,
      member_count:group_members(count)
    `);

  if (showOwned) {
    // Show groups where user is owner OR member
    query = query.or(`owner_id.eq.${userData.user.id},id.in.(${memberGroupIds.join(',')})`)
  } else {
    // Show public groups OR groups where user is member
    query = query.or(`is_private.eq.false,id.in.(${memberGroupIds.join(',')})`)
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(group => ({
    ...group,
    member_count: group.member_count[0].count,
  }));
}

export async function getGroupDetails(groupId: string) {
  const { data, error } = await supabase
      .from('groups')
      .select(`
      *,
      member_count:group_members(count)
    `)
      .eq('id', groupId)
      .single();

  if (error) throw error;

  return {
    ...data,
    member_count: data.member_count[0].count,
  };
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  // Using a join query approach instead of foreign key relationship
  const { data, error } = await supabase
      .from('group_members')
      .select(`
      id,
      group_id,
      user_id,
      role,
      joined_at
    `)
      .eq('group_id', groupId);

  if (error) throw error;

  // Get all profile data in a separate query
  const userIds = data.map(member => member.user_id);
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) throw profilesError;

  // Map profiles to members
  return data.map(member => {
    const profile = profilesData.find(p => p.id === member.user_id) || { full_name: null, avatar_url: null };
    return {
      ...member,
      profile: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      }
    };
  });
}

export async function joinGroup(groupId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userData.user.id,
        role: 'member',
      });

  if (error) throw error;
}

export async function leaveGroup(groupId: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('User not authenticated');

  const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userData.user.id);

  if (error) throw error;
  
  return true;
}

export async function updateGroup(groupId: string, updates: Partial<Group>) {
  const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select()
      .single();

  if (error) throw error;
  return data;
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

  if (error) throw error;
}

export async function removeMember(groupId: string, userId: string) {
  const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

  if (error) throw error;
}

// Nutrition Settings functions
export async function getNutritionSettings(): Promise<NutritionSettings> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
      .from('nutrition_settings')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();

  if (error) throw error;
  return data;
}

export async function updateNutritionSettings(updates: Partial<Omit<NutritionSettings, 'user_id' | 'updated_at'>>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
      .from('nutrition_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userData.user.id)
      .select()
      .single();

  if (error) throw error;
  return data;
}

// Meal tracking functions
export async function addMeal(meal: Omit<Meal, 'id' | 'user_id' | 'created_at'>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
      .from('meals')
      .insert({
        ...meal,
        user_id: userData.user.id,
      })
      .select()
      .single();

  if (error) throw error;
  return data;
}

export async function updateMeal(mealId: string, updates: Partial<Omit<Meal, 'id' | 'user_id' | 'created_at'>>) {
  const { data, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', mealId)
      .select()
      .single();

  if (error) throw error;
  return data;
}

export async function deleteMeal(mealId: string) {
  const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId);

  if (error) throw error;
}

export async function getTodaysMeals(): Promise<Meal[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');

  const today = new Date();

  const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', userData.user.id)
      .gte('consumed_at', startOfDay(today).toISOString())
      .lte('consumed_at', endOfDay(today).toISOString())
      .order('consumed_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getWeeklyMeals(): Promise<{ date: string; calories: number }[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
      .from('meals')
      .select('consumed_at, calories')
      .eq('user_id', userData.user.id)
      .gte('consumed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('consumed_at', { ascending: true });

  if (error) throw error;

  // Group meals by date and sum calories
  const dailyCalories = data.reduce((acc, meal) => {
    const date = new Date(meal.consumed_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + meal.calories;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(dailyCalories).map(([date, calories]) => ({
    date,
    calories,
  }));
}; // Diese schließende Klammer und Semikolon fehlten

// Invitation functions
export const createGroupInvitation = async (groupId: string, options: { expiresIn?: number, maxUses?: number } = {}) => {
  try {
    // Simple code generator
    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const invitationCode = generateCode();
    
    // Store the mapping in memory since database operations are failing
    invitationCodeMap.set(invitationCode, groupId);
    
    console.log(`Created invitation code ${invitationCode} for group ${groupId}`);
    
    return {
      code: invitationCode,
      group: { id: groupId }
    };
  } catch (error) {
    console.error('Error in createGroupInvitation:', error);
    throw error;
  }
};

export async function getGroupInvitation(code: string): Promise<any> {
  try {
    // First check our in-memory map
    const groupId = invitationCodeMap.get(code);
    
    if (groupId) {
      // If we found a mapping, try to get the group details
      try {
        const groupDetails = await getGroupDetails(groupId);
        return {
          code: code,
          group: {
            id: groupId,
            name: groupDetails.name
          }
        };
      } catch (err) {
        console.log('Group not found for code', code);
      }
    }
    
    // Fallback legacy implementation
    return {
      code: code,
      group: {
        id: code,
        name: "Your Group"
      }
    };
  } catch (error) {
    console.error('Error in getGroupInvitation:', error);
    throw error;
  }
}

export async function useGroupInvitation(code: string): Promise<Group> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('User not authenticated');
    
    // First check our in-memory map
    let groupId = invitationCodeMap.get(code.trim());
    
    // If not found in our map, check if it's a direct UUID
    if (!groupId && code.includes('-') && code.length >= 32) {
      groupId = code;
    }
    
    // Final fallback - if the code looks like a prefix of a UUID, try to find a match
    if (!groupId) {
      try {
        const groups = await getGroups(false);
        const matchingGroup = groups.find(group => 
          group.id.toLowerCase().startsWith(code.toLowerCase())
        );
        
        if (matchingGroup) {
          groupId = matchingGroup.id;
        }
      } catch (err) {
        console.error('Error finding group by prefix:', err);
      }
    }
    
    // If we still don't have a valid group ID, throw an error
    if (!groupId) {
      throw new Error('Invalid invitation code');
    }
    
    // Check if the user is already a member
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    
    if (existingMember) {
      throw new Error('You are already a member of this group');
    }
    
    // Add the user to the group
    await joinGroup(groupId);
    
    // Get the group details
    const groupDetails = await getGroupDetails(groupId);
    
    return groupDetails;
  } catch (error) {
    console.error('Error in useGroupInvitation:', error);
    
    // Improve error message for database errors
    if (error instanceof Error) {
      if (error.message.includes('syntax for type uuid')) {
        throw new Error('Invalid invitation code format');
      }
      throw error;
    }
    
    throw new Error('Invitation invalid or expired');
  }
}

export async function deactivateGroupInvitation(invitationId: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');
  
  // First check if user has permission to deactivate the invitation
  const { data: invitation, error: invitationError } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();
  
  if (invitationError) throw invitationError;
  
  // Check if user is the invitation creator or group owner
  const { data: membership, error: membershipError } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', invitation.group_id)
    .eq('user_id', userData.user.id)
    .single();
  
  if (membershipError) throw membershipError;
  
  if (invitation.created_by !== userData.user.id && membership.role !== 'owner') {
    throw new Error('You do not have permission to deactivate this invitation');
  }
  
  const { error } = await supabase
    .from('group_invitations')
    .update({ is_active: false })
    .eq('id', invitationId);
  
  if (error) throw error;
}

export async function getActiveGroupInvitations(groupId: string): Promise<GroupInvitation[]> {
  const { data, error } = await supabase
    .from('group_invitations')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .gte('expires_at', new Date().toISOString());
  
  if (error) throw error;
  return data;
}

export async function joinGroupWithCode(code: string) {
  if (!code || code.trim() === '') {
    throw new Error('Invalid invitation code');
  }
  
  try {
    const cleanCode = code.trim();
    
    // First check our in-memory map for this exact code
    const groupIdFromMap = invitationCodeMap.get(cleanCode);
    if (groupIdFromMap) {
      console.log(`Found group ID ${groupIdFromMap} for code ${cleanCode}`);
      // Redirect to join page with both code and groupId
      return {
        success: true,
        groupId: groupIdFromMap,
        code: cleanCode,
        redirectToJoin: true
      };
    }
    
    // Check if it's a UUID format (direct group ID)
    if (cleanCode.includes('-') && cleanCode.length >= 32) {
      try {
        const groupDetails = await getGroupDetails(cleanCode);
        return {
          success: true,
          groupId: groupDetails.id,
          groupName: groupDetails.name,
          redirectToJoin: true
        };
      } catch (error) {
        console.error('Invalid group ID:', error);
        throw new Error('Invalid group ID');
      }
    }
    
    // For all other codes, redirect to join screen with just the code
    // The join screen will handle finding the right group
    return {
      success: true,
      code: cleanCode,
      redirectToJoin: true
    };
  } catch (error) {
    console.error('Error joining group with code:', error);
    throw error instanceof Error ? error : new Error('Failed to join group with this code');
  }
}

export async function deleteUserAccount() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('User not authenticated');

  // Delete all user data first
  try {
    // Delete profile data
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userData.user.id);

    // Delete user's group memberships
    await supabase
      .from('group_members')
      .delete()
      .eq('user_id', userData.user.id);

    // Delete user's meals
    await supabase
      .from('meals')
      .delete()
      .eq('user_id', userData.user.id);

    // Delete user's nutrition settings
    await supabase
      .from('nutrition_settings')
      .delete()
      .eq('user_id', userData.user.id);

    // Finally, delete the user's auth account
    const { error: deleteError } = await supabase.rpc('delete_user');
    if (deleteError) throw deleteError;

  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}
