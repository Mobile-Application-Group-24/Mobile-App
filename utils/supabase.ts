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

// Get stats for all exercises - Updated to work directly with workouts table
export async function getExerciseStats(userId: string): Promise<ExerciseStats[]> {
  try {
    console.log('Fetching exercise stats from workouts table for user:', userId);
    
    // Get all workouts with exercises
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('id, date, exercises')
      .eq('user_id', userId)
      .order('date', { ascending: false });
      
    if (workoutsError) {
      console.error('Error fetching workouts for stats:', workoutsError);
      throw workoutsError;
    }

    // Get favorite exercises if that table exists
    let favoriteIds = new Set<string>();
    try {
      const { data: favorites } = await supabase
        .from('favorite_exercises')
        .select('exercise_id')
        .eq('user_id', userId);
        
      if (favorites) {
        favoriteIds = new Set(favorites.map(f => f.exercise_id));
      }
    } catch (favError) {
      console.warn('Could not fetch favorite exercises (table may not exist):', favError);
      // Continue without favorites
    }

    // Process workouts to extract exercise stats
    const exerciseMap = new Map<string, ExerciseStats>();
    
    // Track the most recent workout date for each exercise
    const lastUsedMap = new Map<string, string>();
    
    // Process each workout
    workouts?.forEach(workout => {
      if (!workout.exercises || !Array.isArray(workout.exercises)) return;
      
      workout.exercises.forEach(exercise => {
        if (!exercise || !exercise.id || !exercise.name) return;
        
        const exerciseId = exercise.id;
        const exerciseName = exercise.name;
        
        // Update last used date for this exercise
        if (!lastUsedMap.has(exerciseId) || new Date(workout.date) > new Date(lastUsedMap.get(exerciseId) || '')) {
          lastUsedMap.set(exerciseId, workout.date);
        }
        
        // Initialize stats object if needed
        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, {
            id: generateUUID(), // Use our custom UUID generator instead of crypto.randomUUID()
            exercise_id: exerciseId,
            exercise_name: exerciseName,
            max_weight: 0,
            max_reps: 0,
            total_volume: 0,
            total_sessions: 0,
            last_used: workout.date,
            is_favorite: favoriteIds.has(exerciseId),
            progress: 0 // Will calculate this later if possible
          });
        }
        
        // Update session count
        const stats = exerciseMap.get(exerciseId)!;
        stats.total_sessions += 1;
        
        // Process set details to update max weight, max reps, and total volume
        if (exercise.setDetails && Array.isArray(exercise.setDetails)) {
          exercise.setDetails.forEach(set => {
            if (!set) return;
            
            const weight = typeof set.weight === 'number' ? set.weight : 
                          (set.weight ? parseFloat(set.weight) : 0);
            
            const reps = typeof set.reps === 'number' ? set.reps : 
                        (set.reps ? parseInt(set.reps, 10) : 0);
            
            // Only count sets with both weight and reps
            if (weight > 0 && reps > 0) {
              // Update max weight
              if (weight > stats.max_weight) {
                stats.max_weight = weight;
              }
              
              // Update max reps
              if (reps > stats.max_reps) {
                stats.max_reps = reps;
              }
              
              // Add to total volume
              stats.total_volume += weight * reps;
            }
          });
        }
      });
    });
    
    // Update last used dates
    exerciseMap.forEach((stats, exerciseId) => {
      stats.last_used = lastUsedMap.get(exerciseId) || stats.last_used;
    });
    
    // Calculate progress by comparing latest workout with previous
    // Group workouts by exercise and sort by date
    const exerciseWorkouts = new Map<string, any[]>();
    
    workouts?.forEach(workout => {
      if (!workout.exercises || !Array.isArray(workout.exercises)) return;
      
      workout.exercises.forEach(exercise => {
        if (!exercise || !exercise.id) return;
        
        const exerciseId = exercise.id;
        
        if (!exerciseWorkouts.has(exerciseId)) {
          exerciseWorkouts.set(exerciseId, []);
        }
        
        exerciseWorkouts.get(exerciseId)?.push({
          date: workout.date,
          exercise: exercise
        });
      });
    });
    
    // Calculate progress for each exercise
    exerciseWorkouts.forEach((workoutList, exerciseId) => {
      if (workoutList.length < 2 || !exerciseMap.has(exerciseId)) return;
      
      // Sort by date descending
      workoutList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestWorkout = workoutList[0];
      const previousWorkout = workoutList[1];
      
      // Calculate average weight for latest workout
      let latestTotalWeight = 0;
      let latestSetCount = 0;
      
      if (latestWorkout.exercise.setDetails && Array.isArray(latestWorkout.exercise.setDetails)) {
        latestWorkout.exercise.setDetails.forEach(set => {
          if (!set) return;
          
          const weight = typeof set.weight === 'number' ? set.weight : 
                        (set.weight ? parseFloat(set.weight) : 0);
          
          if (weight > 0) {
            latestTotalWeight += weight;
            latestSetCount++;
          }
        });
      }
      
      // Calculate average weight for previous workout
      let previousTotalWeight = 0;
      let previousSetCount = 0;
      
      if (previousWorkout.exercise.setDetails && Array.isArray(previousWorkout.exercise.setDetails)) {
        previousWorkout.exercise.setDetails.forEach(set => {
          if (!set) return;
          
          const weight = typeof set.weight === 'number' ? set.weight : 
                        (set.weight ? parseFloat(set.weight) : 0);
          
          if (weight > 0) {
            previousTotalWeight += weight;
            previousSetCount++;
          }
        });
      }
      
      // Only calculate progress if we have valid sets in both workouts
      if (latestSetCount > 0 && previousSetCount > 0) {
        const latestAvg = latestTotalWeight / latestSetCount;
        const previousAvg = previousTotalWeight / previousSetCount;
        
        if (previousAvg > 0) {
          const progressPercent = Math.round(((latestAvg - previousAvg) / previousAvg) * 100);
          exerciseMap.get(exerciseId)!.progress = progressPercent;
        }
      }
    });
    
    return Array.from(exerciseMap.values());
  } catch (error) {
    console.error('Error calculating exercise stats from workouts:', error);
    throw error;
  }
}

