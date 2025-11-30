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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { AlertModal } from '@components/AlertModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Glowing Stars Panel - matching dashboard
const GlowingStarsPanel = ({ points, duration = 2500 }: { points: number; duration?: number }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const numberGlow = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  useEffect(() => {
    animationRef.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 400,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(numberGlow, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(numberGlow, {
            toValue: 0,
            duration: 500,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    animationRef.current.start();
    
    const timeout = setTimeout(() => {
      if (animationRef.current) {
        animationRef.current.stop();
        bounceAnim.setValue(0);
        glowAnim.setValue(0.8);
        numberGlow.setValue(0);
      }
    }, duration);
    
    return () => {
      clearTimeout(timeout);
      if (animationRef.current) {
        animationRef.current.stop();
      }
      bounceAnim.stopAnimation();
      glowAnim.stopAnimation();
      numberGlow.stopAnimation();
    };
  }, [duration]);
  
  const leftStarStyle = {
    transform: [
      { translateY: bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
      { scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
      { rotate: '-15deg' },
    ],
    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
  };
  
  const rightStarStyle = {
    transform: [
      { translateY: bounceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
      { scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) },
      { rotate: '15deg' },
    ],
    opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
  };
  
  return (
    <View style={styles.starsPanel}>
      <Text style={styles.starsPanelTitle}>Points Available</Text>
      <View style={styles.starsRow}>
        <Animated.Text style={[styles.bigStar, leftStarStyle]}>⭐</Animated.Text>
        <Animated.Text 
          style={[
            styles.giantPoints,
            {
              transform: [{
                scale: numberGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05],
                }),
              }],
            },
          ]}
        >
          {points}
        </Animated.Text>
        <Animated.Text style={[styles.bigStar, rightStarStyle]}>⭐</Animated.Text>
      </View>
      <Text style={styles.starsPanelSubtitle}>Spend them on rewards below!</Text>
    </View>
  );
};

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

export default function ChildRewardsScreen() {
  const { user } = useAuthStore();
  const { family, children, rewards, rewardClaims, claimReward, getRewards, getRewardClaims, getChildren, getFamily } = useFamilyStore();
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

  const [child, setChild] = useState<any>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  // Track if data has been loaded to prevent infinite loops
  const dataLoadedRef = useRef(false);
  const familyIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadActiveChild();
  }, []);

  // Fetch family data if not already loaded - only trigger on family_id change
  useEffect(() => {
    if (user?.family_id && !family) {
      getFamily(user.family_id);
    }
  }, [user?.family_id]);

  // Set child when activeChildId or children change - avoid unnecessary state updates
  useEffect(() => {
    if (children.length > 0) {
      if (activeChildId) {
        const activeChild = children.find((c) => c.id === activeChildId);
        if (activeChild && activeChild.id !== child?.id) {
          setChild(activeChild);
          return;
        }
      }
      if (user?.id) {
        const userChild = children.find((c) => c.user_id === user.id);
        if (userChild && userChild.id !== child?.id) {
          setChild(userChild);
        }
      }
    }
  }, [activeChildId, children, user?.id]);

  const loadActiveChild = async () => {
    const childId = await AsyncStorage.getItem('active_child_id');
    setActiveChildId(childId);
  };

  // Load data only when family ID changes
  useEffect(() => {
    if (family?.id && family.id !== familyIdRef.current) {
      familyIdRef.current = family.id;
      loadData();
    }
  }, [family?.id]);

  const loadData = async () => {
    if (!family?.id || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    try {
      await Promise.all([
        getChildren(family.id),
        getRewards(family.id),
        getRewardClaims(family.id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
      dataLoadedRef.current = false; // Allow retry on error
    }
  };

  const handleRefresh = async () => {
    if (!family?.id) return;
    setRefreshing(true);
    try {
      await Promise.all([
        getChildren(family.id),
        getRewards(family.id),
        getRewardClaims(family.id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
    setRefreshing(false);
  };

  const handleClaimReward = async (rewardId: string) => {
    if (!child?.id) return;

    try {
      await claimReward(rewardId, child.id);
      showAlert('Request Sent!', 'Your parent will review your reward request.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const myClaims = rewardClaims.filter((rc) => rc.child_id === child?.id);
  const pendingClaims = myClaims.filter((rc) => rc.status === 'pending');
  const approvedClaims = myClaims.filter((rc) => rc.status === 'approved');
  const rejectedClaims = myClaims.filter((rc) => rc.status === 'rejected');

  // Helper to get reward info for a claim
  const getRewardForClaim = (claim: typeof myClaims[0]) => {
    return rewards.find(r => r.id === claim.reward_id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Premium Header */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Rewards</Text>
              <Text style={styles.headerSubtitle}>Claim amazing prizes!</Text>
            </View>
            <View style={styles.headerIconCircle}>
              <Text style={styles.giftIcon}>🎁</Text>
              <Text style={styles.sparkle}>✨</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Glowing Stars Panel - matching dashboard */}
          {child && (
            <GlowingStarsPanel points={child.points} duration={2500} />
          )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Available Rewards</Text>
          {rewards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="gift-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No rewards available yet</Text>
              <Text style={styles.emptySubtext}>Ask your parents to add some!</Text>
            </View>
          ) : (
            rewards.map((reward) => {
              const hasPendingClaim = pendingClaims.some((rc) => rc.reward_id === reward.id);
              const hasApprovedClaim = approvedClaims.some((rc) => rc.reward_id === reward.id);
              const canClaim = !hasPendingClaim && child && child.points >= reward.points_required;
              const notEnoughPoints = !hasPendingClaim && child && child.points < reward.points_required;

              return (
                <View key={reward.id} style={[styles.rewardCard, canClaim && styles.rewardCardCanClaim]}>
                  <View style={styles.rewardContent}>
                    <View style={[styles.rewardIconContainer, canClaim && styles.rewardIconContainerCanClaim]}>
                      <Text style={styles.rewardIcon}>{reward.emoji || '🏆'}</Text>
                    </View>
                    <View style={styles.rewardInfo}>
                      <Text style={styles.rewardTitle}>{reward.title}</Text>
                      <View style={[styles.pointsRequiredBadge, canClaim && styles.pointsRequiredBadgeCanClaim]}>
                        <Text style={[styles.rewardPoints, canClaim && styles.rewardPointsCanClaim]}>
                          {reward.points_required} points
                        </Text>
                      </View>
                      {notEnoughPoints && (
                        <Text style={styles.needMorePoints}>
                          Need {reward.points_required - child.points} more points
                        </Text>
                      )}
                    </View>
                    {hasPendingClaim && (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time" size={16} color="#F59E0B" />
                        <Text style={styles.pendingBadgeText}>Pending</Text>
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
                        <Text style={styles.claimButtonEmoji}>🎉</Text>
                        <Text style={styles.claimButtonText}>Request Reward</Text>
                      </LinearGradient>
                    </PremiumCard>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Pending Requests Section */}
        {pendingClaims.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏳ Pending Requests ({pendingClaims.length})</Text>
            {pendingClaims.map((claim) => {
              const reward = getRewardForClaim(claim);
              if (!reward) return null;
              return (
                <View key={claim.id} style={styles.historyCard}>
                  <View style={styles.historyIconContainer}>
                    <Text style={styles.historyIcon}>{reward.emoji || '🎁'}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{reward.title}</Text>
                    <Text style={styles.historyDate}>
                      Requested {new Date(claim.claimed_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.pendingStatusBadge}>
                    <Ionicons name="time" size={14} color="#F59E0B" />
                    <Text style={styles.pendingStatusText}>Waiting</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* History Section */}
        {(approvedClaims.length > 0 || rejectedClaims.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 History</Text>
            {approvedClaims.map((claim) => {
              const reward = getRewardForClaim(claim);
              if (!reward) return null;
              return (
                <View key={claim.id} style={styles.historyCard}>
                  <View style={[styles.historyIconContainer, styles.approvedIconContainer]}>
                    <Text style={styles.historyIcon}>{reward.emoji || '🎁'}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{reward.title}</Text>
                    <Text style={styles.historyDate}>
                      Approved {claim.approved_at ? new Date(claim.approved_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <View style={styles.approvedStatusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.approvedStatusText}>Received</Text>
                  </View>
                </View>
              );
            })}
            {rejectedClaims.map((claim) => {
              const reward = getRewardForClaim(claim);
              if (!reward) return null;
              return (
                <View key={claim.id} style={styles.historyCard}>
                  <View style={[styles.historyIconContainer, styles.rejectedIconContainer]}>
                    <Text style={styles.historyIcon}>{reward.emoji || '🎁'}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{reward.title}</Text>
                    <Text style={styles.historyDate}>
                      Declined {claim.approved_at ? new Date(claim.approved_at).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <View style={styles.rejectedStatusBadge}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.rejectedStatusText}>Declined</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        </View>
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
    paddingBottom: 100,
  },
  
  // Header icon (right side)
  headerIconCircle: {
    position: 'relative',
  },
  giftIcon: {
    fontSize: 44,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
    top: -4,
    right: -4,
  },
  
  // Premium Header
  premiumHeader: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  
  // Glowing Stars Panel (matching dashboard)
  starsPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  starsPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  bigStar: {
    fontSize: 40,
    textShadowColor: 'rgba(251, 191, 36, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  giantPoints: {
    fontSize: 72,
    fontWeight: '900',
    color: '#F59E0B',
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
    letterSpacing: -2,
  },
  starsPanelSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 12,
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  rewardCardCanClaim: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 2,
    shadowColor: 'rgba(16, 185, 129, 0.2)',
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardIconContainerCanClaim: {
    backgroundColor: '#D1FAE5',
  },
  rewardIcon: {
    fontSize: 32,
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
  pointsRequiredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pointsRequiredBadgeCanClaim: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  rewardPoints: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  rewardPointsCanClaim: {
    color: '#059669',
  },
  needMorePoints: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 6,
  },
  claimedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(16, 185, 129, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  claimButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
    shadowColor: 'rgba(16, 185, 129, 0.4)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 6,
  },
  claimButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  claimButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  claimButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    marginVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderStyle: 'dashed',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  claimedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 24,
    padding: 28,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  claimedEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  claimedText: {
    fontSize: 20,
    color: '#047857',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  claimedSubtext: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
    marginTop: 8,
  },
  
  // Pending badge on reward cards
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  
  // History cards
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  historyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  approvedIconContainer: {
    backgroundColor: '#D1FAE5',
  },
  rejectedIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  historyIcon: {
    fontSize: 24,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  // Status badges for history
  pendingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  pendingStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  approvedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  approvedStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  rejectedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  rejectedStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
