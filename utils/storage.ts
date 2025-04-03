import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveWorkout } from './workout';

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: string;
  isFavorite: boolean;
};

// Legacy function to get workout plans from AsyncStorage
// This will be deprecated in favor of the database approach
export const getWorkoutPlans = async (): Promise<WorkoutPlan[]> => {
  try {
    const storedPlans = await AsyncStorage.getItem('workoutPlans');
    if (storedPlans) {
      return JSON.parse(storedPlans);
    }
    return [];
  } catch (error) {
    console.error('Error getting workout plans from AsyncStorage:', error);
    return [];
  }
};

// Legacy function to save a workout plan to AsyncStorage
// This now also saves to the database for a smooth transition
export const saveWorkoutPlan = async (workoutPlan: WorkoutPlan): Promise<void> => {
  try {
    // Get existing plans from AsyncStorage
    const existingPlans = await getWorkoutPlans();
    const newPlans = [...existingPlans, workoutPlan];
    
    // Save to AsyncStorage for backward compatibility
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(newPlans));
    
    // Also save to database for future use
    try {
      // Format the workout for database storage
      const workoutData = {
        title: workoutPlan.name,
        date: new Date().toISOString(),
        duration_minutes: 60, // Default
        exercises: workoutPlan.exercises.map(ex => ({
          ...ex,
          reps: ex.reps || 10,
        })),
        notes: `Workout plan created on ${new Date().toLocaleDateString()}`,
        calories_burned: 0,
      };
      
      // Save to database
      await saveWorkout(workoutData);
      console.log('Workout also saved to database for future use');
    } catch (dbError) {
      console.error('Error saving to database (continuing with AsyncStorage):', dbError);
      // Continue anyway since we succeeded with AsyncStorage
    }
  } catch (error) {
    console.error('Error saving workout plan to AsyncStorage:', error);
    throw error;
  }
};

// Legacy function to update a workout plan in AsyncStorage
// This function will remain for backward compatibility
export const updateWorkoutPlan = async (workoutPlanId: string, updates: Partial<WorkoutPlan>): Promise<void> => {
  try {
    const existingPlans = await getWorkoutPlans();
    const updatedPlans = existingPlans.map((plan) =>
      plan.id === workoutPlanId ? { ...plan, ...updates } : plan
    );
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(updatedPlans));
  } catch (error) {
    console.error('Error updating workout plan:', error);
    throw error;
  }
};

// Legacy function to delete a workout plan from AsyncStorage
// This function will remain for backward compatibility
export const deleteWorkoutPlan = async (workoutPlanId: string): Promise<void> => {
  try {
    const existingPlans = await getWorkoutPlans();
    const filteredPlans = existingPlans.filter((plan) => plan.id !== workoutPlanId);
    await AsyncStorage.setItem('workoutPlans', JSON.stringify(filteredPlans));
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    throw error;
  }
};