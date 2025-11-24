import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import '../global.css';

export default function Index() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF6B6B" />
    </View>
  );
}
