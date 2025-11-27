import React from 'react';
import { Tabs } from 'expo-router';
import ModernBottomTabBar from '@components/ModernBottomTabBar';

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <ModernBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="parent-dashboard"
    >
      {/* ===== PARENT MODE TABS ===== */}
      <Tabs.Screen 
        name="parent-dashboard" 
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen 
        name="parent-chores" 
        options={{ title: 'Chores' }}
      />
      <Tabs.Screen 
        name="parent-rewards" 
        options={{ title: 'Rewards' }}
      />
      <Tabs.Screen 
        name="family" 
        options={{ title: 'Family' }}
      />
      <Tabs.Screen 
        name="profile" 
        options={{ title: 'Profile' }}
      />

      {/* ===== CHILD MODE TABS ===== */}
      <Tabs.Screen 
        name="child-dashboard" 
        options={{ title: 'Dashboard' }}
      />
      <Tabs.Screen 
        name="child-chores" 
        options={{ title: 'Chores' }}
      />
      <Tabs.Screen 
        name="child-rewards" 
        options={{ title: 'Rewards' }}
      />
      <Tabs.Screen 
        name="child-profile" 
        options={{ title: 'Profile' }}
      />

      {/* ===== HIDDEN ROUTES (nested folders) ===== */}
      <Tabs.Screen name="parent" options={{ href: null }} />
      <Tabs.Screen name="child" options={{ href: null }} />
    </Tabs>
  );
}
