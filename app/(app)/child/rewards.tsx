import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { RewardItem } from '@components/RewardItem';
import { AlertModal } from '@components/AlertModal';

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
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🎁</Text>
          </View>
          <Text style={styles.heading}>Rewards</Text>
          <Text style={styles.subtitle}>Earn and claim rewards</Text>
        </View>

        {child && (
          <View style={styles.pointsCard}>
            <View style={styles.pointsGradient}>
              <Text style={styles.pointsLabel}>Your Points</Text>
              <Text style={styles.pointsValue}>{child.points}</Text>
              <View style={styles.pointsStars}>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.star}>⭐</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          {rewards.length === 0 ? (
            <Card padding={16} marginVertical={8}>
              <Text style={styles.emptyText}>No rewards yet</Text>
            </Card>
          ) : (
            rewards.map((reward) => {
              const claimed = myClaims.some((rc) => rc.reward_id === reward.id);

              return (
                <Card key={reward.id} padding={0} marginVertical={8}>
                  <View style={styles.rewardWrapper}>
                    <RewardItem
                      title={reward.title}
                      pointsRequired={reward.points_required}
                      currentPoints={child?.points || 0}
                      claimed={claimed}
                    />
                    {!claimed && child && child.points >= reward.points_required && (
                      <Button
                        title="Claim Reward"
                        onPress={() => handleClaimReward(reward.id)}
                        variant="primary"
                        size="sm"
                      />
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {myClaims.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Claimed ({myClaims.length})</Text>
            <Card padding={16} marginVertical={12}>
              <Text style={styles.claimedText}>
                You've claimed {myClaims.length} reward{myClaims.length !== 1 ? 's' : ''}!
              </Text>
            </Card>
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
    backgroundColor: '#F8F9FE',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  icon: {
    fontSize: 40,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8F92A1',
    fontWeight: '500',
  },
  pointsCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  pointsGradient: {
    backgroundColor: '#FF6B6B',
    padding: 24,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  pointsValue: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 12,
  },
  pointsStars: {
    flexDirection: 'row',
    gap: 8,
  },
  star: {
    fontSize: 20,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    marginLeft: 4,
  },
  rewardWrapper: {
    padding: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#8F92A1',
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '500',
  },
  claimedText: {
    fontSize: 17,
    color: '#4ECDC4',
    fontWeight: '700',
    textAlign: 'center',
  },
});
