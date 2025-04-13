import { supabase } from './supabase';
import { findExerciseType } from './exercises';

export interface ExerciseStats {
  id: string;
  name: string;
  maxWeight: number;
  maxReps: number;
  totalVolume: number;
  totalSessions: number;
  lastUsed: string;
  type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
  progress?: number;
  volumeProgress?: number; // Add this field to match what the UI is expecting
}

// Interface for exercise history data points
export interface ExerciseHistoryPoint {
  date: string;
  volume: number;
  maxWeight: number;
  avgWeight: number;
}

export async function getExerciseStatsFromWorkouts(userId: string): Promise<ExerciseStats[]> {
  // Fetch all workouts with exercise data directly from the workouts table
  const { data: workouts, error: workoutError } = await supabase
    .from('workouts')
    .select('id, date, exercises')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (workoutError) {
    console.error('Error fetching workouts:', workoutError);
    throw workoutError;
  }

  console.log(`Fetched ${workouts?.length || 0} workouts for user`);
  
  // Process workout data to calculate statistics
  const exerciseMap = new Map<string, ExerciseStats>();
  
  // For progress calculation: track most recent and second-most-recent workouts by exercise
  const exerciseWorkouts = new Map<string, Array<{date: string, avgWeight: number}>>();
  
  // For volume progress calculation: track volume by workout date
  const exerciseVolumeByWorkout = new Map<string, Array<{date: string, totalVolume: number}>>();
  
  // Process each workout to extract exercise data
  workouts?.forEach(workout => {
    if (!workout.exercises || !Array.isArray(workout.exercises)) return;

    const workoutDate = workout.date;
    console.log(`Processing workout from ${workoutDate} with ${workout.exercises.length} exercises`);

    workout.exercises.forEach(exercise => {
      if (!exercise || !exercise.name) {
        console.log('Skipping invalid exercise:', exercise);
        return;
      }
      
      // Use name as ID if no ID is present
      const exerciseId = exercise.id || `name-${exercise.name}`;
      const exerciseName = exercise.name;
      const exerciseType = exercise.type || findExerciseType(exerciseName);

      console.log(`Processing exercise: ${exerciseName} (${exerciseType || 'unknown type'})`);

      // Initialize or update stats object for this exercise
      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          id: exerciseId,
          name: exerciseName,
          maxWeight: 0,
          maxReps: 0,
          totalVolume: 0,
          totalSessions: 0,
          lastUsed: workoutDate,
          type: exerciseType,
          progress: 0, // Will calculate later
          volumeProgress: 0 // Will calculate later
        });
      }

      const stats = exerciseMap.get(exerciseId)!;
      stats.totalSessions += 1;
      
      // For workout progress tracking
      let totalSetWeight = 0;
      let weightedSetCount = 0;
      let sessionVolume = 0;

      // Process set details to calculate stats
      if (exercise.setDetails && Array.isArray(exercise.setDetails)) {
        exercise.setDetails.forEach(set => {
          if (!set) return;
          
          const weight = typeof set.weight === 'number' ? set.weight : 
                        (set.weight ? parseFloat(set.weight.toString()) : 0);
                        
          const reps = typeof set.reps === 'number' ? set.reps : 
                      (set.reps ? parseInt(set.reps.toString(), 10) : 0);
          
          // Only count sets with both weight and reps
          if (weight > 0 && reps > 0) {
            // Update max weight
            if (weight > stats.maxWeight) {
              stats.maxWeight = weight;
            }
            
            // Update max reps
            if (reps > stats.maxReps) {
              stats.maxReps = reps;
            }
            
            // Add to total volume
            const setVolume = weight * reps;
            stats.totalVolume += setVolume;
            sessionVolume += setVolume;
            
            // For average weight calculation
            totalSetWeight += weight;
            weightedSetCount++;
          }
        });
      }

      // Track workout history for progress calculation
      if (weightedSetCount > 0) {
        const avgWeight = totalSetWeight / weightedSetCount;
        const workoutInfo = {date: workoutDate, avgWeight};
        
        if (!exerciseWorkouts.has(exerciseId)) {
          exerciseWorkouts.set(exerciseId, []);
        }
        
        exerciseWorkouts.get(exerciseId)?.push(workoutInfo);
      }

      // Track workout volume history for progress calculation
      if (sessionVolume > 0) {
        const workoutInfo = {date: workoutDate, totalVolume: sessionVolume};
        
        if (!exerciseVolumeByWorkout.has(exerciseId)) {
          exerciseVolumeByWorkout.set(exerciseId, []);
        }
        
        exerciseVolumeByWorkout.get(exerciseId)?.push(workoutInfo);
      }
    });
  });

  // Calculate progress percentages
  exerciseMap.forEach((stats, exerciseId) => {
    const workoutHistory = exerciseWorkouts.get(exerciseId);
    
    if (workoutHistory && workoutHistory.length >= 2) {
      // Sort by date (most recent first)
      workoutHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const mostRecent = workoutHistory[0];
      const secondMostRecent = workoutHistory[1];
      
      if (secondMostRecent.avgWeight > 0) {
        const progressPercent = Math.round(((mostRecent.avgWeight - secondMostRecent.avgWeight) / secondMostRecent.avgWeight) * 100);
        stats.progress = progressPercent;
      }
    }
  });

  // Calculate volume progress percentages
  exerciseMap.forEach((stats, exerciseId) => {
    const volumeHistory = exerciseVolumeByWorkout.get(exerciseId);
    
    if (volumeHistory && volumeHistory.length >= 2) {
      // Sort by date (most recent first)
      volumeHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const mostRecent = volumeHistory[0];
      const secondMostRecent = volumeHistory[1];
      
      if (secondMostRecent.totalVolume > 0) {
        // Calculate percentage change in volume between last two workouts
        const progressPercent = Math.round(
          ((mostRecent.totalVolume - secondMostRecent.totalVolume) / secondMostRecent.totalVolume) * 100
        );
        stats.volumeProgress = progressPercent;
        
        console.log(`Volume progress for ${stats.name}: ${progressPercent}% (${secondMostRecent.totalVolume} → ${mostRecent.totalVolume})`);
      }
    }
  });

  const result = Array.from(exerciseMap.values());
  console.log(`Generated stats for ${result.length} exercises`);
  return result;
}

