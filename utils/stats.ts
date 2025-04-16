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
  maxSetVolume?: number; // Add this field to include the highest set volume
  totalReps?: number; // Add this field to include total repetitions
  bestSetReps?: number; // Add this field to include the best set repetitions
}

export async function getExerciseStatsFromWorkouts(userId: string): Promise<ExerciseStats[]> {
  try {
    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const exerciseStats: { [key: string]: ExerciseStats } = {};

    workouts.forEach(workout => {
      if (!workout.exercises) return;

      workout.exercises.forEach(exercise => {
        if (!exerciseStats[exercise.name]) {
          exerciseStats[exercise.name] = {
            id: exercise.id,
            name: exercise.name,
            type: exercise.type || findExerciseType(exercise.name),
            maxWeight: 0,
            maxReps: 0,
            totalVolume: 0,
            totalSessions: 0,
            lastUsed: workout.date
          };
        }

        let sessionMaxWeight = 0;
        let sessionMaxReps = 0;
        let sessionVolume = 0;

        exercise.setDetails?.forEach(set => {
          const weight = Number(set.weight) || 0;
          const reps = Number(set.reps) || 0;

          // Aktualisiere maxReps nur wenn die Wiederholungen in diesem Satz höher sind
          if (reps > exerciseStats[exercise.name].maxReps) {
            exerciseStats[exercise.name].maxReps = reps;
          }

          // Update maxWeight nur wenn Gewicht vorhanden
          if (weight > 0 && weight > exerciseStats[exercise.name].maxWeight) {
            exerciseStats[exercise.name].maxWeight = weight;
          }

          sessionVolume += weight * reps;
        });

        exerciseStats[exercise.name].totalVolume += sessionVolume;
        exerciseStats[exercise.name].totalSessions++;

        // Update lastUsed wenn das Workout neuer ist
        if (workout.date > exerciseStats[exercise.name].lastUsed) {
          exerciseStats[exercise.name].lastUsed = workout.date;
        }
      });
    });

    return Object.values(exerciseStats);
  } catch (error) {
    console.error('Error in getExerciseStatsFromWorkouts:', error);
    throw error;
  }
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
      let totalReps = 0;
      let bestSetReps = 0;
      let maxSetVolume = 0; // Für das beste Satz-Volumen
      
      // Verarbeite alle Sätze der Übung
      exercise.setDetails.forEach(set => {
        if (!set) return;

        // Stelle sicher, dass wir die Werte korrekt parsen
        const reps = typeof set.reps === 'number' ? set.reps : 
                    set.reps ? parseInt(set.reps.toString(), 10) : 0;
        const weight = typeof set.weight === 'number' ? set.weight :
                      set.weight ? parseFloat(set.weight.toString()) : 0;
        
        // Aktualisiere bestSetReps für den besten einzelnen Satz
        bestSetReps = Math.max(bestSetReps, reps);
        totalReps += reps;
        
        // Berechne das Volumen für diesen Satz
        const setVolume = weight * reps;
        maxSetVolume = Math.max(maxSetVolume, setVolume); // Update maxSetVolume
        sessionVolume += setVolume;
        
        if (weight > 0) {
          sessionMaxWeight = Math.max(sessionMaxWeight, weight);
        }
      });
      
      // Füge den Datenpunkt nur hinzu, wenn wir tatsächlich Daten haben
      if (totalReps > 0 || sessionVolume > 0) {
        historyPoints.push({
          date: workout.date,
          volume: sessionVolume,
          maxWeight: sessionMaxWeight,
          totalReps,
          bestSetReps,
          maxSetVolume, // Füge maxSetVolume zum Datenpunkt hinzu
          avgWeight: sessionVolume > 0 ? sessionVolume / totalReps : 0
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
