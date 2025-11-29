import React, { useEffect, useState, useRef } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, RefreshControl, Pressable, Animated, Easing, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { AlertModal } from '@components/AlertModal';

// Premium Card with press animation
const PremiumCard = ({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
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
  const totalRequests = parentJoinRequests.length + joinRequests.length + pendingRewardClaims.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header matching Dashboard */}
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.replace('/(app)/parent-dashboard')}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Pending Requests</Text>
            <Text style={styles.headerSubtitle}>
              {totalRequests === 0 ? 'All caught up!' : `${totalRequests} pending approval`}
            </Text>
          </View>
          <Text style={styles.headerEmoji}>📋</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B35" />}
      >
        {/* Parent Join Requests */}
        {parentJoinRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="people" size={18} color="#EA580C" />
              </View>
              <Text style={styles.sectionTitle}>Parent Requests</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{parentJoinRequests.length}</Text>
              </View>
            </View>
            {parentJoinRequests.map((r: any) => (
              <PremiumCard key={r.id} style={styles.requestCard}>
                <View style={styles.requestMain}>
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={['#FF6B35', '#FF8F5A']}
                      style={styles.avatarGradient}
                    >
                      <Text style={styles.avatarText}>
                        {(r.display_name || r.users?.display_name || 'U')[0].toUpperCase()}
                      </Text>
                    </LinearGradient>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{r.display_name || r.users?.display_name || 'Unknown'}</Text>
                    <Text style={styles.requestMeta}>{r.user_email || r.users?.email || 'No email'}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity onPress={() => handleApproveParent(r.id)} style={styles.approveButton}>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRejectParent(r.id)} style={styles.rejectButton}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {/* Child Join Requests */}
        {joinRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="person-add" size={18} color="#10B981" />
              </View>
              <Text style={styles.sectionTitle}>Child Requests</Text>
              <View style={[styles.countBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.countBadgeText, { color: '#10B981' }]}>{joinRequests.length}</Text>
              </View>
            </View>
            {joinRequests.map((r: any) => (
              <PremiumCard key={r.id} style={styles.requestCard}>
                <View style={styles.requestMain}>
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={['#10B981', '#34D399']}
                      style={styles.avatarGradient}
                    >
                      <Ionicons name="person" size={20} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{r.user_email || r.users?.display_name || 'Unknown'}</Text>
                    <Text style={styles.requestMeta}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recently'}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity onPress={() => handleApproveChild(r.id)} style={styles.approveButton}>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRejectChild(r.id)} style={styles.rejectButton}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {/* Reward Claims */}
        {pendingRewardClaims.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="gift" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Reward Requests</Text>
              <View style={[styles.countBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.countBadgeText, { color: '#F59E0B' }]}>{pendingRewardClaims.length}</Text>
              </View>
            </View>
            {pendingRewardClaims.map((claim: any) => {
              const reward = rewards.find(r => r.id === claim.reward_id);
              const child = children.find(c => c.id === claim.child_id);
              return (
                <PremiumCard key={claim.id} style={styles.requestCard}>
                  <View style={styles.requestMain}>
                    <View style={styles.rewardEmojiContainer}>
                      <Text style={styles.rewardEmoji}>{reward?.emoji || '🎁'}</Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{reward?.title || 'Unknown Reward'}</Text>
                      <Text style={styles.requestMeta}>
                        {child?.display_name || 'Unknown'} • {reward?.points_required || 0} pts
                      </Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity onPress={() => handleApproveRewardClaim(claim.id)} style={styles.approveButton}>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRejectRewardClaim(claim.id)} style={styles.rejectButton}>
                      <Ionicons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </PremiumCard>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {totalRequests === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={['#FF6B35', '#FF8F5A']}
                style={styles.emptyIconGradient}
              >
                <Ionicons name="checkmark-done" size={48} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No pending requests at the moment.</Text>
            <TouchableOpacity 
              style={styles.backToDashboardButton}
              onPress={() => router.replace('/(app)/parent-dashboard')}
            >
              <Text style={styles.backToDashboardText}>Back to Dashboard</Text>
            </TouchableOpacity>
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
  premiumHeader: {
    backgroundColor: '#FF6B35',
    paddingLeft: 20,
    paddingRight: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  headerEmoji: {
    fontSize: 36,
  },
  content: { 
    padding: 20, 
    paddingBottom: 40,
  },
  section: { 
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: { 
    flex: 1,
    fontSize: 17, 
    fontWeight: '700', 
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: '#FFEDD5',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EA580C',
  },
  premiumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  requestCard: { 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 12,
  },
  requestMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rewardEmojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rewardEmoji: {
    fontSize: 24,
  },
  requestInfo: {
    flex: 1,
  },
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
    gap: 8,
  },
  approveButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 14, 
    backgroundColor: '#10B981', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 14, 
    backgroundColor: '#EF4444', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8F92A1',
    fontWeight: '500',
    marginBottom: 24,
  },
  backToDashboardButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backToDashboardText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
