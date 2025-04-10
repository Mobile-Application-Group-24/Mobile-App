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

export interface WorkoutPlan {
  id: string;
  title: string;
  description?: string;
  workout_type: 'split' | 'custom';
  day_of_week?: string | null;
  duration_minutes: number;
  exercises: PlanExercise[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
}

export interface Workout {
  id: string;
  workout_plan_id: string;
  title: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  notes: string;
  calories_burned: number;
  bodyweight?: number;
  exercises?: WorkoutExercise[];
  done: boolean;
  user_id: string;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  setDetails: SetDetail[];
}

export interface SetDetail {
  id: string;
  weight?: number;
  reps?: number;
  type: 'normal' | 'warmup' | 'dropset';
  notes?: string;
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
    query = query.or(`owner_id.eq.${userData.user.id},id.in.(${memberGroupIds.join(',')})`);
  } else {
    // Show public groups OR groups where user is member
    query = query.or(`is_private.eq.false,id.in.(${memberGroupIds.join(',')})`);
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

// Enhanced function to get current user with session refresh
export async function getCurrentUser() {
  try {
    // First try to get the user normally
    const { data: userData, error } = await supabase.auth.getUser();
    
    // If there's an error or no user, try to refresh the session
    if (error || !userData?.user) {
      console.log('Session may have expired, attempting to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData?.user) {
        console.error('Failed to refresh authentication session:', refreshError);
        throw new Error('Not authenticated');
      }
      
      console.log('Session successfully refreshed');
      return refreshData.user;
    }
    
    return userData.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw new Error('Not authenticated');
  }
}

// Nutrition Settings functions with enhanced authentication
export async function getNutritionSettings(): Promise<NutritionSettings> {
  try {
    const user = await getCurrentUser();
    
    const { data, error } = await supabase
      .from('nutrition_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching nutrition settings:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get nutrition settings:', error);
    throw error;
  }
}

export async function updateNutritionSettings(updates: Partial<Omit<NutritionSettings, 'user_id' | 'updated_at'>>) {
  try {
    const user = await getCurrentUser();
    
    const { data, error } = await supabase
      .from('nutrition_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating nutrition settings:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to update nutrition settings:', error);
    throw error;
  }
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

  // Get exactly 7 days including today
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0); // Start of day 7 days ago

  const { data, error } = await supabase
      .from('meals')
      .select('consumed_at, calories, meal_type')
      .eq('user_id', userData.user.id)
      .gte('consumed_at', sevenDaysAgo.toISOString())
      .lte('consumed_at', today.toISOString())
      .order('consumed_at', { ascending: true });
  
  if (error) throw error;

  // Group meals by date and sum calories
  const dailyCalories = data.reduce((acc, meal) => {
    // Skip water entries as they're not calories
    if (meal.meal_type === 'water') return acc;
    
    const date = new Date(meal.consumed_at).toISOString().split('T')[0];
    // Ensure calories is a number
    const mealCalories = typeof meal.calories === 'number' ? meal.calories : parseInt(String(meal.calories)) || 0;
    acc[date] = (acc[date] || 0) + mealCalories;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(dailyCalories).map(([date, calories]) => ({
    date,
    calories,
  }));
}

// Function to update a workout with body weight
export async function updateWorkoutWithBodyWeight(workoutId: string, updates: Partial<Workout>) {
  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
    .select()
    .single();
  if (error) {
    console.error('Error updating workout:', error);
    throw error;
  }
  return data;
}

// Function to get workouts with body weight
export async function getWorkoutWithBodyWeight(workoutId: string): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, exercises:workout_exercises(*)')
    .eq('id', workoutId)
    .single();
  if (error) {
    console.error('Error getting workout:', error);
    throw error;
  }
  return data;
}

// Function to update workout completion status
export async function updateWorkoutCompletionStatus(workoutId: string, isDone: boolean) {
  const { data, error } = await supabase
    .from('workouts')
    .update({ done: isDone })
    .eq('id', workoutId)
    .select()
    .single();

  if (error) {
    console.error('Error updating workout completion status:', error);
    throw error;
  }
  return data;
}

// Workout plan functions
export async function createWorkoutPlan(planData: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutPlan> {
  try {
    // Ensure exercises only include name and sets (no weight/reps)
    const sanitizedPlanData = {
      ...planData,
      exercises: planData.exercises?.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets
      }))
    };
    
    console.log('Sending to Supabase:', JSON.stringify(sanitizedPlanData));
    
    const { data, error } = await supabase
      .from('workout_plans')
      .insert(sanitizedPlanData)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating workout plan:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned from workout plan creation');
    }
    
    return data;
  } catch (error) {
    console.error('Error in createWorkoutPlan function:', error);
    throw error;
  }
}

export async function getWorkoutPlans(userId: string): Promise<WorkoutPlan[]> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    throw error;
  }
}

export async function updateWorkoutPlan(planId: string, updates: Partial<WorkoutPlan>): Promise<WorkoutPlan> {
  try {
    // Make a deep copy to avoid modifying the original object
    const updateData = { ...updates };
    
    // Ensure exercises only include name and sets (no weight/reps)
    if (updateData.exercises) {
      updateData.exercises = updateData.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets
      }));
    }
    
    const { data, error } = await supabase
      .from('workout_plans')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating workout plan:', error);
    throw error;
  }
}

export async function deleteWorkoutPlan(planId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', planId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    throw error;
  }
}

// Workout session functions
export async function createWorkout(workoutData: Omit<Workout, 'id' | 'created_at'>, exercisesData?: any[]): Promise<Workout> {
  try {
    // Include the exercises array in the workout data (with full details)
    const fullWorkoutData = {
      ...workoutData,
      exercises: exercisesData?.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        setDetails: ex.setDetails || []
      }))
    };
    
    // 1. Create the workout entry with exercises included (assuming the column exists)
    const { data, error } = await supabase
      .from('workouts')
      .insert(fullWorkoutData)
      .select()
      .single();
    
    if (error) {
      console.error('Error inserting workout:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating workout session:', error);
    throw error;
  }
}

export async function getWorkouts(userId: string, workoutPlanId?: string): Promise<Workout[]> {
  try {
    let query = supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId);
    
    if (workoutPlanId) {
      query = query.eq('workout_plan_id', workoutPlanId);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
}

export async function updateWorkout(workoutId: string, updates: Partial<Workout>): Promise<Workout> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', workoutId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating workout:', error);
    throw error;
  }
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
}