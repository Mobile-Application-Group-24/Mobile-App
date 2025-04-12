import { supabase } from './supabase';

export interface ExerciseStats {
  id: string;
  name: string;
  maxWeight: number;
  maxReps: number;
  totalVolume: number;
  isFavorite: boolean;
  hasData: boolean;
  history?: {
    date: string;
    weight: number;
    reps: number;
  }[];
}

export async function getExerciseStats(userId: string): Promise<ExerciseStats[]> {
  // Fetch all unique exercises from completed workouts
  const { data: workoutData, error: workoutError } = await supabase
    .from('workouts')
    .select(`
      id,
      exercises (
        id,
        name,
        setDetails (
          weight,
          reps,
          type
        )
      )
    `)
    .eq('user_id', userId);

  if (workoutError) throw workoutError;

  // Fetch favorite exercises
  const { data: favoriteData, error: favoriteError } = await supabase
    .from('favorite_exercises')
    .select('exercise_id')
    .eq('user_id', userId);

  if (favoriteError) throw favoriteError;

  const favoriteIds = new Set(favoriteData.map(f => f.exercise_id));

  // Process workout data to calculate statistics
  const exerciseStats = new Map<string, ExerciseStats>();

  workoutData.forEach(workout => {
    workout.exercises.forEach(exercise => {
      if (!exerciseStats.has(exercise.id)) {
        exerciseStats.set(exercise.id, {
          id: exercise.id,
          name: exercise.name,
          maxWeight: 0,
          maxReps: 0,
          totalVolume: 0,
          isFavorite: favoriteIds.has(exercise.id),
          hasData: false,
          history: []
        });
      }

      const stats = exerciseStats.get(exercise.id)!;
      exercise.setDetails.forEach(set => {
        if (set.weight && set.reps) {
          stats.hasData = true;
          stats.maxWeight = Math.max(stats.maxWeight, set.weight);
          stats.maxReps = Math.max(stats.maxReps, set.reps);
          stats.totalVolume += set.weight * set.reps;
        }
      });
    });
  });

  return Array.from(exerciseStats.values());
}

export async function toggleExerciseFavorite(exerciseId: string, userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('favorite_exercises')
    .select()
    .eq('exercise_id', exerciseId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    await supabase
      .from('favorite_exercises')
      .delete()
      .eq('exercise_id', exerciseId)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('favorite_exercises')
      .insert([
        { exercise_id: exerciseId, user_id: userId }
      ]);
  }
}
