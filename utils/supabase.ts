import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { startOfDay, endOfDay } from 'date-fns';

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
  points?: number; 
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
  uses_left: number | null; 
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
  last_workout_id?: string; 
  is_used?: boolean; 
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

const invitationCodeMap = new Map<string, string>();

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;

  const stats = await getUserWorkoutStats(userId);

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

    query = query.or(`owner_id.eq.${userData.user.id},id.in.(${memberGroupIds.join(',')})`);
  } else {

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

  const userIds = data.map(member => member.user_id);
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);
  if (profilesError) throw profilesError;

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

  const membersWithPoints = await Promise.all(
    membersWithProfiles.map(async (member) => {
      const points = await calculateUserPoints(member.user_id);
      return {
        ...member,
        points
      };
    })
  );

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

export async function getCurrentUser() {
  try {

    const { data: userData, error } = await supabase.auth.getUser();

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

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0); 

  const { data, error } = await supabase
      .from('meals')
      .select('consumed_at, calories, meal_type')
      .eq('user_id', userData.user.id)
      .gte('consumed_at', sevenDaysAgo.toISOString())
      .lte('consumed_at', today.toISOString())
      .order('consumed_at', { ascending: true });
  
  if (error) throw error;

  const dailyCalories = data.reduce((acc, meal) => {

    if (meal.meal_type === 'water') return acc;
    
    const date = new Date(meal.consumed_at).toISOString().split('T')[0];

    const mealCalories = typeof meal.calories === 'number' ? meal.calories : parseInt(String(meal.calories)) || 0;
    acc[date] = (acc[date] || 0) + mealCalories;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(dailyCalories).map(([date, calories]) => ({
    date,
    calories,
  }));
}

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

export async function createWorkoutPlan(planData: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutPlan> {
  try {
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

    const updateData = { ...updates };

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

    const newExercise: PlanExercise = {
      id: exerciseData.id,
      name: exerciseData.name,
      sets: exerciseData.sets,
      type: exerciseData.type
    };

    const updatedExercises = plan.exercises ? [...plan.exercises, newExercise] : [newExercise];
    
    console.log('Saving updated exercises to plan:', JSON.stringify(updatedExercises));

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

export async function createWorkout(workoutData: Omit<Workout, 'id' | 'created_at'>, exercisesData?: any[]): Promise<Workout> {
  try {
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

export async function getUserWorkoutStats(userId: string): Promise<UserStats> {
  try {
    console.log(`Calculating stats for user ID: ${userId}`);

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

    const totalWorkouts = workouts.length;

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

    let totalVolume = 0;
    workouts.forEach(workout => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        workout.exercises.forEach(exercise => {
          if (exercise.setDetails && Array.isArray(exercise.setDetails)) {
            exercise.setDetails.forEach(set => {
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

export async function calculateUserPoints(userId: string): Promise<number> {
  try {
    const stats = await getUserWorkoutStats(userId);

    const workoutPoints = stats.workouts * 10; 
    const hourPoints = stats.hours * 5;      
    const volumePoints = Math.floor(stats.volume / 100); 
    
    const totalPoints = workoutPoints + hourPoints + volumePoints;
    return totalPoints;
  } catch (error) {
    console.error('Error calculating user points:', error);
    return 0;
  }
}

export async function createGroupInvitation(groupId: string, options?: { expiresIn?: number, maxUses?: number | null }): Promise<GroupInvitation> {
  try {
    console.log('Creating group invitation for group:', groupId);
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('User not authenticated when creating invitation');
      throw new Error('User not authenticated');
    }

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

    const expiresIn = options?.expiresIn || 7 * 24 * 60 * 60 * 1000; 
    const expiresAt = new Date(Date.now() + expiresIn).toISOString();

    invitationCodeMap.set(code, groupId);
    console.log('Stored invitation in memory map');
 
    const invitationData = {
      group_id: groupId,
      code: code,
      created_by: userData.user.id,
      expires_at: expiresAt,
      is_active: true,
      uses_left: options?.maxUses || null, 
    };
   
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

      } else if (data) {
        console.log('Invitation successfully saved to database');
        return data;
      }
    } catch (dbError) {
      console.warn('Exception when saving invitation to database:', dbError);
    }

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
    console.error('Error in createGroupInvitation:', error);

    const fallbackCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    invitationCodeMap.set(fallbackCode, groupId);
    
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

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error('User authentication error when using invitation:', userError);
      return { success: false, error: 'User not authenticated' };
    }
    
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
    }

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

    if (!invitation.id.startsWith('temp-') && !invitation.id.startsWith('error-fallback-') && invitation.uses_left !== null) {
      try {
        console.log('Updating invitation uses count');
        
        const { error: updateError } = await supabase
          .from('group_invitations')
          .update({ uses_left: invitation.uses_left - 1 })
          .eq('id', invitation.id);
        
        if (updateError) {
          console.warn('Error updating invitation uses:', updateError);
        }
      } catch (updateError) {
        console.warn('Exception updating invitation uses:', updateError);
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
    const groupId = invitationCodeMap.get(code);
    if (groupId) {
      return {
        id: 'temp-' + Date.now(),
        group_id: groupId,
        code: code,
        created_by: 'unknown',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
): Promise<AISuggestion[]> {
  try {
    if (!data || data.length === 0) {
      console.log(`No ${suggestionType} suggestions to save`);
      return [];
    }

    const formattedSuggestions = data.map(suggestion => ({
      user_id: userId,
      suggestion_type: suggestionType,
      data: suggestion,
      created_at: new Date().toISOString(),
      last_workout_id: lastWorkoutId,
      is_used: false
    }));
    
    const { data: savedSuggestions, error } = await supabase
      .from('ai_suggestions')
      .insert(formattedSuggestions)
      .select(); 
    
    if (error) {
      console.error(`Error saving ${suggestionType} suggestions:`, error);
      throw error;
    }
    
    console.log(`Successfully saved ${savedSuggestions.length} ${suggestionType} suggestions`);
    return savedSuggestions || [];
  } catch (error) {
    console.error(`Error in saveAISuggestions for ${suggestionType}:`, error);
    return [];
  }
}

export async function markAISuggestionAsUsed(suggestionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_suggestions')
      .delete()
      .eq('id', suggestionId);
    
    if (error) {
      console.error('Error deleting suggestion:', error);
      throw error;
    }
    console.log('Successfully deleted suggestion:', suggestionId);
  } catch (error) {
    console.error('Error in markAISuggestionAsUsed:', error);
  }
}

export async function deleteAllAISuggestions(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_suggestions')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error deleting all suggestions for user:', error);
      throw error;
    }
    console.log('Successfully deleted all AI suggestions for user:', userId);
  } catch (error) {
    console.error('Error in deleteAllAISuggestions:', error);
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
      const newExercise: WorkoutExercise = {
        id: `exercise-${Date.now()}`, 
        name: exerciseData.name,
        sets: exerciseData.sets,
        setDetails: exerciseData.setDetails || Array(exerciseData.sets).fill({}).map(() => ({
          id: `set-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          reps: 10,
          weight: 0,
          type: 'normal'
        }))
      };

      updatedExercises = workout.exercises ? [...workout.exercises, newExercise] : [newExercise];
      returnExercise = newExercise;
      
      console.log('Added new exercise to workout');
    } else {
      if (!workout.exercises || workout.exercises.length === 0) {
        throw new Error('No exercises found in workout');
      }
      
      const existingExerciseIndex = workout.exercises.findIndex(
        ex => ex.name.toLowerCase() === exerciseData.name.toLowerCase()
      );
      
      if (existingExerciseIndex === -1) {
        console.log('Exercise not found, adding as new exercise instead');
        return addExerciseToWorkout(workoutId, exerciseData, true);
      }

      updatedExercises = [...workout.exercises];
      const existingExercise = {...updatedExercises[existingExerciseIndex]};
      const newSets = Array(exerciseData.sets).fill({}).map(() => ({
        id: `set-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reps: 10,
        weight: existingExercise.setDetails && existingExercise.setDetails.length > 0 
          ? existingExercise.setDetails[0].weight || 0 
          : 0,
        type: 'normal'
      }));

      existingExercise.sets += exerciseData.sets;
      existingExercise.setDetails = [
        ...(existingExercise.setDetails || []),
        ...newSets
      ];

      updatedExercises[existingExerciseIndex] = existingExercise;
      
      console.log('Added additional sets to existing exercise');
      returnExercise = existingExercise;
    }
    
    console.log('Saving updated exercises to workout:', JSON.stringify(updatedExercises).substring(0, 200) + '...');

    const { data, error } = await supabase
      .from('workouts') 
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