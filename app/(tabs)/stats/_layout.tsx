import { Stack } from 'expo-router';

export default function StatsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Exercise Statistics',
          headerShown: false,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </Stack>
  );
}