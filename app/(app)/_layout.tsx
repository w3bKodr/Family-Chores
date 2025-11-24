import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppLayout() {
  const { user } = useAuthStore();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  useEffect(() => {
    const checkChildMode = async () => {
      const childId = await AsyncStorage.getItem('active_child_id');
      setActiveChildId(childId);
    };
    
    checkChildMode();
    
    // Listen for storage changes
    const interval = setInterval(checkChildMode, 1000);
    return () => clearInterval(interval);
  }, []);

  const isChildMode = activeChildId !== null;
  const isParentMode = user?.role === 'parent' && !isChildMode;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="parent"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          href: isParentMode ? '/(app)/parent' : null,
        }}
      />
      <Tabs.Screen
        name="child"
        options={{
          title: 'Chores',
          tabBarLabel: 'Chores',
          href: (user?.role === 'child' || isChildMode) ? '/(app)/child' : null,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarLabel: 'Family',
          href: isParentMode ? '/(app)/family' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          href: isParentMode ? '/(app)/profile' : null,
        }}
      />
    </Tabs>
  );
}
