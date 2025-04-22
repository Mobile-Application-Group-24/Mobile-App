import { supabase } from './supabase';
import { exercisesByWorkoutType } from './exercises';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: number; 
  weight?: number; 
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core'; 
}

export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
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

export interface Workout {
  id: string;
  title: string;
  description?: string;
  workout_type: 'split' | 'custom';
  day_of_week?: string | null;
  duration_minutes: number;
  exercises?: Exercise[];
  user_id: string;
  created_at: string;
  done?: boolean;
}

export { exercisesByWorkoutType };

/**
 * Generates workout templates based on the user's training schedule
 */
export async function generateWorkoutsFromSchedule(schedule, userId) {
  const workoutDays = schedule.filter(day => day.workout !== 'Rest');
  const workoutPlansToCreate = [];

  const today = new Date();
  
  for (const day of workoutDays) {
    const workoutType = day.workout;
    const title = `${day.day} - ${workoutType}`;

    const workoutPlan = {
      title,
      user_id: userId,
      day_of_week: day.day,
      workout_type: 'split', 
      duration_minutes: 60,  
      exercises: [],  
      description: `Auto-generated ${workoutType} workout for ${day.day}`,
    };
    
    workoutPlansToCreate.push(workoutPlan);
  }

  try {
    if (workoutPlansToCreate.length === 0) {
      console.log("No workout plans to create");
      return 0;
    }
    
    console.log("Creating empty workout templates:", JSON.stringify(workoutPlansToCreate, null, 2).substring(0, 200) + "...");
    
    const { data, error } = await supabase
      .from('workout_plans')
      .insert(workoutPlansToCreate)
      .select();
      
    if (error) {
      console.error("Error creating workout plans:", error);
      throw error;
    }
    
    console.log(`Successfully created ${workoutPlansToCreate.length} workout plans`);
    return workoutPlansToCreate.length;
  } catch (error) {
    console.error("Failed to create workout plans:", error);
    throw error;
  }
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  try {
    const { data: workoutPlans, error: plansError } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId);
    
    if (plansError) throw plansError;

    const { data: workoutSessions, error: sessionsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId);
    
    if (sessionsError) throw sessionsError;

    const combinedWorkouts = [
      ...(workoutPlans || []).map(plan => ({
        ...plan,
      })),
      ...(workoutSessions || [])
    ];
    
    return combinedWorkouts;
  } catch (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
}

export async function getWorkout(id: string): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching workout:', error);
    throw error;
  }

  return data;
}

export async function getWorkoutPlan(id: string): Promise<WorkoutPlan> {
  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching workout plan:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getWorkoutPlan:', error);
    throw error;
  }
}

export async function createWorkout(workoutData: Omit<Workout, 'id' | 'created_at'>): Promise<Workout> {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .insert(workoutData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating workout session:', error);
    throw error;
  }
}

export async function updateWorkout(id: string, workout: Partial<Workout>): Promise<Workout> {
  try {
    console.log('Updating workout with:', JSON.stringify(workout, null, 2));
    
    const { data, error } = await supabase
      .from('workouts')
      .update({
        title: workout.name, 
        notes: workout.notes,
        bodyweight: workout.bodyweight,
        exercises: workout.exercises,
        start_time: workout.start_time,
        end_time: workout.end_time
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error in updateWorkout for ID', id, ':', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating workout:', error);
    throw error;
  }
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting workout:', error);
    throw error;
  }
}
