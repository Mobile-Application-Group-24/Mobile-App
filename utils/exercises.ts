import { Exercise } from './workout';

// Define a simpler exercise type for the reference data
export interface ExerciseReference {
  id: string;
  name: string;
  type: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
}

// Sample exercises for each workout type (without sets, reps, and weight)
export const exercisesByWorkoutType: Record<string, ExerciseReference[]> = {
  'Chest': [
    { id: 'chest1', name: 'Bench Press', type: 'chest' },
    { id: 'chest2', name: 'Incline Bench Press', type: 'chest' },
    { id: 'chest3', name: 'Decline Bench Press', type: 'chest' },
    { id: 'chest4', name: 'Push-Ups', type: 'chest' },
    { id: 'chest5', name: 'Dumbbell Flyes', type: 'chest' },
    { id: 'chest6', name: 'Cable Flyes', type: 'chest' },
    { id: 'chest7', name: 'Dips', type: 'chest' },
    { id: 'chest8', name: 'Machine Chest Press', type: 'chest' },
    { id: 'chest9', name: 'Dumbbell Pullovers', type: 'chest' },
    { id: 'chest10', name: 'Incline Dumbbell Press', type: 'chest' },
    { id: 'chest11', name: 'Pec Deck Machine', type: 'chest' },
    { id: 'chest12', name: 'Decline Push-Ups', type: 'chest' },
    { id: 'chest13', name: 'Incline Cable Flyes', type: 'chest' },
    { id: 'chest14', name: 'Smith Machine Bench Press', type: 'chest' }
  ],
  'Back': [
    { id: 'back1', name: 'Pull-Ups', type: 'back' },
    { id: 'back2', name: 'Bent Over Rows', type: 'back' },
    { id: 'back3', name: 'Lat Pulldowns', type: 'back' },
    { id: 'back4', name: 'Deadlifts', type: 'back' },
    { id: 'back5', name: 'T-Bar Rows', type: 'back' },
    { id: 'back6', name: 'Cable Rows', type: 'back' },
    { id: 'back7', name: 'Face Pulls', type: 'back' },
    { id: 'back8', name: 'Chin-Ups', type: 'back' },
    { id: 'back9', name: 'Single-Arm Dumbbell Rows', type: 'back' },
    { id: 'back10', name: 'Hyperextensions', type: 'back' },
    { id: 'back11', name: 'Wide-Grip Pull-Ups', type: 'back' },
    { id: 'back12', name: 'Straight Arm Pulldowns', type: 'back' },
    { id: 'back13', name: 'Machine Rows', type: 'back' },
    { id: 'back14', name: 'Renegade Rows', type: 'back' },
    { id: 'back15', name: 'Good Mornings', type: 'back' }
  ],
  'Arms': [
    { id: 'arms1', name: 'Bicep Curls', type: 'arms' },
    { id: 'arms2', name: 'Tricep Pushdowns', type: 'arms' },
    { id: 'arms3', name: 'Hammer Curls', type: 'arms' },
    { id: 'arms4', name: 'Skull Crushers', type: 'arms' },
    { id: 'arms5', name: 'Concentration Curls', type: 'arms' },
    { id: 'arms6', name: 'Overhead Tricep Extension', type: 'arms' },
    { id: 'arms7', name: 'Preacher Curls', type: 'arms' },
    { id: 'arms8', name: 'Tricep Dips', type: 'arms' },
    { id: 'arms9', name: 'Incline Dumbbell Curls', type: 'arms' },
    { id: 'arms10', name: 'Close-Grip Bench Press', type: 'arms' },
    { id: 'arms11', name: 'Spider Curls', type: 'arms' },
    { id: 'arms12', name: 'Diamond Push-Ups', type: 'arms' },
    { id: 'arms13', name: 'Cable Curls', type: 'arms' },
    { id: 'arms14', name: 'Tricep Kickbacks', type: 'arms' },
    { id: 'arms15', name: 'Wrist Curls', type: 'arms' },
    { id: 'arms16', name: 'Reverse Curls', type: 'arms' }
  ],
  'Core': [
    { id: 'core1', name: 'Planks', type: 'core' },
    { id: 'core2', name: 'Russian Twists', type: 'core' },
    { id: 'core3', name: 'Crunches', type: 'core' },
    { id: 'core4', name: 'Leg Raises', type: 'core' },
    { id: 'core5', name: 'Ab Rollouts', type: 'core' },
    { id: 'core6', name: 'Mountain Climbers', type: 'core' },
    { id: 'core7', name: 'Side Planks', type: 'core' },
    { id: 'core8', name: 'Bicycle Crunches', type: 'core' },
    { id: 'core9', name: 'Hanging Leg Raises', type: 'core' },
    { id: 'core10', name: 'Dead Bugs', type: 'core' },
    { id: 'core11', name: 'Plank with Shoulder Taps', type: 'core' },
    { id: 'core12', name: 'Flutter Kicks', type: 'core' },
    { id: 'core13', name: 'V-Ups', type: 'core' },
    { id: 'core14', name: 'Oblique Crunches', type: 'core' },
    { id: 'core15', name: 'Woodchoppers', type: 'core' }
  ],
  'Shoulders': [
    { id: 'shoulders1', name: 'Shoulder Press', type: 'shoulders' },
    { id: 'shoulders2', name: 'Lateral Raises', type: 'shoulders' },
    { id: 'shoulders3', name: 'Front Raises', type: 'shoulders' },
    { id: 'shoulders4', name: 'Reverse Flyes', type: 'shoulders' },
    { id: 'shoulders5', name: 'Upright Rows', type: 'shoulders' },
    { id: 'shoulders6', name: 'Shrugs', type: 'shoulders' },
    { id: 'shoulders7', name: 'Face Pulls', type: 'shoulders' },
    { id: 'shoulders8', name: 'Arnold Press', type: 'shoulders' },
    { id: 'shoulders9', name: 'Military Press', type: 'shoulders' },
    { id: 'shoulders10', name: 'Bent-Over Lateral Raises', type: 'shoulders' },
    { id: 'shoulders11', name: 'Cable Lateral Raises', type: 'shoulders' },
    { id: 'shoulders12', name: 'Push Press', type: 'shoulders' },
    { id: 'shoulders13', name: 'Smith Machine Shoulder Press', type: 'shoulders' },
    { id: 'shoulders14', name: 'Dumbbell Shoulder Press', type: 'shoulders' }
  ],
  'Legs': [
    { id: 'legs1', name: 'Squats', type: 'legs' },
    { id: 'legs2', name: 'Romanian Deadlifts', type: 'legs' },
    { id: 'legs3', name: 'Leg Press', type: 'legs' },
    { id: 'legs4', name: 'Leg Extensions', type: 'legs' },
    { id: 'legs5', name: 'Calf Raises', type: 'legs' },
    { id: 'legs6', name: 'Lunges', type: 'legs' },
    { id: 'legs7', name: 'Leg Curls', type: 'legs' },
    { id: 'legs8', name: 'Front Squats', type: 'legs' },
    { id: 'legs9', name: 'Hack Squats', type: 'legs' },
    { id: 'legs10', name: 'Bulgarian Split Squats', type: 'legs' },
    { id: 'legs11', name: 'Hip Thrusts', type: 'legs' },
    { id: 'legs12', name: 'Seated Calf Raises', type: 'legs' },
    { id: 'legs13', name: 'Goblet Squats', type: 'legs' },
    { id: 'legs14', name: 'Sumo Deadlifts', type: 'legs' },
    { id: 'legs15', name: 'Box Jumps', type: 'legs' },
    { id: 'legs16', name: 'Glute Bridges', type: 'legs' },
    { id: 'legs17', name: 'Seated Leg Press', type: 'legs' }
  ]
};

