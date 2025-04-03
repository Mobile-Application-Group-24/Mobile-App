import { supabase } from './supabase';
import { format } from 'date-fns';

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number; // in seconds
  notes?: string;
};

export type Workout = {
  id: string;
  title: string;
  date: string;
  duration_minutes: number;
  exercises: Exercise[];
  notes?: string;
  calories_burned?: number;
  created_at: string;
  updated_at?: string;
};

export async function getWorkouts(): Promise<Workout[]> {
  try {
    console.log('Fetching workouts from database');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching workouts:', error);
      throw error;
    }

    console.log(`Retrieved ${data.length} workouts from database`);
    return data;
  } catch (error) {
    console.error('Error in getWorkouts:', error);
    throw error;
  }
}

export async function getWorkout(id: string): Promise<Workout> {
  try {
    console.log(`Fetching workout with ID: ${id}`);
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching workout:', error);
      throw error;
    }

    console.log('Retrieved workout:', data);
    return data;
  } catch (error) {
    console.error(`Error in getWorkout for ID ${id}:`, error);
    throw error;
  }
}

export async function saveWorkout(workout: Omit<Workout, 'id' | 'created_at'>): Promise<Workout> {
  try {
    console.log('Saving workout to database:', JSON.stringify(workout, null, 2));
    
    // Improved authentication check with better error details
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Authentication error:', userError);
      throw new Error(`User authentication failed: ${userError.message}`);
    }
    
    if (!userData || !userData.user) {
      console.error('No user found in auth data:', userData);
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.error('Failed to refresh session:', refreshError);
        throw new Error('Not authenticated. Please log in again.');
      }
      
      console.log('Session refreshed, proceeding with user ID:', refreshData.user?.id);
      userData.user = refreshData.user;
    }

    console.log('User authenticated:', userData.user.id);

    // Ensure the database has the workouts table
    try {
      // Check if the table exists by making a small query
      const { data: tableCheck, error: tableError } = await supabase
        .from('workouts')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('Error checking workouts table:', tableError);
        // The table might not exist - we'll try the creation later
      } else {
        console.log('Workouts table exists, good to proceed');
      }
    } catch (checkError) {
      console.error('Error checking table existence:', checkError);
      // Continue anyway as we'll try the insert
    }

    // Format the workout data for insertion
    const workoutToInsert = {
      user_id: userData.user.id,
      title: workout.title || 'My Workout',
      date: workout.date || new Date().toISOString(),
      duration_minutes: workout.duration_minutes || 0,
      exercises: workout.exercises || [],
      notes: workout.notes || '',
      calories_burned: workout.calories_burned || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Formatted workout data for insertion:', JSON.stringify(workoutToInsert, null, 2));

    // Try to insert with detailed error handling
    const { data, error } = await supabase
      .from('workouts')
      .insert(workoutToInsert)
      .select();

    if (error) {
      console.error('Supabase error saving workout:', error);
      console.error('Error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      
      // Try direct SQL query as a fallback
      if (error.code === '42P01') { // Relation not found error
        console.log('Table not found, creating workouts table...');
        
        // Create the table using SQL
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS public.workouts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            date TIMESTAMP WITH TIME ZONE NOT NULL,
            duration_minutes INTEGER NOT NULL,
            exercises JSONB NOT NULL,
            notes TEXT,
            calories_burned INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `;
        
        try {
          // Try to create the table
          const { error: createError } = await supabase.rpc('execute_sql', { sql: createTableSQL });
          if (createError) {
            console.error('Error creating workouts table:', createError);
            throw new Error(`Failed to create workouts table: ${createError.message}`);
          }
          
          // Try insert again after table creation
          console.log('Table created, trying to insert again...');
          const { data: retryData, error: retryError } = await supabase
            .from('workouts')
            .insert(workoutToInsert)
            .select();
            
          if (retryError) {
            console.error('Error on retry after table creation:', retryError);
            throw retryError;
          }
          
          console.log('Workout saved successfully after table creation:', retryData);
          return retryData[0];
        } catch (sqlError) {
          console.error('SQL execution error:', sqlError);
          throw new Error(`Failed to create workouts table: ${sqlError instanceof Error ? sqlError.message : 'Unknown error'}`);
        }
      }
      
      throw error;
    }

    console.log('Workout saved successfully:', data);
    return data[0]; // Return the first item in the array
  } catch (error) {
    console.error('Error in saveWorkout:', error);
    throw error;
  }
}

export async function updateWorkout(id: string, workout: Partial<Omit<Workout, 'id' | 'created_at'>>): Promise<Workout> {
  try {
    console.log(`Updating workout with ID: ${id}`, workout);
    
    const updates = {
      ...workout,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('workouts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workout:', error);
      throw error;
    }

    console.log('Workout updated successfully:', data);
    return data;
  } catch (error) {
    console.error(`Error in updateWorkout for ID ${id}:`, error);
    throw error;
  }
}

export async function deleteWorkout(id: string): Promise<void> {
  try {
    console.log(`Deleting workout with ID: ${id}`);
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }

    console.log('Workout deleted successfully');
  } catch (error) {
    console.error(`Error in deleteWorkout for ID ${id}:`, error);
    throw error;
  }
}

export async function getWorkoutsByDateRange(startDate: Date, endDate: Date): Promise<Workout[]> {
  try {
    console.log(`Fetching workouts between ${format(startDate, 'yyyy-MM-dd')} and ${format(endDate, 'yyyy-MM-dd')}`);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userData.user.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching workouts by date range:', error);
      throw error;
    }

    console.log(`Retrieved ${data.length} workouts for date range`);
    return data;
  } catch (error) {
    console.error('Error in getWorkoutsByDateRange:', error);
    throw error;
  }
}

export async function getWorkoutStats(): Promise<{ 
  totalWorkouts: number; 
  totalMinutes: number; 
  totalCalories: number; 
  totalExercises: number;
}> {
  try {
    console.log('Calculating workout statistics');
    const workouts = await getWorkouts();
    
    const totalWorkouts = workouts.length;
    const totalMinutes = workouts.reduce((sum, workout) => sum + (workout.duration_minutes || 0), 0);
    const totalCalories = workouts.reduce((sum, workout) => sum + (workout.calories_burned || 0), 0);
    const totalExercises = workouts.reduce((sum, workout) => sum + workout.exercises.length, 0);
    
    console.log('Workout statistics calculated:', { 
      totalWorkouts, 
      totalMinutes, 
      totalCalories, 
      totalExercises 
    });
    
    return { 
      totalWorkouts, 
      totalMinutes, 
      totalCalories, 
      totalExercises 
    };
  } catch (error) {
    console.error('Error in getWorkoutStats:', error);
    throw error;
  }
}
