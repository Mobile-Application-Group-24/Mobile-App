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
  description?: string;
  workout_type: 'split' | 'custom';
  day_of_week?: string | null;
  duration_minutes: number;
  exercises?: Exercise[];
  user_id: string;
  created_at: string;
  done?: boolean;
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

// Create a new workout
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
    console.error('Error creating workout:', error);
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
