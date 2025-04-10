import { supabase } from './supabase';
import Constants from 'expo-constants';
import { NutritionSettings, MealTime } from './supabase';

// Types for Deepseek API
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

// Get the API key from public environment variables
const DEEPSEEK_API_KEY = process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY;

// Define workout-related types
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
  duration: number; // in minutes
  exercises: Exercise[];
  notes?: string;
  calories_burned?: number;
}

// System prompt that gives context about the app and user data access permissions
const getSystemPrompt = async (userId: string) => {
  // Fetch user's nutrition settings and workout data to provide context
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

  console.log('Nutrition settings fetched for prompt:', nutritionSettings);
  console.log('Workout data fetched for prompt:', workoutData);

  return `You are an AI fitness coach assistant for a GymApp. 
You have access to the user's fitness data and can help them with workouts, nutrition advice, and track their progress.
You can modify their data when they explicitly ask you to update their information or add new entries.

User's current nutrition settings: ${JSON.stringify(nutritionSettings || {})}
User's recent workouts: ${JSON.stringify(workoutData || [])}

IMPORTANT: When the user asks you to update their nutrition settings or create a new workout, 
you should generate a special formatted response that includes the data in a specific format:

1. For updating nutrition settings, include a section like this:
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

2. For adding a workout, include a section like this:
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
    // Add system message with context about the user
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

// Function to update user nutrition data
export const updateNutritionData = async (
  userId: string,
  nutritionData: Partial<NutritionSettings>
) => {
  try {
    // Log input data
    console.log('updateNutritionData called with userId:', userId);
    console.log('nutritionData received:', JSON.stringify(nutritionData, null, 2));

    // Validate the input data structure
    if (!nutritionData) {
      const error = new Error('No nutrition data provided');
      console.error(error);
      throw error;
    }

    // Check if a record already exists for this user
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

    // Format meal times properly if provided
    let formattedData: any = { ...nutritionData };
    
    // If meal_times is provided, ensure it's properly formatted as an array
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

    // Add updated_at timestamp
    formattedData.updated_at = new Date().toISOString();
    
    console.log('Formatted data for upsert:', JSON.stringify(formattedData, null, 2));

    // If record exists, update it; otherwise insert a new record
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
    
    // Log success for debugging
    console.log('Successfully updated nutrition settings:', data);
    
    return data;
  } catch (error) {
    console.error('Error in updateNutritionData:', error);
    throw error;
  }
};

// Function to add a new workout entry
export const addWorkoutEntry = async (
  userId: string,
  workoutData: Workout
) => {
  try {
    // Log input data
    console.log('addWorkoutEntry called with userId:', userId);
    console.log('workoutData received:', JSON.stringify(workoutData, null, 2));

    // Validate workout data
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

    // Format the workout data for the database
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

    // Insert the workout
    console.log('Inserting workout into Supabase...');
    const { data, error } = await supabase
      .from('workouts')
      .insert(formattedWorkout)
      .select();
    
    if (error) {
      console.error('Error adding workout:', error);
      throw error;
    }
    
    // Log success for debugging
    console.log('Successfully added workout:', data);
    
    return data;
  } catch (error) {
    console.error('Error in addWorkoutEntry:', error);
    throw error;
  }
};
