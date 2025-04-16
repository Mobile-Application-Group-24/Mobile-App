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
      { id: 'chest1', name: 'Barbell Bench Press', type: 'chest' },
      { id: 'chest2', name: 'Incline Barbell Bench Press', type: 'chest' },
      { id: 'chest3', name: 'Decline Barbell Bench Press', type: 'chest' },
      { id: 'chest4', name: 'Dumbbell Bench Press', type: 'chest' },
      { id: 'chest5', name: 'Incline Dumbbell Press', type: 'chest' },
      { id: 'chest6', name: 'Decline Dumbbell Press', type: 'chest' },
      { id: 'chest7', name: 'Dumbbell Flyes', type: 'chest' },
      { id: 'chest8', name: 'Incline Dumbbell Flyes', type: 'chest' },
      { id: 'chest9', name: 'Cable Crossover', type: 'chest' },
      { id: 'chest10', name: 'Low Cable Crossover', type: 'chest' },
      { id: 'chest11', name: 'High Cable Crossover', type: 'chest' },
      { id: 'chest12', name: 'Pec Deck Machine', type: 'chest' },
      { id: 'chest13', name: 'Push Ups', type: 'chest' },
      { id: 'chest14', name: 'Incline Push Ups', type: 'chest' },
      { id: 'chest15', name: 'Decline Push Ups', type: 'chest' },
      { id: 'chest16', name: 'Dips (Chest Version)', type: 'chest' },
      { id: 'chest17', name: 'Smith Machine Bench Press', type: 'chest' },
      { id: 'chest18', name: 'Smith Machine Incline Press', type: 'chest' },
      { id: 'chest19', name: 'Landmine Press ', type: 'chest' },
      { id: 'chest20', name: 'Resistance Band Chest Press', type: 'chest' },
      { id: 'chest21', name: 'Medicine Ball Chest Pass', type: 'chest' },
      { id: 'chest22', name: 'Guillotine Press', type: 'chest' },
      { id: 'chest23', name: 'Neutral Grip Dumbbell Press', type: 'chest' },
      { id: 'chest24', name: 'Single Arm Dumbbell Press', type: 'chest' },
      { id: 'chest25', name: 'Floor Press', type: 'chest' },
      { id: 'chest26', name: 'Spoto Press', type: 'chest' },
      { id: 'chest27', name: 'Reverse Grip Bench Press', type: 'chest' },
      { id: 'chest28', name: 'Plate Press', type: 'chest' },
      { id: 'chest29', name: 'Machine Chest Press', type: 'chest' },
      { id: 'chest30', name: 'Dumbbell Pullover', type: 'chest' },
      { id: 'chest31', name: 'Svend Press', type: 'chest' },
      { id: 'chest32', name: 'Wide Grip Bench Press', type: 'chest' },
      { id: 'chest33', name: 'Close Grip Bench Press ', type: 'chest' }
    ],
    'Back': [
      { id: 'back1', name: 'Pull Ups', type: 'back' },
      { id: 'back2', name: 'Chin Ups', type: 'back' },
      { id: 'back3', name: 'Lat Pulldown', type: 'back' },
      { id: 'back4', name: 'Wide Grip Lat Pulldown', type: 'back' },
      { id: 'back5', name: 'Close Grip Lat Pulldown', type: 'back' },
      { id: 'back6', name: 'Neutral Grip Pulldown', type: 'back' },
      { id: 'back7', name: 'Barbell Deadlift', type: 'back' },
      { id: 'back8', name: 'Romanian Deadlift', type: 'back' },
      { id: 'back9', name: 'Sumo Deadlift', type: 'back' },
      { id: 'back10', name: 'T-Bar Row', type: 'back' },
      { id: 'back11', name: 'Bent Over Barbell Row', type: 'back' },
      { id: 'back12', name: 'Seated Cable Row', type: 'back' },
      { id: 'back13', name: 'Single Arm Dumbbell Row', type: 'back' },
      { id: 'back14', name: 'Chest Supported Row', type: 'back' },
      { id: 'back15', name: 'Inverted Row', type: 'back' },
      { id: 'back16', name: 'Face Pull', type: 'back' },
      { id: 'back17', name: 'Straight Arm Pulldown', type: 'back' },
      { id: 'back18', name: 'Hyperextension', type: 'back' },
      { id: 'back19', name: 'Good Morning', type: 'back' },
      { id: 'back20', name: 'Rack Pull', type: 'back' },
      { id: 'back21', name: 'Machine Row', type: 'back' },
      { id: 'back22', name: 'Landmine Row', type: 'back' },
      { id: 'back23', name: 'Kettlebell Swing', type: 'back' },
      { id: 'back24', name: 'Reverse Fly', type: 'back' },
      { id: 'back25', name: 'Snatch Grip Deadlift', type: 'back' },
      { id: 'back26', name: 'Dumbbell Deadlift', type: 'back' },
      { id: 'back27', name: 'Barbell Shrug ', type: 'back' },
      { id: 'back28', name: 'Dumbbell Shrug ', type: 'back' },
      { id: 'back29', name: 'Farmer\'s Walk ', type: 'back' },
      { id: 'back30', name: 'Renegade Row', type: 'back' },
      { id: 'back31', name: 'Supermans', type: 'back' },
      { id: 'back32', name: 'Bird Dog', type: 'back' },
      { id: 'back33', name: 'Cable Pull Through', type: 'back' }
    ],
    'Arms': [
      { id: 'arms1', name: 'Barbell Bicep Curl', type: 'arms' },
      { id: 'arms2', name: 'Dumbbell Bicep Curl', type: 'arms' },
      { id: 'arms3', name: 'Hammer Curl', type: 'arms' },
      { id: 'arms4', name: 'Preacher Curl', type: 'arms' },
      { id: 'arms5', name: 'Concentration Curl', type: 'arms' },
      { id: 'arms6', name: 'EZ Bar Curl', type: 'arms' },
      { id: 'arms7', name: 'Reverse Curl', type: 'arms' },
      { id: 'arms8', name: 'Spider Curl', type: 'arms' },
      { id: 'arms9', name: 'Zottman Curl', type: 'arms' },
      { id: 'arms10', name: 'Cable Bicep Curl', type: 'arms' },
      { id: 'arms11', name: 'Close Grip Bench Press', type: 'arms' },
      { id: 'arms12', name: 'Triceps Dip', type: 'arms' },
      { id: 'arms13', name: 'Skull Crusher', type: 'arms' },
      { id: 'arms14', name: 'Triceps Rope Pushdown', type: 'arms' },
      { id: 'arms15', name: 'Overhead Triceps Extension', type: 'arms' },
      { id: 'arms16', name: 'Dumbbell Triceps Kickback', type: 'arms' },
      { id: 'arms17', name: 'Diamond Push Up', type: 'arms' },
      { id: 'arms18', name: 'Bench Dip', type: 'arms' },
      { id: 'arms19', name: 'Tate Press', type: 'arms' },
      { id: 'arms20', name: 'French Press', type: 'arms' },
      { id: 'arms21', name: 'JM Press', type: 'arms' },
      { id: 'arms22', name: 'Lying Triceps Extension', type: 'arms' },
      { id: 'arms23', name: 'Wrist Curl', type: 'arms' },
      { id: 'arms24', name: 'Reverse Wrist Curl', type: 'arms' },
      { id: 'arms25', name: 'Farmer\'s Carry', type: 'arms' },
      { id: 'arms26', name: 'Plate Pinch', type: 'arms' },
      { id: 'arms27', name: 'Towel Grip Pull Up', type: 'arms' },
      { id: 'arms28', name: 'Fat Grip Training', type: 'arms' },
      { id: 'arms29', name: 'Behind-the-Back Barbell Wrist Curl', type: 'arms' },
      { id: 'arms30', name: 'Seated Dumbbell Palms-Up Wrist Curl', type: 'arms' },
      { id: 'arms31', name: 'Seated Dumbbell Palms-Down Wrist Curl', type: 'arms' },
      { id: 'arms32', name: 'Barbell Finger Roll', type: 'arms' }
    ],
    'Core': [
      { id: 'core1', name: 'Plank', type: 'core' },
      { id: 'core2', name: 'Side Plank', type: 'core' },
      { id: 'core3', name: 'Russian Twist', type: 'core' },
      { id: 'core4', name: 'Bicycle Crunch', type: 'core' },
      { id: 'core5', name: 'Hanging Leg Raise', type: 'core' },
      { id: 'core6', name: 'Captain\'s Chair Leg Raise', type: 'core' },
      { id: 'core7', name: 'Ab Wheel Rollout', type: 'core' },
      { id: 'core8', name: 'Cable Crunch', type: 'core' },
      { id: 'core9', name: 'Reverse Crunch', type: 'core' },
      { id: 'core10', name: 'Flutter Kicks', type: 'core' },
      { id: 'core11', name: 'Scissor Kicks', type: 'core' },
      { id: 'core12', name: 'V-Up', type: 'core' },
      { id: 'core13', name: 'Toe Touch', type: 'core' },
      { id: 'core14', name: 'Dragon Flag', type: 'core' },
      { id: 'core15', name: 'L-Sit', type: 'core' },
      { id: 'core16', name: 'Hanging Knee Raise', type: 'core' },
      { id: 'core17', name: 'Woodchopper', type: 'core' },
      { id: 'core18', name: 'Medicine Ball Slam', type: 'core' },
      { id: 'core19', name: 'Dead Bug', type: 'core' },
      { id: 'core20', name: 'Bird Dog ', type: 'core' },
      { id: 'core21', name: 'Superman', type: 'core' },
      { id: 'core22', name: 'Sit-Up', type: 'core' },
      { id: 'core23', name: 'Decline Sit-Up', type: 'core' },
      { id: 'core24', name: 'Weighted Sit-Up', type: 'core' },
      { id: 'core25', name: 'Heel Tap', type: 'core' },
      { id: 'core26', name: 'Mountain Climber', type: 'core' },
      { id: 'core27', name: 'Bear Crawl', type: 'core' },
      { id: 'core28', name: 'Hollow Body Hold', type: 'core' },
      { id: 'core29', name: 'Arch Body Hold', type: 'core' },
      { id: 'core30', name: 'Pallof Press', type: 'core' },
      { id: 'core31', name: 'Landmine Rotation', type: 'core' },
      { id: 'core32', name: 'Seated Russian Twist', type: 'core' }
    ],
    'Shoulders': [
      { id: 'shoulders1', name: 'Overhead Press', type: 'shoulders' },
      { id: 'shoulders2', name: 'Dumbbell Shoulder Press', type: 'shoulders' },
      { id: 'shoulders3', name: 'Arnold Press', type: 'shoulders' },
      { id: 'shoulders4', name: 'Push Press', type: 'shoulders' },
      { id: 'shoulders5', name: 'Lateral Raise', type: 'shoulders' },
      { id: 'shoulders6', name: 'Front Raise', type: 'shoulders' },
      { id: 'shoulders7', name: 'Rear Delt Fly', type: 'shoulders' },
      { id: 'shoulders8', name: 'Face Pull ', type: 'shoulders' },
      { id: 'shoulders9', name: 'Upright Row', type: 'shoulders' },
      { id: 'shoulders10', name: 'Shrug', type: 'shoulders' },
      { id: 'shoulders11', name: 'Landmine Press', type: 'shoulders' },
      { id: 'shoulders12', name: 'Cable Lateral Raise', type: 'shoulders' },
      { id: 'shoulders13', name: 'Bent-Over Lateral Raise', type: 'shoulders' },
      { id: 'shoulders14', name: 'Single Arm Lateral Raise', type: 'shoulders' },
      { id: 'shoulders15', name: 'Seated Dumbbell Press', type: 'shoulders' },
      { id: 'shoulders16', name: 'Barbell Front Raise', type: 'shoulders' },
      { id: 'shoulders17', name: 'Plate Front Raise', type: 'shoulders' },
      { id: 'shoulders18', name: 'Reverse Pec Deck Fly', type: 'shoulders' },
      { id: 'shoulders19', name: 'Cuban Press', type: 'shoulders' },
      { id: 'shoulders20', name: 'Behind-the-Neck Press', type: 'shoulders' },
      { id: 'shoulders21', name: 'Clean and Press', type: 'shoulders' },
      { id: 'shoulders22', name: 'Kettlebell Press', type: 'shoulders' },
      { id: 'shoulders23', name: 'Handstand Push-Up', type: 'shoulders' },
      { id: 'shoulders24', name: 'Bradford Press', type: 'shoulders' },
      { id: 'shoulders25', name: 'Machine Shoulder Press', type: 'shoulders' },
      { id: 'shoulders26', name: 'Single Arm Cable Lateral Raise', type: 'shoulders' },
      { id: 'shoulders27', name: 'Seated Barbell Press', type: 'shoulders' },
      { id: 'shoulders28', name: 'Dumbbell Scaption', type: 'shoulders' },
      { id: 'shoulders29', name: 'Barbell Shrug', type: 'shoulders' },
      { id: 'shoulders30', name: 'Dumbbell Shrug', type: 'shoulders' },
      { id: 'shoulders31', name: 'Farmer\'s Walk', type: 'shoulders' },
      { id: 'shoulders32', name: 'Trap Bar Shrug', type: 'shoulders' }
    ],
    'Legs': [
      { id: 'legs1', name: 'Barbell Back Squat', type: 'legs' },
      { id: 'legs2', name: 'Front Squat', type: 'legs' },
      { id: 'legs3', name: 'Overhead Squat', type: 'legs' },
      { id: 'legs4', name: 'Bulgarian Split Squat', type: 'legs' },
      { id: 'legs5', name: 'Goblet Squat', type: 'legs' },
      { id: 'legs6', name: 'Sumo Squat', type: 'legs' },
      { id: 'legs7', name: 'Pistol Squat', type: 'legs' },
      { id: 'legs8', name: 'Leg Press', type: 'legs' },
      { id: 'legs9', name: 'Hack Squat', type: 'legs' },
      { id: 'legs10', name: 'Lunge', type: 'legs' },
      { id: 'legs11', name: 'Walking Lunge', type: 'legs' },
      { id: 'legs12', name: 'Reverse Lunge', type: 'legs' },
      { id: 'legs13', name: 'Step Up', type: 'legs' },
      { id: 'legs14', name: 'Romanian Deadlift', type: 'legs' },
      { id: 'legs15', name: 'Stiff-Legged Deadlift', type: 'legs' },
      { id: 'legs16', name: 'Good Morning ', type: 'legs' },
      { id: 'legs17', name: 'Leg Curl', type: 'legs' },
      { id: 'legs18', name: 'Standing Leg Curl', type: 'legs' },
      { id: 'legs19', name: 'Seated Leg Curl', type: 'legs' },
      { id: 'legs20', name: 'Leg Extension', type: 'legs' },
      { id: 'legs21', name: 'Calf Raise', type: 'legs' },
      { id: 'legs22', name: 'Seated Calf Raise', type: 'legs' },
      { id: 'legs23', name: 'Donkey Calf Raise', type: 'legs' },
      { id: 'legs24', name: 'Hip Thrust', type: 'legs' },
      { id: 'legs25', name: 'Glute Bridge', type: 'legs' },
      { id: 'legs26', name: 'Single Leg Glute Bridge', type: 'legs' },
      { id: 'legs27', name: 'Box Jump', type: 'legs' },
      { id: 'legs28', name: 'Jump Squat', type: 'legs' },
      { id: 'legs29', name: 'Wall Sit', type: 'legs' },
      { id: 'legs30', name: 'Sissy Squat', type: 'legs' },
      { id: 'legs31', name: 'Zercher Squat', type: 'legs' },
      { id: 'legs32', name: 'Landmine Squat', type: 'legs' },
      { id: 'legs33', name: 'Belt Squat', type: 'legs' }
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

// Function to check if an exercise already exists in a workout
export function isExerciseDuplicate(exerciseName: string, existingExercises: any[]): boolean {
  // Normalize the exercise name for comparison
  const normalizedName = exerciseName.toLowerCase().trim();
  
  // Check if any existing exercise matches by name (case insensitive)
  return existingExercises.some(exercise => 
    exercise.name.toLowerCase().trim() === normalizedName
  );
}
