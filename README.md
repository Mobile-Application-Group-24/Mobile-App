
<img src="assets/images/icon.png" alt="TrainRepublic Logo" width="200">

# TrainRepublic - Mobile Fitness Tracking Application

TrainRepublic is a comprehensive mobile fitness application built with React Native and Expo, designed to help users track their workouts, nutrition, and connect with other fitness enthusiasts through groups.


## 🚀 Features

### Workout Tracking
- Create and log custom workouts
- Track sets, reps, and weights for each exercise
- Monitor progress over time
- View workout history

### Nutrition Tracking
- Set and manage daily calorie goals
- Track water intake
- Log meals with calorie counting
- BMR (Basal Metabolic Rate) calculator
- Weekly nutrition overview with charts

### AI Assistant
- Chat with an AI fitness coach
- Get personalized workout and nutrition suggestions
- Accept AI-suggested changes to your nutrition settings or workout plans
- Receive intelligent feedback based on your fitness data

### Profile Management
- Customizable user profiles
- Upload profile pictures
- Track achievements
- View activity statistics

### Social Features
- Create and join fitness groups
- Share progress with group members
- View other users' profiles

## 💻 Technology Stack

- **Frontend**: React Native, Expo
- **State Management**: React Hooks
- **Database**: Supabase
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage, AsyncStorage
- **AI Integration**: Deepseek API
- **Charts**: react-native-chart-kit
- **UI Components**: Lucide React Native (icons)
- **Navigation**: Expo Router

## 🔋 Installation

### Prerequisites
- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Supabase account

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/MobileDevProject24.git
cd MobileDevProject24/Mobile-App
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory with your Supabase and Deepseek credentials:
```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Project Structure

```
Mobile-App/
├── app/                 # Main application folder (Expo Router)
│   ├── (tabs)/          # Tab-based navigation screens
│   │   ├── ai/          # AI coach features
│   │   ├── groups/      # Group-related screens
│   │   ├── nutrition/   # Nutrition tracking features
│   │   ├── profile/     # User profile screens
│   │   ├── stats/       # Statistics from workouts
│   │   └── workouts/    # Workout tracking features
│   ├── _layout.tsx      # Root layout component
├── assets/              # Static assets like images
├── hooks/               # Custom React hooks
├── providers/           # Context providers (auth, etc.)
├── utils/               # Utility functions
│   ├── supabase.ts      # Supabase client and database functions
│   ├── deepseek.ts      # AI integration functions
│   ├── notifications.ts # Push notification utilities
│   └── storage.ts       # Local storage utilities
```

## 🤳 Usage

### Tracking Workouts
Navigate to the Workouts tab to create new workout plans or log your exercises. You can specify sets, reps, weights, and other details for each exercise.

### Monitoring Nutrition
The Nutrition tab allows you to set daily calorie goals, track water intake, and log meals. Use the BMR calculator to find your recommended calorie intake.

### Using the AI Coach
In the AI tab, chat with the AI assistant to get personalized fitness advice. The AI can also suggest changes to your nutrition settings or create workout plans that you can accept with a single tap.

### Managing Your Profile
Visit the Profile tab to update your personal information, change profile picture, and view your fitness statistics and achievements.

### Connecting with Others
The Groups feature allows you to create or join fitness communities, where you can share your progress and motivate each other.

## License

This project is licensed under the MIT License

## Credits

- Icons provided by [Lucide React Native](https://lucide.dev/)
- AI capabilities powered by [Deepseek API](https://deepseek.ai/)
- Database and authentication by [Supabase](https://supabase.io/)


## 👨‍💻 Dev Team:

| Name                  | GitHub Profile                                   |
|-----------------------|--------------------------------------------------|
| Lukas Pfister         | [lukasmarkpfister](https://github.com/lukasmarkpfister) |
| Marco Jochim          | [MarcoJochim05](https://github.com/MarcoJochim05) |
| Robin Holzheuer       | [rholzheuer](https://github.com/rholzheuer)       |
