import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';

export default function FamilyScreenIndex() {
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    // Use a small delay to ensure navigation is ready
    const timer = setTimeout(() => {
      router.replace('/(app)/family/manage');
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  // Show loading indicator instead of blank screen
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBF8F3' }}>
      <ActivityIndicator size="large" color="#FF6B35" />
    </View>
  );
}
