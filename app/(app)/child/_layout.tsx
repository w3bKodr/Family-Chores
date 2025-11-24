import React from 'react';
import { Stack } from 'expo-router';

export default function ChildLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="today" />
      <Stack.Screen name="rewards" />
    </Stack>
  );
}
