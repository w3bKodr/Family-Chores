import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  padding?: number;
  backgroundColor?: string;
  borderRadius?: number;
  marginVertical?: number;
  borderColor?: string;
  borderWidth?: number;
}

export function Card({
  children,
  padding = 16,
  backgroundColor = '#FFFFFF',
  borderRadius = 12,
  marginVertical = 8,
  borderColor = '#E0E0E0',
  borderWidth = 1,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          padding,
          backgroundColor,
          borderRadius,
          marginVertical,
          borderColor,
          borderWidth,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});
