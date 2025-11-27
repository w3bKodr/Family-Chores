import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { RewardItem } from '@components/RewardItem';
import { AlertModal } from '@components/AlertModal';

// Premium animated card wrapper
const PremiumCard = ({ 
  children, 
  style, 
  onPress, 
}: { 
  children: React.ReactNode; 
  style?: any; 
  onPress?: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  
  if (!onPress) {
    return <View style={style}>{children}</View>;
  }
  
  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function RewardsScreen() {
  const { user } = useAuthStore();
  const { family, children, rewards, rewardClaims, claimReward, getRewards, getRewardClaims } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const child = children.find((c) => c.user_id === user?.id);

  useEffect(() => {
    loadData();
  }, [family]);

  const loadData = async () => {
    if (!family?.id) return;
    try {
      await Promise.all([
        getRewards(family.id),
        getRewardClaims(family.id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleClaimReward = async (rewardId: string) => {
    if (!child?.id) return;

    try {
      await claimReward(rewardId, child.id);
      showAlert('Success', 'You claimed a reward!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const myClaims = rewardClaims.filter((rc) => rc.child_id === child?.id);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#FF6B35', '#F7931E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Text style={styles.icon}>🎁</Text>
          </LinearGradient>
          <Text style={styles.heading}>Rewards</Text>
          <Text style={styles.subtitle}>Earn and claim rewards</Text>
        </View>

        {child && (
          <View style={styles.pointsCard}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsGradient}
            >
              <Text style={styles.pointsLabel}>Your Points</Text>
              <Text style={styles.pointsValue}>{child.points}</Text>
              <View style={styles.pointsStars}>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.star}>⭐</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          {rewards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No rewards yet</Text>
            </View>
          ) : (
            rewards.map((reward) => {
              const claimed = myClaims.some((rc) => rc.reward_id === reward.id);
              const canClaim = !claimed && child && child.points >= reward.points_required;

              return (
                <View key={reward.id} style={styles.rewardCard}>
                  <View style={styles.rewardContent}>
                    <View style={styles.rewardIconContainer}>
                      <Text style={styles.rewardIcon}>{reward.emoji || '🏆'}</Text>
                    </View>
                    <View style={styles.rewardInfo}>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <View style={styles.pointsBadge}>
                        <Text style={styles.rewardPoints}>
                          {reward.points_required} points
                        </Text>
                      </View>
                    </View>
                    {claimed && (
                      <View style={styles.claimedBadge}>
                        <Text style={styles.claimedBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  {canClaim && (
                    <PremiumCard 
                      style={styles.claimButton}
                      onPress={() => handleClaimReward(reward.id)}
                    >
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.claimButtonGradient}
                      >
                        <Text style={styles.claimButtonText}>Claim Reward</Text>
                      </LinearGradient>
                    </PremiumCard>
                  )}
                </View>
              );
            })
          )}
        </View>

        {myClaims.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Claimed ({myClaims.length})</Text>
            <View style={styles.claimedCard}>
              <Text style={styles.claimedEmoji}>🎉</Text>
              <Text style={styles.claimedText}>
                You've claimed {myClaims.length} reward{myClaims.length !== 1 ? 's' : ''}!
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F3',
  },
  content: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: 'rgba(255, 107, 53, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  icon: {
    fontSize: 42,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#8F92A1',
    fontWeight: '500',
  },
  pointsCard: {
    marginBottom: 28,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: 'rgba(99, 102, 241, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  pointsGradient: {
    padding: 28,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  pointsValue: {
    fontSize: 60,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 14,
    letterSpacing: -1,
  },
  pointsStars: {
    flexDirection: 'row',
    gap: 10,
  },
  star: {
    fontSize: 22,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 18,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  rewardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginBottom: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardIcon: {
    fontSize: 30,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  rewardPoints: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
  },
  claimedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  claimedBadgeText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  claimButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  claimButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 16,
    marginVertical: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#8F92A1',
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '500',
  },
  claimedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 24,
    padding: 24,
    marginVertical: 12,
    alignItems: 'center',
  },
  claimedEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  claimedText: {
    fontSize: 18,
    color: '#047857',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});