/**
 * Get historical data points for a specific exercise
 * This will be used for generating charts in the exercise detail screen
 */
export async function getExerciseHistoryData(userId: string, exerciseName: string): Promise<ExerciseHistoryPoint[]> {
  try {
    console.log(`Fetching exercise history data for ${exerciseName}`);
    
    // Fetch all workouts that might contain this exercise
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('id, date, exercises')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (workoutError) {
      console.error('Error fetching workouts for history:', workoutError);
      throw workoutError;
    }

    console.log(`Found ${workouts?.length || 0} workouts to check for exercise history`);
    
    // Process each workout to extract data points for this specific exercise
    const historyPoints: ExerciseHistoryPoint[] = [];
    
    workouts?.forEach(workout => {
      if (!workout.exercises || !Array.isArray(workout.exercises)) return;
      
      // Find the specific exercise in this workout
      const exercise = workout.exercises.find(ex => 
        ex.name.toLowerCase() === exerciseName.toLowerCase()
      );
      
      if (!exercise || !exercise.setDetails || !Array.isArray(exercise.setDetails)) return;
      
      // Calculate metrics for this workout session
      let sessionVolume = 0;
      let sessionMaxWeight = 0;
      let totalWeight = 0;
      let weightedSetCount = 0;
      
      exercise.setDetails.forEach(set => {
        if (!set) return;
        
        const weight = typeof set.weight === 'number' ? set.weight : 
                    (set.weight ? parseFloat(set.weight.toString()) : 0);
                    
        const reps = typeof set.reps === 'number' ? set.reps : 
                  (set.reps ? parseInt(set.reps.toString(), 10) : 0);
        
        // Only count sets with both weight and reps
        if (weight > 0 && reps > 0) {
          // Update max weight
          if (weight > sessionMaxWeight) {
            sessionMaxWeight = weight;
          }
          
          // Add to total volume
          sessionVolume += weight * reps;
          
          // For average weight calculation
          totalWeight += weight;
          weightedSetCount++;
        }
      });
      
      // Only add data point if there's actual data
      if (weightedSetCount > 0) {
        const avgWeight = totalWeight / weightedSetCount;
        
        historyPoints.push({
          date: workout.date,
          volume: sessionVolume,
          maxWeight: sessionMaxWeight,
          avgWeight: avgWeight
        });
      }
    });
    
    console.log(`Generated ${historyPoints.length} history data points for ${exerciseName}`);
    return historyPoints;
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    return [];
  }
}
