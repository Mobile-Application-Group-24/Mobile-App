import { supabase } from './supabase';
import Constants from 'expo-constants';
import { NutritionSettings, MealTime } from './supabase';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type DeepseekResponse = {
  id: string;
  choices: {
    message: Message;
    finish_reason: string;
    index: number;
  }[];
  created: number;
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

interface Workout {
  title: string;
  date: string;
  duration: number; 
  exercises: Exercise[];
  notes?: string;
  calories_burned?: number;
}

interface WorkoutPlan {
  title: string;
  description?: string;
  workout_type: 'split' | 'custom';
  day_of_week?: string | null;
  duration_minutes: number;
  exercises: {
    id: string;
    name: string;
    sets: number;
    type?: 'chest' | 'back' | 'arms' | 'legs' | 'shoulders' | 'core';
  }[];
  user_id: string;
}

const getSystemPrompt = async (userId: string) => {

  const { data: nutritionSettings, error: nutritionError } = await supabase
    .from('nutrition_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  const { data: workoutData, error: workoutError } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: workoutPlans, error: workoutPlansError } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('Nutrition settings fetched for prompt:', nutritionSettings);
  console.log('Workout data fetched for prompt:', workoutData);
  console.log('Workout plans fetched for prompt:', workoutPlans);

  const { exercisesByWorkoutType } = await import('./exercises');

  const allExercises = Object.values(exercisesByWorkoutType).flat().map(ex => ({
    id: ex.id,
    name: ex.name,
    type: ex.type
  }));

  const exerciseSample = allExercises.slice(0, 20);

  return `You are an AI fitness coach assistant for a GymApp. 
You have access to the user's fitness data and can help them with workouts, nutrition advice, and track their progress.
You can modify their data when they explicitly ask you to update their information or add new entries.

User's current nutrition settings: ${JSON.stringify(nutritionSettings || {})}
User's recent workouts: ${JSON.stringify(workoutData || [])}
User's workout plans: ${JSON.stringify(workoutPlans || [])}

IMPORTANT: When the user asks you to update their data or create new entries, 
respond with special formatted sections in your message:

1. For updating nutrition settings, use:
\`\`\`
DATA_UPDATE_NUTRITION:
{
  "calorie_goal": 2200,
  "water_goal": 8,
  "water_notifications": true,
  "water_interval": 2,
  "meal_times": [
    {"name": "Breakfast", "time": "08:00", "enabled": true},
    {"name": "Lunch", "time": "13:00", "enabled": true},
    {"name": "Dinner", "time": "19:00", "enabled": true},
    {"name": "Snacks", "time": "11:00", "enabled": false}
  ]
}
END_DATA_UPDATE
\`\`\`

2. For adding a workout, use:
\`\`\`
DATA_ADD_WORKOUT:
{
  "title": "Full Body Workout",
  "date": "2023-06-30T10:00:00",
  "duration": 60,
  "exercises": [
    {"name": "Squats", "sets": 3, "reps": 12, "weight": 50},
    {"name": "Push-ups", "sets": 3, "reps": 15},
    {"name": "Deadlifts", "sets": 3, "reps": 10, "weight": 70}
  ],
  "notes": "Felt great, increased weights for squats",
  "calories_burned": 350
}
END_DATA_ADD
\`\`\`

3. For creating a workout plan, use:
\`\`\`
DATA_ADD_WORKOUT_PLAN:
{
  "title": "Upper Body Workout",
  "description": "Focus on chest, back and arms",
  "workout_type": "custom",
  "day_of_week": "Monday",
  "duration_minutes": 60,
  "exercises": [
    {"id": "chest1", "name": "Barbell Bench Press", "sets": 4, "type": "chest"},
    {"id": "back3", "name": "Lat Pulldown", "sets": 3, "type": "back"},
    {"id": "arms1", "name": "Barbell Bicep Curl", "sets": 3, "type": "arms"}
  ]
}
END_DATA_ADD
\`\`\`

IMPORTANT: For workout plans, you MUST ONLY use exercises from our database. Here's a sample:
${JSON.stringify(exerciseSample)}
The full list is much larger. When suggesting exercises, use only the exact names from this list.

Always ask for confirmation before making changes to the user's data.

IMPORTANT: Use Markdown formatting in your responses to improve readability.
- Use headings (##, ###) for section titles
- Use bullet points and numbered lists where appropriate
- Use bold (**text**) and italic (*text*) for emphasis
- Use tables for structured data
- Use code blocks for workout examples or recipes

This will make your responses more organized and easier to read.`;
};

export const sendMessageToDeepseek = async (
  messages: Message[],
  userId: string
): Promise<string> => {
  try {
    const systemPrompt = await getSystemPrompt(userId);
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    console.log('Using API key:', DEEPSEEK_API_KEY ? `${DEEPSEEK_API_KEY.substring(0, 5)}...` : 'API key is missing');

    if (!DEEPSEEK_API_KEY) {
      throw new Error('Deepseek API key is missing. Make sure EXPO_PUBLIC_DEEPSEEK_API_KEY is set in your environment.');
    }

    console.log('Full messages being sent to Deepseek:', JSON.stringify(fullMessages, null, 2));

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: fullMessages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Deepseek API error: ${response.status} ${errorData}`);
    }

    const data: DeepseekResponse = await response.json();
    console.log('Response from Deepseek:', data.choices[0].message.content);
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Deepseek API:', error);
    throw error;
  }
};

export const updateNutritionData = async (
  userId: string,
  nutritionData: Partial<NutritionSettings>
) => {
  try {
    console.log('updateNutritionData called with userId:', userId);
    console.log('nutritionData received:', JSON.stringify(nutritionData, null, 2));

    if (!nutritionData) {
      const error = new Error('No nutrition data provided');
      console.error(error);
      throw error;
    }

    const { data: existingData, error: checkError } = await supabase
      .from('nutrition_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing nutrition settings:', checkError);
      throw checkError;
    }

    console.log('Existing nutrition settings:', existingData);

    let formattedData: any = { ...nutritionData };

    if (nutritionData.meal_times && Array.isArray(nutritionData.meal_times)) {
      formattedData.meal_times = nutritionData.meal_times.map((meal: any) => {
        console.log('Processing meal time:', meal);
        return {
          name: meal.name || '',
          time: meal.time || '12:00',
          enabled: meal.enabled !== undefined ? meal.enabled : true
        };
      });
    }

    formattedData.updated_at = new Date().toISOString();
    
    console.log('Formatted data for upsert:', JSON.stringify(formattedData, null, 2));

    console.log('Upserting nutrition settings in Supabase...');
    const { data, error } = await supabase
      .from('nutrition_settings')
      .upsert({ 
        user_id: userId,
        ...formattedData
      })
      .select();
    
    if (error) {
      console.error('Error updating nutrition settings:', error);
      throw error;
    }

    console.log('Successfully updated nutrition settings:', data);
    
    return data;
  } catch (error) {
    console.error('Error in updateNutritionData:', error);
    throw error;
  }
};

export const addWorkoutEntry = async (
  userId: string,
  workoutData: Workout
) => {
  try {
    console.log('addWorkoutEntry called with userId:', userId);
    console.log('workoutData received:', JSON.stringify(workoutData, null, 2));

    if (!workoutData.title || !workoutData.date || !workoutData.exercises || workoutData.exercises.length === 0) {
      const error = new Error('Invalid workout data. Title, date, and exercises are required.');
      console.error(error);
      console.error('Missing fields:', {
        title: !workoutData.title,
        date: !workoutData.date,
        exercises: !workoutData.exercises || workoutData.exercises.length === 0
      });
      throw error;
    }

    const formattedWorkout = {
      user_id: userId,
      title: workoutData.title,
      date: new Date(workoutData.date).toISOString(),
      duration_minutes: workoutData.duration,
      exercises: workoutData.exercises,
      notes: workoutData.notes || '',
      calories_burned: workoutData.calories_burned || 0,
      created_at: new Date().toISOString()
    };
    
    console.log('Formatted workout for insert:', JSON.stringify(formattedWorkout, null, 2));

    console.log('Inserting workout into Supabase...');
    const { data, error } = await supabase
      .from('workouts')
      .insert(formattedWorkout)
      .select();
    
    if (error) {
      console.error('Error adding workout:', error);
      throw error;
    }

    console.log('Successfully added workout:', data);
    
    return data;
  } catch (error) {
    console.error('Error in addWorkoutEntry:', error);
    throw error;
  }
};

/**
 * Generate weight modification suggestions based on workout history using DeepSeek AI
 * @param userId User ID
 * @param workoutData Recent workout data with exercise details
 * @returns Array of weight modification suggestions
 */
export async function generateWeightSuggestions(userId: string, workoutData: any[]) {
  try {
    console.log('Generating weight suggestions from DeepSeek AI');

    const workoutHistory = JSON.stringify(workoutData);
    
    const messages = [
      {
        role: 'system',
        content: `You are an AI fitness coach specializing in progressive overload recommendations. 
        Analyze the user's workout history and suggest specific weight increases for exercises 
        where you see potential for progression. Focus only on exercises where the user has been 
        using consistent weights.`
      },
      {
        role: 'user',
        content: `Here is my recent workout history: ${workoutHistory}

        Based on this data, suggest up to 3 exercises where I could increase the weight. 
        For each suggestion, provide the current weight I'm using and the suggested weight increase.
        Format your response as a JSON array with this structure:
        [
          {
            "exercise": "Exercise Name",
            "currentWeight": 50,
            "suggestedWeight": 55,
            "suggestion": "Increase weight by 5kg and aim for 8-10 reps for better strength gains."
          }
        ]
        Only include the JSON array in your response, nothing else.`
      }
    ];

    const apiResponse = await sendMessageToDeepseek(messages, userId);
    
    try {

      const jsonMatch = apiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        return JSON.parse(jsonString);
      } else {
        console.warn('No JSON array found in DeepSeek response');
        return [];
      }
    } catch (parseError) {
      console.error('Error parsing DeepSeek suggestion response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error generating weight suggestions:', error);
    return [];
  }
}

/**
 * Generate exercise suggestions for the user's workout routines
 * @param userId User ID
 * @returns Array of exercise suggestions with reasoning
 */
export async function generateExerciseSuggestions(userId: string) {
  try {
    console.log('Generating exercise suggestions from DeepSeek AI');

    const { data: workouts, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching workout data for suggestions:', error);
      return [];
    }

    const { exercisesByWorkoutType } = await import('./exercises');

    const allExercises = Object.values(exercisesByWorkoutType).flat().map(ex => ({
      id: ex.id,
      name: ex.name,
      type: ex.type
    }));

    const workoutHistory = JSON.stringify(workouts);
    const availableExercises = JSON.stringify(allExercises);
    
    const messages = [
      {
        role: 'system',
        content: `You are an AI fitness coach specializing in workout routine improvement. 
        Analyze the user's workout history and suggest specific exercise additions or modifications
        that would improve their overall routine balance and results. IMPORTANT: You must ONLY suggest
        exercises from the provided list of available exercises. Do not make up or suggest any exercises
        that are not in this list.`
      },
      {
        role: 'user',
        content: `Here is my recent workout history: ${workoutHistory}

        Here is the complete list of exercises that are available to me: ${availableExercises}

        Based on this data, suggest 2-3 potential improvements to my routine. These could be:
        1. New exercises to add to my workouts (ONLY from the provided list)
        2. Additional sets for exercises I'm already doing

        For each suggestion, explain why it would benefit my routine.
        Format your response as a JSON array with this structure:
        [
          {
            "type": "New Exercise" or "Additional Set",
            "exercise": "Exercise Name",
            "suggestion": "Brief description of how to incorporate this (sets, reps, etc.)",
            "reasoning": "Why this would benefit my routine",
            "target_workout": "Optional - which workout type this should be added to (e.g., 'Leg Day', 'Upper Body')"
          }
        ]
        Only include the JSON array in your response, nothing else.
        REMEMBER: Only suggest exercises that are in the provided list of available exercises.`
      }
    ];

    const apiResponse = await sendMessageToDeepseek(messages, userId);

    try {

      const jsonMatch = apiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        const suggestions = JSON.parse(jsonString);

        return suggestions.filter(suggestion => {

          const exerciseExists = Object.values(exercisesByWorkoutType).flat().some(
            ex => ex.name.toLowerCase() === suggestion.exercise.toLowerCase()
          );
          
          if (!exerciseExists) {
            console.warn(`Filtering out suggestion for non-existent exercise: ${suggestion.exercise}`);
          }
          
          return exerciseExists;
        });
      } else {
        console.warn('No JSON array found in DeepSeek response');
        return [];
      }
    } catch (parseError) {
      console.error('Error parsing DeepSeek suggestion response:', parseError);
      return [];
    }
  } catch (error) {
    console.error('Error generating exercise suggestions:', error);
    return [];
  }
}

export const createWorkoutPlan = async (
  userId: string,
  planData: Omit<WorkoutPlan, 'user_id'>
) => {
  try {

    console.log('createWorkoutPlan called with userId:', userId);
    console.log('planData received:', JSON.stringify(planData, null, 2));

    if (!planData.title || !planData.exercises || planData.exercises.length === 0) {
      const error = new Error('Invalid workout plan data. Title and exercises are required.');
      console.error(error);
      throw error;
    }

    const formattedPlan = {
      user_id: userId,
      title: planData.title,
      description: planData.description || '',
      workout_type: 'custom',
      day_of_week: planData.day_of_week || null,
      duration_minutes: planData.duration_minutes || 60,
      exercises: planData.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        type: exercise.type
      }))
    };
    
    console.log('Formatted workout plan for insert:', JSON.stringify(formattedPlan, null, 2));

    const { data, error } = await supabase
      .from('workout_plans')
      .insert(formattedPlan)
      .select();
    
    if (error) {
      console.error('Error adding workout plan:', error);
      throw error;
    }

    console.log('Successfully added workout plan:', data);
    
    return data;
  } catch (error) {
    console.error('Error in createWorkoutPlan:', error);
    throw error;
  }
};
