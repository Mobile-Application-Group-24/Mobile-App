import { supabase } from './supabase';

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id: string;
  title: string;
  date: string;
  user_id: string;
  duration_minutes: number;
  exercises: Exercise[];
  workout_type: 'split' | 'custom'; // New field to distinguish workout types
  day_of_week?: string;
}

// Sample exercises for each workout type
const exercisesByWorkoutType: Record<string, Exercise[]> = {
  'Push': [
    { id: 'ex1', name: 'Bench Press', sets: 4, reps: 8, weight: 135 },
    { id: 'ex2', name: 'Shoulder Press', sets: 3, reps: 10, weight: 95 },
    { id: 'ex3', name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 50 },
    { id: 'ex4', name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 60 },
    { id: 'ex5', name: 'Lateral Raises', sets: 3, reps: 15, weight: 15 }
  ],
  'Pull': [
    { id: 'ex1', name: 'Pull-ups', sets: 4, reps: 8, weight: 0 },
    { id: 'ex2', name: 'Bent Over Rows', sets: 3, reps: 10, weight: 135 },
    { id: 'ex3', name: 'Lat Pulldown', sets: 3, reps: 12, weight: 120 },
    { id: 'ex4', name: 'Bicep Curls', sets: 3, reps: 12, weight: 35 },
    { id: 'ex5', name: 'Face Pulls', sets: 3, reps: 15, weight: 50 }
  ],
  'Legs': [
    { id: 'ex1', name: 'Squats', sets: 4, reps: 8, weight: 185 },
    { id: 'ex2', name: 'Romanian Deadlifts', sets: 3, reps: 10, weight: 155 },
    { id: 'ex3', name: 'Leg Press', sets: 3, reps: 12, weight: 270 },
    { id: 'ex4', name: 'Leg Extensions', sets: 3, reps: 15, weight: 90 },
    { id: 'ex5', name: 'Calf Raises', sets: 4, reps: 15, weight: 120 }
  ],
  'Upper': [
    { id: 'ex1', name: 'Bench Press', sets: 4, reps: 8, weight: 135 },
    { id: 'ex2', name: 'Pull-ups', sets: 3, reps: 8, weight: 0 },
    { id: 'ex3', name: 'Shoulder Press', sets: 3, reps: 10, weight: 95 },
    { id: 'ex4', name: 'Bent Over Rows', sets: 3, reps: 10, weight: 135 },
    { id: 'ex5', name: 'Tricep Dips', sets: 3, reps: 12, weight: 0 },
    { id: 'ex6', name: 'Bicep Curls', sets: 3, reps: 12, weight: 35 }
  ],
  'Lower': [
    { id: 'ex1', name: 'Squats', sets: 4, reps: 8, weight: 185 },
    { id: 'ex2', name: 'Deadlifts', sets: 3, reps: 8, weight: 205 },
    { id: 'ex3', name: 'Leg Press', sets: 3, reps: 12, weight: 270 },
    { id: 'ex4', name: 'Leg Curls', sets: 3, reps: 12, weight: 70 },
    { id: 'ex5', name: 'Calf Raises', sets: 4, reps: 15, weight: 120 },
    { id: 'ex6', name: 'Hip Thrusts', sets: 3, reps: 12, weight: 135 }
  ],
  'Full Body': [
    { id: 'ex1', name: 'Squats', sets: 3, reps: 10, weight: 155 },
    { id: 'ex2', name: 'Bench Press', sets: 3, reps: 10, weight: 125 },
    { id: 'ex3', name: 'Bent Over Rows', sets: 3, reps: 10, weight: 125 },
    { id: 'ex4', name: 'Shoulder Press', sets: 3, reps: 10, weight: 85 },
    { id: 'ex5', name: 'Bicep Curls', sets: 3, reps: 12, weight: 35 },
    { id: 'ex6', name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 50 },
    { id: 'ex7', name: 'Romanian Deadlifts', sets: 3, reps: 10, weight: 145 }
  ]
};

/**
 * Generates workout templates based on the user's training schedule
 */
export async function generateWorkoutsFromSchedule(schedule, userId) {
  // Filter out rest days
  const workoutDays = schedule.filter(day => day.workout !== 'Rest');
  const workoutsToCreate = [];
  
  // Get the current date for creating workouts
  const today = new Date();
  
  for (const day of workoutDays) {
    const workoutType = day.workout;
    const title = `${day.day} - ${workoutType}`;
    
    // Create an empty workout template
    const workout = {
      title,
      user_id: userId,
      day_of_week: day.day,
      workout_type: 'split', // This workout was auto-generated from a split
      duration_minutes: 60,  // Default duration
      exercises: [],  // Empty exercises array for the user to fill in
      date: today.toISOString(),
    };
    
    workoutsToCreate.push(workout);
  }
  
  // Insert all workouts into the database
  try {
    if (workoutsToCreate.length === 0) {
      console.log("No workouts to create");
      return 0;
    }
    
    console.log("Creating empty workout templates:", JSON.stringify(workoutsToCreate, null, 2).substring(0, 200) + "...");
    
    const { data, error } = await supabase
      .from('workouts')
      .insert(workoutsToCreate);
      
    if (error) {
      console.error("Error creating workouts:", error);
      throw error;
    }
    
    return workoutsToCreate.length;
  } catch (error) {
    console.error("Failed to create workouts:", error);
    return 0;
  }
}

export async function getWorkouts(userId?: string): Promise<Workout[]> {
  try {
    if (!userId) {
      console.warn('No user ID provided to getWorkouts');
      return [];
    }
    
    console.log(`Fetching workouts for user ID: ${userId}`);
    
    // Fetch all workouts for the user
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching workouts:', error);
      throw new Error(error.message);
    }
    
    // If no workouts exist, return empty array
    if (!data || data.length === 0) {
      console.log("No workouts found for user");
      return [];
    }
    
    console.log(`Found ${data.length} workouts for user`);
    
    // Define weekday order for sorting
    const dayOrder = {
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Sunday': 7
    };
    
    // Sort workouts by day of week
    const sortedWorkouts = [...data].sort((a, b) => {
      // First sort by workout_type (split first, then custom)
      if (a.workout_type !== b.workout_type) {
        return a.workout_type === 'split' ? -1 : 1;
      }
      
      // For split workouts, sort by day of week
      if (a.workout_type === 'split' && b.workout_type === 'split') {
        const dayA = a.day_of_week || '';
        const dayB = b.day_of_week || '';
        return (dayOrder[dayA] || 99) - (dayOrder[dayB] || 99);
      }
      
      // For custom workouts, sort by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    
    return sortedWorkouts as Workout[];
  } catch (error) {
    console.error('Error in getWorkouts:', error);
    return [];
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
