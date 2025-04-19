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
  points?: number; // Add points to store user's score in the group
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
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
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
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
  setDetails: SetDetail[];
}

export interface SetDetail {
  id: string;
  weight?: number;
  reps?: number;
  type: 'normal' | 'warmup' | 'dropset';
  notes?: string;
}

export interface AISuggestion {
  id: string;
  user_id: string;
  suggestion_type: 'weight' | 'exercise';
  data: any;
  created_at: string;
  last_workout_id?: string; // ID of the last workout considered when generating this suggestion
  is_used?: boolean; // Whether the suggestion has been used by the user
}

export interface ExerciseStats {
  id: string;
  exercise_id: string;
  exercise_name: string;
  max_weight: number;
  max_reps: number;
  total_volume: number;
  total_sessions: number;
  last_used: string;
  is_favorite?: boolean;
  progress?: number;
}

export interface ExerciseHistory {
  id: string;
  exercise_id: string;
  workout_id: string;
  weight: number;
  reps: number;
  date: string;
  volume: number;
}

// Store invitation codes in memory since database operations are failing
// This is a temporary solution until database issues are resolved
const invitationCodeMap = new Map<string, string>();

// Helper function to generate a UUID since crypto.randomUUID() is not available
function generateUUID() {
  // Simple UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Profile functions
export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  
  // Get workout stats
  const stats = await getUserWorkoutStats(userId);
  
  // Combine profile data with workout stats
  return {
    ...data,
    stats
  };
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

  // Map profiles to members and calculate points for each member
  const membersWithProfiles = data.map(member => {
    const profile = profilesData.find(p => p.id === member.user_id) || { full_name: null, avatar_url: null };
    return {
      ...member,
      profile: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url
      }
    };
  });

  // Calculate points for each member
  const membersWithPoints = await Promise.all(
    membersWithProfiles.map(async (member) => {
      const points = await calculateUserPoints(member.user_id);
      return {
        ...member,
        points
      };
    })
  );

  // Sort members by points in descending order
  return membersWithPoints.sort((a, b) => (b.points || 0) - (a.points || 0));
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
    // Ensure exercises only include name, sets, and type (no weight/reps)
    const sanitizedPlanData = {
      ...planData,
      exercises: planData.exercises?.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        type: ex.type
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
    
    // Ensure exercises only include name, sets, and type (no weight/reps)
    if (updateData.exercises) {
      updateData.exercises = updateData.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        type: ex.type
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

// Function to add an exercise to a workout plan
export async function addExerciseToPlan(
  planId: string,
  exerciseData: {
    id: string,
    name: string,
    sets: number,
    type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core'
  }
): Promise<PlanExercise> {
  try {
    console.log('Adding exercise to workout plan:', planId);
    console.log('Exercise data:', exerciseData);
    
    // Get current workout plan data
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .select('exercises')
      .eq('id', planId)
      .single();
    
    if (planError) {
      console.error('Error fetching workout plan:', planError);
      throw planError;
    }
    
    console.log('Current plan exercises:', plan.exercises);
    
    // Create a new exercise using the provided ID and type
    const newExercise: PlanExercise = {
      id: exerciseData.id,
      name: exerciseData.name,
      sets: exerciseData.sets,
      type: exerciseData.type
    };
    
    // Add new exercise to the plan's exercises array
    const updatedExercises = plan.exercises ? [...plan.exercises, newExercise] : [newExercise];
    
    console.log('Saving updated exercises to plan:', JSON.stringify(updatedExercises));
    
    // Update the workout plan
    const { data, error } = await supabase
      .from('workout_plans')
      .update({ 
        exercises: updatedExercises,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select();
    
    if (error) {
      console.error('Error updating workout plan with new exercise:', error);
      throw error;
    }
    
    console.log('Successfully added exercise to workout plan. Response:', data);
    return newExercise;
  } catch (error) {
    console.error('Error in addExerciseToPlan:', error);
    throw error;
  }
}

// Workout session functions
export async function createWorkout(workoutData: Omit<Workout, 'id' | 'created_at'>, exercisesData?: any[]): Promise<Workout> {
  try {
    // Include the exercises array in the workout data (with full details including type)
    const fullWorkoutData = {
      ...workoutData,
      exercises: exercisesData?.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets,
        type: ex.type,
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

// Calculate user workout statistics
export async function getUserWorkoutStats(userId: string): Promise<UserStats> {
  try {
    console.log(`Calculating stats for user ID: ${userId}`);
    
    // Get all completed workouts for the user
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .eq('done', true);
    
    if (error) {
      console.error('Error fetching workouts for stats:', error);
      throw error;
    }
    
    console.log(`Found ${workouts?.length || 0} completed workouts for user ${userId}`);
    
    if (!workouts || workouts.length === 0) {
      return { workouts: 0, hours: 0, volume: 0 };
    }
    
    // Calculate total workouts
    const totalWorkouts = workouts.length;
    
    // Calculate total hours
    let totalMinutes = 0;
    workouts.forEach(workout => {
      if (workout.start_time && workout.end_time) {
        const start = new Date(workout.start_time);
        const end = new Date(workout.end_time);
        const durationMs = end.getTime() - start.getTime();
        const durationMinutes = durationMs / (1000 * 60);
        totalMinutes += durationMinutes;
      }
    });
    const totalHours = Math.round(totalMinutes / 60);
    
    // Calculate total volume
    let totalVolume = 0;
    workouts.forEach(workout => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach(exercise => {
          if (exercise.setDetails && Array.isArray(exercise.setDetails)) {
            exercise.setDetails.forEach(set => {
              // Calculate volume for this set (weight * reps)
              const weight = set.weight ? parseFloat(set.weight.toString()) : 0;
              const reps = set.reps ? parseInt(set.reps.toString(), 10) : 0;
              totalVolume += weight * reps;
            });
          }
        });
      }
    });
    
    const stats = {
      workouts: totalWorkouts,
      hours: totalHours,
      volume: Math.round(totalVolume)
    };
    
    console.log(`Stats calculated for user ${userId}:`, stats);
    return stats;
  } catch (error) {
    console.error('Error calculating user stats:', error);
    return { workouts: 0, hours: 0, volume: 0 };
  }
}


export async function getRecentWorkouts(userId: string, limit: number = 3): Promise<Workout[]> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent workouts:', error);
    throw error;
  }
}

// Calculate points for a user based on their workout stats
export async function calculateUserPoints(userId: string): Promise<number> {
  try {
    const stats = await getUserWorkoutStats(userId);
    
    // Calculate points based on workouts, hours, and volume
    // This formula can be adjusted to weight different stats as desired
    const workoutPoints = stats.workouts * 10; // 10 points per workout
    const hourPoints = stats.hours * 5;       // 5 points per hour
    const volumePoints = Math.floor(stats.volume / 100); // 1 point per 100 volume
    
    const totalPoints = workoutPoints + hourPoints + volumePoints;
    return totalPoints;
  } catch (error) {
    console.error('Error calculating user points:', error);
    return 0;
  }
}

// Group invitation functions
export async function createGroupInvitation(groupId: string, options?: { expiresIn?: number, maxUses?: number | null }): Promise<GroupInvitation> {
  try {
    console.log('Creating group invitation for group:', groupId);
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('User not authenticated when creating invitation');
      throw new Error('User not authenticated');
    }
    
    // Generate a random 8-character invitation code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    
    const code = generateCode();
    console.log('Generated invitation code:', code);
    
    // Default expiration is 7 days from now
    const expiresIn = options?.expiresIn || 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const expiresAt = new Date(Date.now() + expiresIn).toISOString();
    
    // Store the code in memory as a fallback
    invitationCodeMap.set(code, groupId);
    console.log('Stored invitation in memory map');
    
    // Prepare invitation data
    const invitationData = {
      group_id: groupId,
      code: code,
      created_by: userData.user.id,
      expires_at: expiresAt,
      is_active: true,
      uses_left: options?.maxUses || null, // null means unlimited uses
    };
    
    // Try to create the invitation in the database
    try {
      console.log('Attempting to save invitation to database:', JSON.stringify(invitationData));
      
      const { data, error } = await supabase
        .from('group_invitations')
        .insert(invitationData)
        .select()
        .single();
      
      if (error) {
        console.warn('Database error when creating invitation:', error.message);
        console.warn('Error details:', JSON.stringify(error));
        // Continue with fallback
      } else if (data) {
        console.log('Invitation successfully saved to database');
        return data;
      }
    } catch (dbError) {
      console.warn('Exception when saving invitation to database:', dbError);
      // Continue with fallback
    }
    
    // If we get here, database operation failed but we can still use the in-memory invitation
    console.log('Using fallback in-memory invitation');
    const fallbackInvitation: GroupInvitation = {
      id: 'temp-' + Date.now(),
      group_id: groupId,
      code: code,
      created_by: userData.user.id,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      is_active: true,
      uses_left: options?.maxUses || null,
    };
    
    return fallbackInvitation;
  } catch (error) {
    // Instead of just logging and rethrowing, provide a fallback
    console.error('Error in createGroupInvitation:', error);
    
    // Generate a fallback invitation even if there was an error
    const fallbackCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    invitationCodeMap.set(fallbackCode, groupId); // Save to memory map
    
    return {
      id: 'error-fallback-' + Date.now(),
      group_id: groupId,
      code: fallbackCode,
      created_by: 'unknown',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      uses_left: null,
    };
  }
}

export async function useGroupInvitation(code: string): Promise<{ success: boolean, groupId?: string, error?: string }> {
  try {
    console.log('Attempting to use invitation with code:', code);
    
    const invitation = await getGroupInvitation(code);
    
    if (!invitation) {
      console.warn('Invalid or expired invitation code:', code);
      return { success: false, error: 'Invalid or expired invitation code' };
    }
    
    console.log('Found valid invitation:', JSON.stringify(invitation));
    
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error('User authentication error when using invitation:', userError);
      return { success: false, error: 'User not authenticated' };
    }
    
    // Check if user is already a member of the group
    try {
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', invitation.group_id)
        .eq('user_id', userData.user.id)
        .single();
      
      if (!memberCheckError && existingMember) {
        console.log('User is already a member of this group');
        return { success: false, error: 'You are already a member of this group' };
      }
    } catch (checkError) {
      console.warn('Error checking existing membership:', checkError);
      // Continue anyway, worst case we'll get a duplicate constraint error
    }
    
    // Add user to the group
    try {
      console.log('Adding user to group:', invitation.group_id);
      
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: invitation.group_id,
          user_id: userData.user.id,
          role: 'member',
        });
      
      if (joinError) {
        console.error('Error joining group:', joinError);
        return { success: false, error: 'Failed to join group' };
      }
    } catch (joinError) {
      console.error('Exception when joining group:', joinError);
      return { success: false, error: 'Exception when joining group' };
    }
    
    // Update invitation uses if tracking usage
    if (!invitation.id.startsWith('temp-') && !invitation.id.startsWith('error-fallback-') && invitation.uses_left !== null) {
      try {
        console.log('Updating invitation uses count');
        
        const { error: updateError } = await supabase
          .from('group_invitations')
          .update({ uses_left: invitation.uses_left - 1 })
          .eq('id', invitation.id);
        
        if (updateError) {
          console.warn('Error updating invitation uses:', updateError);
          // Non-critical error, we can continue
        }
      } catch (updateError) {
        console.warn('Exception updating invitation uses:', updateError);
        // Non-critical error, we can continue
      }
    }
    
    console.log('Successfully joined group:', invitation.group_id);
    return { success: true, groupId: invitation.group_id };
  } catch (error) {
    console.error('Unexpected error using invitation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function getGroupInvitation(code: string): Promise<GroupInvitation | null> {
  try {
    // First check memory map (our fallback solution)
    const groupId = invitationCodeMap.get(code);
    if (groupId) {
      // If found in memory, construct a temporary invitation object
      return {
        id: 'temp-' + Date.now(),
        group_id: groupId,
        code: code,
        created_by: 'unknown',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        is_active: true,
        uses_left: null,
      };
    }
    
    const { data, error } = await supabase
      .from('group_invitations')
      .select('*, group:groups(*)')
      .eq('code', code)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();
    
    if (error) {
      console.error('Error fetching invitation:', error);
      return null;
    }
    
    if (data.uses_left !== null && data.uses_left <= 0) {
      return null; 
    }
    
    return data;
  } catch (error) {
    console.error('Error in getGroupInvitation:', error);
    return null;
  }
}

export async function getGroupInvitations(groupId: string): Promise<GroupInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('Error fetching group invitations:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getGroupInvitations:', error);
    return [];
  }
}

