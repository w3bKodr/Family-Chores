import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RewardItemProps {
  title: string;
  pointsRequired: number;
  currentPoints: number;
  onPress?: () => void;
  claimed?: boolean;
}

export function RewardItem({
  title,
  pointsRequired,
  currentPoints,
  onPress,
  claimed = false,
}: RewardItemProps) {
  const canClaim = currentPoints >= pointsRequired && !claimed;
  const progress = Math.min(currentPoints / pointsRequired, 1);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!canClaim && !claimed}
      style={[
        styles.container,
        claimed && styles.claimed,
        canClaim && styles.claimable,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.pointsText}>
          {currentPoints} / {pointsRequired} points
        </Text>
      </View>
      {claimed && (
        <View style={styles.claimedBadge}>
          <Text style={styles.claimedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    marginVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  claimed: {
    backgroundColor: '#E8FCF8',
    borderColor: '#4ECDC4',
    borderWidth: 2,
  },
  claimable: {
    backgroundColor: '#FFF9F9',
    borderColor: '#FF6B6B',
    borderWidth: 2,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.15,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  pointsText: {
    fontSize: 13,
    color: '#8F92A1',
    fontWeight: '600',
  },
  claimedBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  claimedText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
