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
}

// Get all workouts
export async function getWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching workouts:', error);
    throw error;
  }
  
  return data || [];
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
  const { data, error } = await supabase
    .from('workouts')
    .insert(workout)
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
      .update(workout)
      .eq('id', id)
      .select()
      .single();

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
