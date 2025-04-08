import { supabase } from './supabase';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  setDetails?: SetDetail[];
}

export interface SetDetail {
  id: string;
  weight?: number;
  reps: number;
  type: 'normal' | 'warmup' | 'dropset';
  notes?: string;
}

export interface Workout {
  id: string;
  title: string;
  date: string;
  duration_minutes: number;
  exercises: Exercise[];
  notes: string;
  calories_burned: number;
  bodyweight?: number; // Using the correct field name to match DB schema
  start_time?: string;
  end_time?: string;
}

// Get all workouts
export async function getWorkouts(userId?: string): Promise<Workout[]> {
  try {
    // If no userId is provided, return an empty array for safety
    if (!userId) {
      console.warn('getWorkouts called without a user ID');
      return [];
    }
    
    console.log(`Fetching workouts for user ID: ${userId}`);
    
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId) // Make sure your column name matches exactly
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching workouts:', error);
      throw new Error(error.message);
    }
    
    console.log(`Retrieved ${data?.length || 0} workouts for user ${userId}`);
    
    // Add additional safety check to verify user_id matches
    const filteredData = data?.filter(workout => workout.user_id === userId) || [];
    
    if (filteredData.length !== data?.length) {
      console.warn(`Found ${data?.length} workouts but only ${filteredData.length} match user ID ${userId}`);
    }
    
    return filteredData;
  } catch (error) {
    console.error('Error in getWorkouts:', error);
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

// Create a new workout
export async function createWorkout(workout: Omit<Workout, 'id'>): Promise<Workout> {
  console.log('Creating workout with data:', workout);
  
  const workoutToCreate = {
    title: workout.title,           // Wichtig: title statt name
    date: new Date().toISOString(),
    exercises: workout.exercises,
    duration_minutes: workout.duration_minutes || 0,
    calories_burned: workout.calories_burned || 0,
    notes: workout.notes || '',
    user_id: workout.user_id       // Wichtig: user_id muss übergeben werden
  };

  const { data, error } = await supabase
    .from('workouts')
    .insert(workoutToCreate)
    .select()
    .single();

  if (error) {
    console.error('Error creating workout:', error);
    throw error;
  }

  return data;
}

// Update a workout - using the correct field name 'bodyweight'
export async function updateWorkout(id: string, workout: Partial<Workout>): Promise<Workout> {
  try {
    console.log('Updating workout with:', JSON.stringify(workout, null, 2));
    
    const { data, error } = await supabase
      .from('workouts')
      .update({
        title: workout.name, // Änderung von name zu title
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
