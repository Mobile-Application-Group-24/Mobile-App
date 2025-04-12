import { Exercise } from './workout';

// Sample exercises for each workout type
export const exercisesByWorkoutType: Record<string, Exercise[]> = {
  'Chest': [
    { id: 'chest1', name: 'Bench Press', sets: 4, reps: 10, weight: 135, type: 'chest' },
    { id: 'chest2', name: 'Incline Bench Press', sets: 3, reps: 10, weight: 115, type: 'chest' },
    { id: 'chest3', name: 'Decline Bench Press', sets: 3, reps: 10, weight: 125, type: 'chest' },
    { id: 'chest4', name: 'Push-Ups', sets: 3, reps: 15, weight: 0, type: 'chest' },
    { id: 'chest5', name: 'Dumbbell Flyes', sets: 3, reps: 12, weight: 40, type: 'chest' },
    { id: 'chest6', name: 'Cable Flyes', sets: 3, reps: 15, weight: 30, type: 'chest' },
    { id: 'chest7', name: 'Dips', sets: 3, reps: 12, weight: 0, type: 'chest' },
    { id: 'chest8', name: 'Machine Chest Press', sets: 3, reps: 12, weight: 150, type: 'chest' },
    { id: 'chest9', name: 'Dumbbell Pullovers', sets: 3, reps: 12, weight: 45, type: 'chest' },
    { id: 'chest10', name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 60, type: 'chest' },
    { id: 'chest11', name: 'Pec Deck Machine', sets: 3, reps: 15, weight: 120, type: 'chest' },
    { id: 'chest12', name: 'Decline Push-Ups', sets: 3, reps: 15, weight: 0, type: 'chest' },
    { id: 'chest13', name: 'Incline Cable Flyes', sets: 3, reps: 15, weight: 30, type: 'chest' },
    { id: 'chest14', name: 'Smith Machine Bench Press', sets: 3, reps: 10, weight: 135, type: 'chest' }
  ],
  'Back': [
    { id: 'back1', name: 'Pull-Ups', sets: 3, reps: 8, weight: 0, type: 'back' },
    { id: 'back2', name: 'Bent Over Rows', sets: 3, reps: 10, weight: 135, type: 'back' },
    { id: 'back3', name: 'Lat Pulldowns', sets: 3, reps: 12, weight: 120, type: 'back' },
    { id: 'back4', name: 'Deadlifts', sets: 3, reps: 6, weight: 225, type: 'back' },
    { id: 'back5', name: 'T-Bar Rows', sets: 3, reps: 10, weight: 135, type: 'back' },
    { id: 'back6', name: 'Cable Rows', sets: 3, reps: 12, weight: 140, type: 'back' },
    { id: 'back7', name: 'Face Pulls', sets: 3, reps: 15, weight: 50, type: 'back' },
    { id: 'back8', name: 'Chin-Ups', sets: 3, reps: 8, weight: 0, type: 'back' },
    { id: 'back9', name: 'Single-Arm Dumbbell Rows', sets: 3, reps: 10, weight: 55, type: 'back' },
    { id: 'back10', name: 'Hyperextensions', sets: 3, reps: 15, weight: 25, type: 'back' },
    { id: 'back11', name: 'Wide-Grip Pull-Ups', sets: 3, reps: 8, weight: 0, type: 'back' },
    { id: 'back12', name: 'Straight Arm Pulldowns', sets: 3, reps: 15, weight: 50, type: 'back' },
    { id: 'back13', name: 'Machine Rows', sets: 3, reps: 12, weight: 140, type: 'back' },
    { id: 'back14', name: 'Renegade Rows', sets: 3, reps: 10, weight: 40, type: 'back' },
    { id: 'back15', name: 'Good Mornings', sets: 3, reps: 12, weight: 95, type: 'back' }
  ],
  'Arms': [
    { id: 'arms1', name: 'Bicep Curls', sets: 3, reps: 12, weight: 35, type: 'arms' },
    { id: 'arms2', name: 'Tricep Pushdowns', sets: 3, reps: 12, weight: 50, type: 'arms' },
    { id: 'arms3', name: 'Hammer Curls', sets: 3, reps: 12, weight: 30, type: 'arms' },
    { id: 'arms4', name: 'Skull Crushers', sets: 3, reps: 12, weight: 60, type: 'arms' },
    { id: 'arms5', name: 'Concentration Curls', sets: 3, reps: 12, weight: 25, type: 'arms' },
    { id: 'arms6', name: 'Overhead Tricep Extension', sets: 3, reps: 12, weight: 40, type: 'arms' },
    { id: 'arms7', name: 'Preacher Curls', sets: 3, reps: 10, weight: 60, type: 'arms' },
    { id: 'arms8', name: 'Tricep Dips', sets: 3, reps: 15, weight: 0, type: 'arms' },
    { id: 'arms9', name: 'Incline Dumbbell Curls', sets: 3, reps: 12, weight: 30, type: 'arms' },
    { id: 'arms10', name: 'Close-Grip Bench Press', sets: 3, reps: 10, weight: 115, type: 'arms' },
    { id: 'arms11', name: 'Spider Curls', sets: 3, reps: 12, weight: 25, type: 'arms' },
    { id: 'arms12', name: 'Diamond Push-Ups', sets: 3, reps: 15, weight: 0, type: 'arms' },
    { id: 'arms13', name: 'Cable Curls', sets: 3, reps: 15, weight: 40, type: 'arms' },
    { id: 'arms14', name: 'Tricep Kickbacks', sets: 3, reps: 15, weight: 20, type: 'arms' },
    { id: 'arms15', name: 'Wrist Curls', sets: 3, reps: 20, weight: 30, type: 'arms' },
    { id: 'arms16', name: 'Reverse Curls', sets: 3, reps: 12, weight: 40, type: 'arms' }
  ],
  'Core': [
    { id: 'core1', name: 'Planks', sets: 3, reps: 0, weight: 0, type: 'core' },
    { id: 'core2', name: 'Russian Twists', sets: 3, reps: 20, weight: 25, type: 'core' },
    { id: 'core3', name: 'Crunches', sets: 3, reps: 20, weight: 0, type: 'core' },
    { id: 'core4', name: 'Leg Raises', sets: 3, reps: 15, weight: 0, type: 'core' },
    { id: 'core5', name: 'Ab Rollouts', sets: 3, reps: 12, weight: 0, type: 'core' },
    { id: 'core6', name: 'Mountain Climbers', sets: 3, reps: 30, weight: 0, type: 'core' },
    { id: 'core7', name: 'Side Planks', sets: 3, reps: 0, weight: 0, type: 'core' },
    { id: 'core8', name: 'Bicycle Crunches', sets: 3, reps: 20, weight: 0, type: 'core' },
    { id: 'core9', name: 'Hanging Leg Raises', sets: 3, reps: 12, weight: 0, type: 'core' },
    { id: 'core10', name: 'Dead Bugs', sets: 3, reps: 15, weight: 0, type: 'core' },
    { id: 'core11', name: 'Plank with Shoulder Taps', sets: 3, reps: 20, weight: 0, type: 'core' },
    { id: 'core12', name: 'Flutter Kicks', sets: 3, reps: 30, weight: 0, type: 'core' },
    { id: 'core13', name: 'V-Ups', sets: 3, reps: 15, weight: 0, type: 'core' },
    { id: 'core14', name: 'Oblique Crunches', sets: 3, reps: 20, weight: 0, type: 'core' },
    { id: 'core15', name: 'Woodchoppers', sets: 3, reps: 15, weight: 25, type: 'core' }
  ],
  'Shoulders': [
    { id: 'shoulders1', name: 'Shoulder Press', sets: 3, reps: 10, weight: 95, type: 'shoulders' },
    { id: 'shoulders2', name: 'Lateral Raises', sets: 3, reps: 15, weight: 20, type: 'shoulders' },
    { id: 'shoulders3', name: 'Front Raises', sets: 3, reps: 12, weight: 25, type: 'shoulders' },
    { id: 'shoulders4', name: 'Reverse Flyes', sets: 3, reps: 15, weight: 20, type: 'shoulders' },
    { id: 'shoulders5', name: 'Upright Rows', sets: 3, reps: 12, weight: 65, type: 'shoulders' },
    { id: 'shoulders6', name: 'Shrugs', sets: 3, reps: 15, weight: 120, type: 'shoulders' },
    { id: 'shoulders7', name: 'Face Pulls', sets: 3, reps: 15, weight: 50, type: 'shoulders' },
    { id: 'shoulders8', name: 'Arnold Press', sets: 3, reps: 10, weight: 45, type: 'shoulders' },
    { id: 'shoulders9', name: 'Military Press', sets: 3, reps: 8, weight: 95, type: 'shoulders' },
    { id: 'shoulders10', name: 'Bent-Over Lateral Raises', sets: 3, reps: 15, weight: 15, type: 'shoulders' },
    { id: 'shoulders11', name: 'Cable Lateral Raises', sets: 3, reps: 15, weight: 15, type: 'shoulders' },
    { id: 'shoulders12', name: 'Push Press', sets: 3, reps: 8, weight: 105, type: 'shoulders' },
    { id: 'shoulders13', name: 'Smith Machine Shoulder Press', sets: 3, reps: 10, weight: 115, type: 'shoulders' },
    { id: 'shoulders14', name: 'Dumbbell Shoulder Press', sets: 3, reps: 10, weight: 50, type: 'shoulders' }
  ],
  'Legs': [
    { id: 'legs1', name: 'Squats', sets: 4, reps: 8, weight: 185, type: 'legs' },
    { id: 'legs2', name: 'Romanian Deadlifts', sets: 3, reps: 10, weight: 155, type: 'legs' },
    { id: 'legs3', name: 'Leg Press', sets: 3, reps: 12, weight: 270, type: 'legs' },
    { id: 'legs4', name: 'Leg Extensions', sets: 3, reps: 15, weight: 90, type: 'legs' },
    { id: 'legs5', name: 'Calf Raises', sets: 4, reps: 15, weight: 120, type: 'legs' },
    { id: 'legs6', name: 'Lunges', sets: 3, reps: 10, weight: 80, type: 'legs' },
    { id: 'legs7', name: 'Leg Curls', sets: 3, reps: 12, weight: 70, type: 'legs' },
    { id: 'legs8', name: 'Front Squats', sets: 3, reps: 8, weight: 135, type: 'legs' },
    { id: 'legs9', name: 'Hack Squats', sets: 3, reps: 10, weight: 180, type: 'legs' },
    { id: 'legs10', name: 'Bulgarian Split Squats', sets: 3, reps: 10, weight: 50, type: 'legs' },
    { id: 'legs11', name: 'Hip Thrusts', sets: 3, reps: 12, weight: 180, type: 'legs' },
    { id: 'legs12', name: 'Seated Calf Raises', sets: 4, reps: 15, weight: 90, type: 'legs' },
    { id: 'legs13', name: 'Goblet Squats', sets: 3, reps: 12, weight: 70, type: 'legs' },
    { id: 'legs14', name: 'Sumo Deadlifts', sets: 3, reps: 8, weight: 225, type: 'legs' },
    { id: 'legs15', name: 'Box Jumps', sets: 3, reps: 10, weight: 0, type: 'legs' },
    { id: 'legs16', name: 'Glute Bridges', sets: 3, reps: 15, weight: 135, type: 'legs' },
    { id: 'legs17', name: 'Seated Leg Press', sets: 3, reps: 12, weight: 300, type: 'legs' }
  ]
};

/**
 * Helper function to determine exercise type based on exercise name
 */
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
