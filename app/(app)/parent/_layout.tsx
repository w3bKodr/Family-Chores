import React from 'react';
import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="create-family" />
      <Stack.Screen name="create-chore" />
      <Stack.Screen name="child-detail" />
      <Stack.Screen name="weekly-view" />
    </Stack>
  );
}
