import { supabase } from './supabase';

export async function checkDatabaseSchema() {
  console.log('Checking database schema...');
  
  try {
    // Basic connection test
    console.log('Testing basic connection to Supabase...');
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('_world_test')
        .select('*')
        .limit(1);
      
      if (connectionError) {
        console.log('Basic connection test error:', connectionError);
      } else {
        console.log('Basic connection to Supabase successful');
      }
    } catch (connErr) {
      console.error('Connection test failed with exception:', connErr);
    }
    
    // List all tables in the public schema
    console.log('Listing all tables...');
    try {
      const { data: tablesData, error: tablesError } = await supabase.rpc('list_tables');
      if (tablesError) {
        console.error('Error listing tables:', tablesError);
      } else {
        console.log('Tables in database:', tablesData);
      }
    } catch (listError) {
      console.log('Could not list tables:', listError);
    }

    // Check if nutrition_settings table exists and its columns
    const { data: nutritionColumns, error: nutritionError } = await supabase
      .from('nutrition_settings')
      .select('*')
      .limit(1);
    
    if (nutritionError) {
      console.error('Error accessing nutrition_settings table:', nutritionError);
    } else {
      console.log('nutrition_settings table exists');
      if (nutritionColumns && nutritionColumns.length > 0) {
        console.log('Sample nutrition_settings record:', nutritionColumns[0]);
      } else {
        console.log('nutrition_settings table is empty');
      }
    }
    
    // Check if workouts table exists and its columns
    const { data: workoutColumns, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .limit(1);
    
    if (workoutError) {
      console.error('Error accessing workouts table:', workoutError);
      
      // If the error indicates the table doesn't exist, suggest creating it
      if (workoutError.code === '42P01') { // Relation does not exist
        console.log('Workouts table does not exist. Attempting to create it...');
        
        // Create the table using SQL
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS public.workouts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            date TIMESTAMP WITH TIME ZONE NOT NULL,
            duration_minutes INTEGER NOT NULL,
            exercises JSONB NOT NULL,
            notes TEXT,
            calories_burned INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
          CREATE INDEX IF NOT EXISTS idx_workouts_date ON public.workouts(date);
          
          -- Enable Row Level Security
          ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
          
          -- Create RLS policies
          CREATE POLICY IF NOT EXISTS "Users can view their own workouts" 
          ON public.workouts
          FOR SELECT
          USING (auth.uid() = user_id);
          
          CREATE POLICY IF NOT EXISTS "Users can insert their own workouts" 
          ON public.workouts
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
          CREATE POLICY IF NOT EXISTS "Users can update their own workouts" 
          ON public.workouts
          FOR UPDATE
          USING (auth.uid() = user_id);
          
          CREATE POLICY IF NOT EXISTS "Users can delete their own workouts" 
          ON public.workouts
          FOR DELETE
          USING (auth.uid() = user_id);
        `;
        
        try {
          const { error: createError } = await supabase.rpc('execute_sql', { sql: createTableSQL });
          if (createError) {
            console.error('Error creating workouts table:', createError);
          } else {
            console.log('Workouts table created successfully');
          }
        } catch (sqlError) {
          console.error('SQL execution error:', sqlError);
        }
      }
    } else {
      console.log('workouts table exists');
      if (workoutColumns && workoutColumns.length > 0) {
        console.log('Sample workouts record:', workoutColumns[0]);
      } else {
        console.log('workouts table is empty');
      }
    }
    
    // Check user authentication
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Error getting authenticated user:', authError);
    } else {
      console.log('Current authenticated user:', authData?.user?.id || 'None');
    }
    
    return {
      nutritionSettings: !nutritionError,
      workouts: !workoutError,
      authentication: !authError && !!authData?.user,
      userId: authData?.user?.id,
      tablesExist: {
        nutrition_settings: !nutritionError,
        workouts: !workoutError
      }
    };
  } catch (error) {
    console.error('Error checking database schema:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      nutritionSettings: false,
      workouts: false,
      authentication: false
    };
  }
}

// Function to create a workouts table if it doesn't exist
export async function createWorkoutsTable(): Promise<boolean> {
  try {
    console.log('Creating workouts table...');
    
    // Create the table using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.workouts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        duration_minutes INTEGER NOT NULL,
        exercises JSONB NOT NULL,
        notes TEXT,
        calories_burned INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts(user_id);
      CREATE INDEX IF NOT EXISTS idx_workouts_date ON public.workouts(date);
      
      -- Enable Row Level Security
      ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies
      CREATE POLICY IF NOT EXISTS "Users can view their own workouts" 
      ON public.workouts
      FOR SELECT
      USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can insert their own workouts" 
      ON public.workouts
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can update their own workouts" 
      ON public.workouts
      FOR UPDATE
      USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can delete their own workouts" 
      ON public.workouts
      FOR DELETE
      USING (auth.uid() = user_id);
    `;
    
    const { error } = await supabase.rpc('execute_sql', { sql: createTableSQL });
    if (error) {
      console.error('Error creating workouts table:', error);
      return false;
    }
    
    console.log('Workouts table created successfully');
    return true;
  } catch (error) {
    console.error('Error in createWorkoutsTable:', error);
    return false;
  }
}
