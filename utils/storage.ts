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

export const saveWorkoutPlan = async (workoutPlan: WorkoutPlan): Promise<void> => {
  try {
    const existingPlans = await getWorkoutPlans();
    const newPlans = [...existingPlans, workoutPlan];

    await AsyncStorage.setItem('workoutPlans', JSON.stringify(newPlans));

    try {

      const workoutData = {
        title: workoutPlan.name,
        date: new Date().toISOString(),
        duration_minutes: 60, 
        exercises: workoutPlan.exercises.map(ex => ({
          ...ex,
          reps: ex.reps || 10,
        })),
        notes: `Workout plan created on ${new Date().toLocaleDateString()}`,
        calories_burned: 0,
      };
      
      await saveWorkout(workoutData);
      console.log('Workout also saved to database for future use');
    } catch (dbError) {
      console.error('Error saving to database (continuing with AsyncStorage):', dbError);
    }
  } catch (error) {
    console.error('Error saving workout plan to AsyncStorage:', error);
    throw error;
  }
};

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