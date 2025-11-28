import React, { useEffect, useState, useRef } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, RefreshControl, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { Button } from '@components/Button';
import { AlertModal } from '@components/AlertModal';

// Premium Card with press animation
const PremiumCard = ({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      easing: Easing.out(Easing.ease),
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

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.premiumCard, style, { transform: [{ scale: scaleAnim }] }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return <View style={[styles.premiumCard, style]}>{children}</View>;
};

export default function PendingRequestsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    family,
    children,
    rewards,
    rewardClaims,
    joinRequests,
    parentJoinRequests,
    getChildren,
    getJoinRequests,
    getParentJoinRequests,
    getRewards,
    getRewardClaims,
    approveJoinRequest,
    rejectJoinRequest,
    approveParentJoinRequest,
    rejectParentJoinRequest,
    approveRewardClaim,
    rejectRewardClaim,
    getParents,
  } = useFamilyStore();

  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  useEffect(() => {
    if (user?.family_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.family_id) return;
    try {
      await Promise.all([
        getChildren(user.family_id),
        getJoinRequests(user.family_id),
        getParentJoinRequests(user.family_id),
        getRewards(user.family_id),
        getRewardClaims(user.family_id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load requests', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApproveChild = async (id: string) => {
    try {
      await approveJoinRequest(id, user?.id || '');
      showAlert('Success', 'Child approved', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleRejectChild = async (id: string) => {
    try {
      await rejectJoinRequest(id);
      showAlert('Success', 'Request rejected', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleApproveParent = async (id: string) => {
    try {
      await approveParentJoinRequest(id);
      // Refresh parent requests and parents list so UI updates immediately
      if (family?.id) {
        await getParentJoinRequests(family.id);
        await getParents(family.id);
      }
      showAlert('Success', 'Family join request approved (Parent)', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleRejectParent = async (id: string) => {
    try {
      await rejectParentJoinRequest(id);
      showAlert('Success', 'Request rejected', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleApproveRewardClaim = async (id: string) => {
    try {
      await approveRewardClaim(id, user?.id || '');
      showAlert('Success', 'Reward approved! Points deducted.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleRejectRewardClaim = async (id: string) => {
    try {
      await rejectRewardClaim(id, user?.id || '');
      showAlert('Success', 'Reward request declined', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  // Filter pending reward claims
  const pendingRewardClaims = rewardClaims.filter(c => c.status === 'pending');

  if (!user?.family_id) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <View style={styles.emptyHeader}>
            <View style={styles.iconCircle}>
              <LinearGradient
                colors={['#FF6B35', '#FF8F5A']}
                style={styles.iconGradient}
              >
                <Text style={styles.iconEmoji}>📋</Text>
              </LinearGradient>
            </View>
            <Text style={styles.title}>Pending Requests</Text>
            <Text style={styles.subtitle}>You don't have a family yet or there are no pending requests.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <View style={styles.pageHeader}>
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={['#FF6B35', '#FF8F5A']}
              style={styles.iconGradient}
            >
              <Text style={styles.iconEmoji}>📋</Text>
            </LinearGradient>
          </View>
          <Text style={styles.pageTitle}>Pending Requests</Text>
        </View>

        {parentJoinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family Join Requests — Parent</Text>
            {parentJoinRequests.map((r: any) => (
              <PremiumCard key={r.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{r.display_name || r.users?.display_name || 'Unknown'}</Text>
                  <Text style={styles.requestMeta}>{r.user_email || r.users?.email || 'No email'}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable onPress={() => handleApproveParent(r.id)} style={styles.approveButton}><Text style={styles.approveText}>✓</Text></Pressable>
                  <Pressable onPress={() => handleRejectParent(r.id)} style={styles.rejectButton}><Text style={styles.rejectText}>✗</Text></Pressable>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {joinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Child Requests</Text>
            {joinRequests.map((r: any) => (
              <PremiumCard key={r.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{r.user_email || r.users?.display_name || r.user_id}</Text>
                  <Text style={styles.requestMeta}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable onPress={() => handleApproveChild(r.id)} style={styles.approveButton}><Text style={styles.approveText}>✓</Text></Pressable>
                  <Pressable onPress={() => handleRejectChild(r.id)} style={styles.rejectButton}><Text style={styles.rejectText}>✗</Text></Pressable>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {pendingRewardClaims.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Reward Requests</Text>
            {pendingRewardClaims.map((claim: any) => {
              const reward = rewards.find(r => r.id === claim.reward_id);
              const child = children.find(c => c.id === claim.child_id);
              return (
                <PremiumCard key={claim.id} style={styles.requestCard}>
                  <View style={styles.rewardClaimInfo}>
                    <View style={styles.rewardClaimHeader}>
                      <Text style={styles.rewardEmoji}>{reward?.emoji || '🎁'}</Text>
                      <View style={styles.rewardClaimDetails}>
                        <Text style={styles.requestName}>{reward?.title || 'Unknown Reward'}</Text>
                        <Text style={styles.requestMeta}>{child?.display_name || 'Unknown'} • {reward?.points_required || 0} pts</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <Pressable onPress={() => handleApproveRewardClaim(claim.id)} style={styles.approveButton}><Text style={styles.approveText}>✓</Text></Pressable>
                    <Pressable onPress={() => handleRejectRewardClaim(claim.id)} style={styles.rejectButton}><Text style={styles.rejectText}>✗</Text></Pressable>
                  </View>
                </PremiumCard>
              );
            })}
          </View>
        )}

        {parentJoinRequests.length === 0 && joinRequests.length === 0 && pendingRewardClaims.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No pending requests at the moment.</Text>
          </View>
        )}

      </ScrollView>

      <AlertModal visible={alertVisible} title={alertTitle} message={alertMessage} type={alertType} onClose={() => setAlertVisible(false)} />
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
    paddingBottom: 120,
  },
  emptyContent: { 
    padding: 24,
    flexGrow: 1,
  },
  emptyHeader: {
    alignItems: 'center',
    paddingTop: 40,
  },
  pageHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 36,
  },
  pageTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 8,
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  subtitle: { 
    color: '#8F92A1',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: { 
    marginBottom: 24,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12,
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  premiumCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  requestCard: { 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12,
  },
  requestInfo: {},
  requestName: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  requestMeta: { 
    fontSize: 13, 
    color: '#8F92A1',
    marginTop: 2,
  },
  requestActions: { 
    flexDirection: 'row', 
    gap: 10,
  },
  approveButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#10B981', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveText: { 
    color: '#FFFFFF', 
    fontWeight: '700',
    fontSize: 18,
  },
  rejectButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#EF4444', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectText: { 
    color: '#FFFFFF', 
    fontWeight: '700',
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8F92A1',
    fontWeight: '500',
  },
  rewardClaimInfo: {
    flex: 1,
  },
  rewardClaimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  rewardClaimDetails: {
    flex: 1,
  },
});
