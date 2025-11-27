import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@lib/store/authStore';
import { View, ActivityIndicator } from 'react-native';

export default function ChildScreenIndex() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkModeAndRedirect = async () => {
      const childId = await AsyncStorage.getItem('active_child_id');
      
      // If we have a childId, we are in child mode -> go to child dashboard
      if (childId) {
        router.replace('/(app)/child-dashboard');
      } else {
        // If no childId, we are in parent mode -> go to parent-chores
        router.replace('/(app)/parent-chores');
      }
      setChecking(false);
    };
    
    checkModeAndRedirect();
  }, [router]);

  // Show loading while checking mode
  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return null;
}
