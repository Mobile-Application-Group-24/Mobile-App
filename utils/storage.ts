import AsyncStorage from '@react-native-async-storage/async-storage';

export type WorkoutPlan = {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: string;
  isFavorite: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  sets: number;
};

const STORAGE_KEY = 'workout_plans';

export const saveWorkoutPlan = async (plan: WorkoutPlan): Promise<void> => {
  try {
    // Get existing plans
    const existingPlansJson = await AsyncStorage.getItem(STORAGE_KEY);
    const existingPlans: WorkoutPlan[] = existingPlansJson ? JSON.parse(existingPlansJson) : [];

    // Add new plan
    const updatedPlans = [...existingPlans, plan];

    // Save updated plans
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
  } catch (error) {
    console.error('Error saving workout plan:', error);
    throw new Error('Failed to save workout plan');
  }
};

export const getWorkoutPlans = async (): Promise<WorkoutPlan[]> => {
  try {
    const plansJson = await AsyncStorage.getItem(STORAGE_KEY);
    return plansJson ? JSON.parse(plansJson) : [];
  } catch (error) {
    console.error('Error getting workout plans:', error);
    return [];
  }
};

export const deleteWorkoutPlan = async (planId: string): Promise<void> => {
  try {
    const existingPlansJson = await AsyncStorage.getItem(STORAGE_KEY);
    const existingPlans: WorkoutPlan[] = existingPlansJson ? JSON.parse(existingPlansJson) : [];

    const updatedPlans = existingPlans.filter(plan => plan.id !== planId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    throw new Error('Failed to delete workout plan');
  }
};

export const toggleFavorite = async (planId: string): Promise<void> => {
  try {
    const existingPlansJson = await AsyncStorage.getItem(STORAGE_KEY);
    const existingPlans: WorkoutPlan[] = existingPlansJson ? JSON.parse(existingPlansJson) : [];

    const updatedPlans = existingPlans.map(plan =>
      plan.id === planId ? { ...plan, isFavorite: !plan.isFavorite } : plan
    );

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
  } catch (error) {
    console.error('Error toggling favorite:', error);
    throw new Error('Failed to update favorite status');
  }
};