import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

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

// Group functions
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
  
  let query = supabase
    .from('groups')
    .select(`
      *,
      member_count:group_members(count)
    `);

  if (showOwned && userData.user) {
    query = query.eq('owner_id', userData.user.id);
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
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      id,
      group_id,
      user_id,
      role,
      joined_at,
      profile:profiles!user_id(
        full_name,
        avatar_url
      )
    `)
    .eq('group_id', groupId);

  if (error) throw error;
  return data;
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