// Helper function to determine exercise type based on exercise name
export function findExerciseType(exerciseName: string): 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core' {
  const name = exerciseName.toLowerCase();
  
  // First check in predefined exercises
  for (const category in exercisesByWorkoutType) {
    const match = exercisesByWorkoutType[category].find(ex => 
      ex.name.toLowerCase() === name
    );
    if (match && match.type) {
      return match.type;
    }
  }
  
  // If not found, attempt to categorize based on name
  if (name.includes('bench') || name.includes('push') || name.includes('chest') || 
      name.includes('fly') || name.includes('press') && !name.includes('shoulder')) {
    return 'chest';
  } else if (name.includes('row') || name.includes('pull') || name.includes('lat') || 
            name.includes('back') || name.includes('deadlift')) {
    return 'back';
  } else if (name.includes('curl') || name.includes('tricep') || 
            name.includes('extension') || name.includes('arm')) {
    return 'arms';
  } else if (name.includes('squat') || name.includes('leg') || 
            name.includes('lunge') || name.includes('calf')) {
    return 'legs';
  } else if (name.includes('shoulder') || name.includes('delt') || 
            name.includes('raise') || name.includes('press') && !name.includes('bench')) {
    return 'shoulders';
  } else if (name.includes('ab') || name.includes('crunch') || 
            name.includes('twist') || name.includes('plank') || 
            name.includes('core')) {
    return 'core';
  }
  
  // Default to chest if nothing else matches
  return 'chest';
}

// Function to get default sets for a new exercise
export function getDefaultSetsForExercise(): number {
  return 3; // Most exercises default to 3 sets
}
