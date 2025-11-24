import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { clsx } from 'clsx';

interface ChoreItemProps {
  title: string;
  description?: string | null;
  points: number;
  emoji: string;
  completed?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  status?: 'pending' | 'approved' | 'rejected';
  className?: string;
}

export function ChoreItem({
  title,
  description,
  points,
  emoji,
  completed = false,
  onPress,
  onLongPress,
  status = 'pending',
  className,
}: ChoreItemProps) {
  const getStatusBorderColor = () => {
    switch (status) {
      case 'approved':
        return 'border-l-green-400';
      case 'rejected':
        return 'border-l-red-400';
      case 'pending':
        return 'border-l-yellow-400';
      default:
        return 'border-l-gray-200';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      className={clsx(
        'flex-row p-3 my-1.5 bg-white rounded-xl border-l-4 items-center shadow-sm border-gray-100 border-t border-r border-b',
        getStatusBorderColor(),
        completed && 'opacity-70',
        className
      )}
    >
      <View className="w-12 h-12 rounded-full bg-gray-50 justify-center items-center mr-3">
        <Text className="text-2xl">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text
          className={clsx(
            'text-base font-semibold text-gray-800 mb-0.5',
            completed && 'line-through text-gray-400'
          )}
          numberOfLines={1}
        >
          {title}
        </Text>
        {description && (
          <Text className="text-sm text-gray-500 mb-1" numberOfLines={1}>
            {description}
          </Text>
        )}
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-bold text-primary">{points} pts</Text>
          {completed && <Text className="text-base text-green-400 font-bold">✓</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