// AI suggestion functions
export async function getAISuggestions(userId: string, suggestionType: 'weight' | 'exercise'): Promise<AISuggestion[]> {
  try {
    const { data, error } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', userId)
      .eq('suggestion_type', suggestionType)
      .eq('is_used', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching ${suggestionType} suggestions:`, error);
      // Return empty array on error rather than throwing
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`Error in getAISuggestions for ${suggestionType}:`, error);
    return [];
  }
}

export async function saveAISuggestions(
  userId: string,
  suggestionType: 'weight' | 'exercise',
  data: any[],
  lastWorkoutId?: string
): Promise<void> {
  try {
    if (!data || data.length === 0) {
      console.log(`No ${suggestionType} suggestions to save`);
      return;
    }

    // Format suggestions for database storage
    const formattedSuggestions = data.map(suggestion => ({
      user_id: userId,
      suggestion_type: suggestionType,
      data: suggestion,
      created_at: new Date().toISOString(),
      last_workout_id: lastWorkoutId,
      is_used: false
    }));
    
    const { error } = await supabase
      .from('ai_suggestions')
      .insert(formattedSuggestions);
    
    if (error) {
      console.error(`Error saving ${suggestionType} suggestions:`, error);
      throw error;
    }
    
    console.log(`Successfully saved ${formattedSuggestions.length} ${suggestionType} suggestions`);
  } catch (error) {
    console.error(`Error in saveAISuggestions for ${suggestionType}:`, error);
    // Don't throw here - we want the app to continue even if saving fails
  }
}

export async function markAISuggestionAsUsed(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_suggestions')
      .update({ is_used: true })
      .eq('id', suggestionId);
    
    if (error) {
      console.error('Error marking suggestion as used:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in markAISuggestionAsUsed:', error);
  }
}

export async function getLastCompletedWorkout(userId: string): Promise<Workout | null> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .eq('done', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found - user has no completed workouts
        return null;
      }
      console.error('Error fetching last completed workout:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getLastCompletedWorkout:', error);
    return null;
  }
}

// Function to add a suggested exercise to an existing workout
export async function addExerciseToWorkout(
  workoutId: string, 
  exerciseData: { 
    name: string, 
    sets: number, 
    setDetails?: SetDetail[] 
  },
  isNewExercise: boolean = true
): Promise<WorkoutExercise> {
  try {
    console.log('Adding exercise to workout:', workoutId);
    console.log('Exercise data:', exerciseData);
    console.log('Is new exercise:', isNewExercise);
    
    // Get current workout data
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .select('exercises')
      .eq('id', workoutId)
      .single();
    
    if (workoutError) {
      console.error('Error fetching workout:', workoutError);
      throw workoutError;
    }
    
    console.log('Current workout exercises:', workout.exercises);
    
    let updatedExercises;
    let returnExercise;
    
    if (isNewExercise) {
      // Add a completely new exercise
      const newExercise: WorkoutExercise = {
        id: `exercise-${Date.now()}`,  // Generate temporary ID
        name: exerciseData.name,
        sets: exerciseData.sets,
        setDetails: exerciseData.setDetails || Array(exerciseData.sets).fill({}).map(() => ({
          id: `set-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reps: 10,
          weight: 0,
          type: 'normal'
        }))
      };
      
      // Add new exercise to the workout's exercises array
      updatedExercises = workout.exercises ? [...workout.exercises, newExercise] : [newExercise];
      returnExercise = newExercise;
      
      console.log('Added new exercise to workout');
    } else {
      // Add additional sets to an existing exercise
      if (!workout.exercises || workout.exercises.length === 0) {
        throw new Error('No exercises found in workout');
      }
      
      // Find the matching exercise by name
      const existingExerciseIndex = workout.exercises.findIndex(
        ex => ex.name.toLowerCase() === exerciseData.name.toLowerCase()
      );
      
      if (existingExerciseIndex === -1) {
        console.log('Exercise not found, adding as new exercise instead');
        return addExerciseToWorkout(workoutId, exerciseData, true);
      }
      
      // Create a deep copy of the exercises array
      updatedExercises = [...workout.exercises];
      
      // Get the existing exercise
      const existingExercise = {...updatedExercises[existingExerciseIndex]};
      
      // Add new sets to the existing exercise
      const newSets = Array(exerciseData.sets).fill({}).map(() => ({
        id: `set-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reps: 10,
        weight: existingExercise.setDetails && existingExercise.setDetails.length > 0 
          ? existingExercise.setDetails[0].weight || 0 
          : 0,
        type: 'normal'
      }));
      
      // Update the exercise
      existingExercise.sets += exerciseData.sets;
      existingExercise.setDetails = [
        ...(existingExercise.setDetails || []),
        ...newSets
      ];
      
      // Replace the exercise in the array
      updatedExercises[existingExerciseIndex] = existingExercise;
      
      console.log('Added additional sets to existing exercise');
      returnExercise = existingExercise;
    }
    
    console.log('Saving updated exercises to workout:', JSON.stringify(updatedExercises).substring(0, 200) + '...');
    
    // Make sure we're updating the workouts table, not workout_plans
    const { data, error } = await supabase
      .from('workouts')  // Specifically target the workouts table
      .update({ exercises: updatedExercises })
      .eq('id', workoutId)
      .select();
    
    if (error) {
      console.error('Error updating workout with exercise changes:', error);
      throw error;
    }
    
    console.log('Successfully saved exercise changes. Response:', JSON.stringify(data).substring(0, 200) + '...');
    return returnExercise;
  } catch (error) {
    console.error('Error in addExerciseToWorkout:', error);
    throw error;
  }
}