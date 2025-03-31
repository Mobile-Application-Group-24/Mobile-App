import { Stack } from 'expo-router';

export default function NutritionLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="index-with-data"
                options={{
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="settings"
                options={{
                    title: 'Nutrition Settings',
                    headerStyle: {
                        backgroundColor: '#FFFFFF',
                    },
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    presentation: 'modal'
                }}
            />
        </Stack>
    );
}
