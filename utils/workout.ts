import { supabase } from './supabase';
import { exercisesByWorkoutType } from './exercises';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;  // Optional for compatibility
  weight?: number; // Optional for compatibility
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core'; // Exercise category
}

// New interface for exercises in workout plans (without reps/weight)
export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
}

// New interface for exercises in completed workouts (with reps/weight)
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

// Export exercises data from the imported file
export { exercisesByWorkoutType };

/**
 * Generates workout templates based on the user's training schedule
 */
export async function generateWorkoutsFromSchedule(schedule, userId) {
  // Filter out rest days
  const workoutDays = schedule.filter(day => day.workout !== 'Rest');
  const workoutPlansToCreate = [];
  
  // Get the current date for creating workouts
  const today = new Date();
  
  for (const day of workoutDays) {
    const workoutType = day.workout;
    const title = `${day.day} - ${workoutType}`;
    
    // Create an empty workout template
    const workoutPlan = {
      title,
      user_id: userId,
      day_of_week: day.day,
      workout_type: 'split', // This workout was auto-generated from a split
      duration_minutes: 60,  // Default duration
      exercises: [],  // Empty exercises array for the user to fill in
      description: `Auto-generated ${workoutType} workout for ${day.day}`,
    };
    
    workoutPlansToCreate.push(workoutPlan);
  }
  
  // Insert all workout plans into the database
  try {
    if (workoutPlansToCreate.length === 0) {
      console.log("No workout plans to create");
      return 0;
    }
    
    console.log("Creating empty workout templates:", JSON.stringify(workoutPlansToCreate, null, 2).substring(0, 200) + "...");
    
    const { data, error } = await supabase
      .from('workout_plans')  // Changed from 'workouts' to 'workout_plans'
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
    // First get all workout plans
    const { data: workoutPlans, error: plansError } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId);
    
    if (plansError) throw plansError;
    
    // Then get all workout sessions
    const { data: workoutSessions, error: sessionsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId);
    
    if (sessionsError) throw sessionsError;
    
    // Combine and convert them to the expected format
    const combinedWorkouts = [
      ...(workoutPlans || []).map(plan => ({
        ...plan,
        // Add any fields needed for compatibility
      })),
      ...(workoutSessions || [])
    ];
    
    return combinedWorkouts;
  } catch (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
}

// Get a specific workout
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

// Get a specific workout plan
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

// Create a new workout session
export async function createWorkout(workoutData: Omit<Workout, 'id' | 'created_at'>): Promise<Workout> {
  try {
    // The workout data should already include the exercises array
    // with proper structure from the caller including the exercise type

    // Insert the workout data
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

// Update a workout - using the correct field name 'bodyweight'
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

// Delete a workout
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
