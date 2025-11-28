import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@lib/store/authStore';
import { registerForPushNotificationsAsync } from '@lib/notifications/setup';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { checkSession, user, session } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      await checkSession();
      
      // Check if there's an active child mode session
      const activeChildId = await AsyncStorage.getItem('active_child_id');
      if (activeChildId) {
        setInitialRoute('/(app)/child-dashboard');
      }
      
      setIsReady(true);
    };
    init();
    registerForPushNotificationsAsync().catch(console.error);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const hasNoSegments = (segments.length as number) === 0;
    const isLoggedIn = !!session && !!user;

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isLoggedIn && (inAuthGroup || hasNoSegments)) {
      // Use initial route if set (child mode), otherwise default to parent dashboard
      if (initialRoute) {
        router.replace(initialRoute as any);
        setInitialRoute(null); // Clear after using
      } else {
        router.replace('/(app)/parent-dashboard');
      }
    }
  }, [session, user, segments, isReady]);

  if (!isReady) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