// Get history for a specific exercise
export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<ExerciseHistory[]> {
  const { data, error } = await supabase
    .from('exercise_history')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Update exercise stats after workout
export async function updateExerciseStats(
  userId: string,
  exerciseData: {
    exercise_id: string;
    exercise_name: string;
    weight: number;
    reps: number;
    workout_id: string;
  }
) {
  const volume = exerciseData.weight * exerciseData.reps;

  // First, update or insert the stats
  const { data: existingStats } = await supabase
    .from('exercise_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseData.exercise_id)
    .single();

  if (existingStats) {
    // Update existing stats
    await supabase
      .from('exercise_stats')
      .update({
        max_weight: Math.max(existingStats.max_weight || 0, exerciseData.weight),
        max_reps: Math.max(existingStats.max_reps || 0, exerciseData.reps),
        total_volume: (existingStats.total_volume || 0) + volume,
        total_sessions: (existingStats.total_sessions || 0) + 1,
        last_used: new Date().toISOString()
      })
      .eq('id', existingStats.id);
  } else {
    // Insert new stats
    await supabase
      .from('exercise_stats')
      .insert({
        user_id: userId,
        exercise_id: exerciseData.exercise_id,
        exercise_name: exerciseData.exercise_name,
        max_weight: exerciseData.weight,
        max_reps: exerciseData.reps,
        total_volume: volume,
        total_sessions: 1,
        last_used: new Date().toISOString()
      });
  }

  // Then, add to history
  await supabase
    .from('exercise_history')
    .insert({
      user_id: userId,
      exercise_id: exerciseData.exercise_id,
      workout_id: exerciseData.workout_id,
      weight: exerciseData.weight,
      reps: exerciseData.reps,
      volume: volume,
      date: new Date().toISOString()
    });
}

// Toggle favorite status
export async function toggleExerciseFavorite(
  userId: string,
  exerciseId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorite_exercises')
    .select()
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .single();

  if (existing) {
    await supabase
      .from('favorite_exercises')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);
    return false;
  } else {
    await supabase
      .from('favorite_exercises')
      .insert({ user_id: userId, exercise_id: exerciseId });
    return true;
  }
}

// Get progress data for charts
export async function getExerciseProgress(
  userId: string,
  exerciseId: string,
  period: 'week' | 'month' | 'year' = 'month'
): Promise<{
  labels: string[];
  volumes: number[];
  weights: number[];
}> {
  const { data, error } = await supabase
    .from('exercise_history')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('date', { ascending: true });

  if (error) throw error;

  // Process data for charts
  // ... Implementiere die Datenverarbeitung für Charts ...
  return {
    labels: [],
    volumes: [],
    weights: []
  };
}