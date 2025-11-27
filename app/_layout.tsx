import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@lib/store/authStore';
import { registerForPushNotificationsAsync } from '@lib/notifications/setup';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { checkSession, user, session } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkSession();
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
      router.replace('/(app)/parent-dashboard');
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
