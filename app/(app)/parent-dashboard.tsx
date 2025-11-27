import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { AlertModal } from '@components/AlertModal';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Premium animated card wrapper with scale + ripple
const PremiumCard = ({ 
  children, 
  style, 
  onPress, 
  accentColor = 'rgba(255,255,255,0.3)',
  activeOpacity = 0.95,
}: { 
  children: React.ReactNode; 
  style?: any; 
  onPress?: () => void;
  accentColor?: string;
  activeOpacity?: number;
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
      style={{ flex: 1 }}
    >
      <Animated.View style={[style, { flex: 1, transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// Sparkle particle effect component for child cards
const SparkleEffect = () => {
  const sparkleAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  
  useEffect(() => {
    const createSparkleLoop = (anim: Animated.Value, delay: number) => {
      const loop = () => {
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 600,
              delay: 400,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => loop());
      };
      loop();
    };
    
    createSparkleLoop(sparkleAnims[0], 0);
    createSparkleLoop(sparkleAnims[1], 300);
    createSparkleLoop(sparkleAnims[2], 600);
  }, []);
  
  return (
    <View style={styles.sparkleContainer}>
      {sparkleAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkleParticle,
            {
              opacity: anim,
              transform: [
                { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [4, -2] }) },
              ],
              left: index * 8,
              top: index === 1 ? -4 : 0,
            },
          ]}
        >
          <Text style={styles.sparkleText}>✦</Text>
        </Animated.View>
      ))}
    </View>
  );
};

// Three glowing golden stars with smooth wave motion
const GoldenStars = ({ points }: { points: number }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  // Each star gets a phase offset to create the wave effect
  const getStarStyle = (index: number) => {
    // Phase offset: 0, 0.33, 0.66 of the wave cycle
    const phaseOffset = index * 0.33;
    
    return {
      opacity: waveAnim.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0.7, 1, 0.7, 1, 0.7].map((v, i, arr) => {
          const shifted = Math.floor((i + phaseOffset * 4) % 4);
          return arr[shifted];
        }),
      }),
      transform: [
        {
          translateY: waveAnim.interpolate({
            inputRange: [0, 0.25, 0.5, 0.75, 1],
            outputRange: [0, -2, 0, 2, 0].map((v, i) => {
              // Shift the wave based on star index
              const phase = (i / 4 + phaseOffset) % 1;
              return Math.sin(phase * Math.PI * 2) * -2;
            }),
          }),
        },
      ],
      marginTop: index === 1 ? -4 : 0,
    };
  };
  
  return (
    <View style={styles.goldenStarsContainer}>
      <View style={styles.starsArc}>
        {[0, 1, 2].map((index) => (
          <Animated.Text
            key={index}
            style={[
              styles.goldenStar,
              {
                opacity: waveAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: index === 1 
                    ? [1, 0.7, 1]      // middle: starts bright
                    : index === 0 
                    ? [0.7, 1, 0.7]    // left: starts dim
                    : [0.85, 0.85, 0.85], // right: offset
                }),
                transform: [
                  {
                    translateY: waveAnim.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: index === 0 
                        ? [0, -2, 0, 2, 0]     // left star
                        : index === 1
                        ? [-2, 0, 2, 0, -2]    // middle star (offset by 0.25)
                        : [0, 2, 0, -2, 0],    // right star (offset by 0.5)
                    }),
                  },
                ],
                marginTop: index === 1 ? -4 : 0,
              },
            ]}
          >
            ★
          </Animated.Text>
        ))}
      </View>
      <Text style={styles.goldenPointsText}>{points}</Text>
    </View>
  );
};

export default function ParentDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family, children, choreCompletions, joinRequests, parentJoinRequests, getFamily, getChildren, getChoreCompletions, getParentJoinRequests, cancelParentJoinRequest } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  
  // Animation for star badge bounce
  const starBounceAnim = useState(new Animated.Value(0))[0];

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  useEffect(() => {
    // Trigger star bounce animation on mount
    Animated.loop(
      Animated.sequence([
        Animated.timing(starBounceAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(starBounceAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [starBounceAnim]);

  useEffect(() => {
    if (user?.family_id) {
      loadData();
    } else if (user?.id) {
      checkPendingRequest();
    }
  }, [user]);

  useEffect(() => {
    console.log('Parent join requests updated:', parentJoinRequests);
  }, [parentJoinRequests]);

  const loadData = async () => {
    if (!user?.family_id) return;
    try {
      await Promise.all([
        getFamily(user.family_id),
        getChildren(user.family_id),
        getChoreCompletions(user.family_id),
        getParentJoinRequests(user.family_id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const checkPendingRequest = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('parent_join_requests')
        .select(`
          *,
          families(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking pending request:', error);
      }
      
      if (data) {
        setPendingRequest(data);
      }
    } catch (error: any) {
      console.error('Error checking pending request:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.family_id) {
      await loadData();
    } else {
      await checkPendingRequest();
    }
    setRefreshing(false);
  };

  const getPendingCountForChild = (childId: string) => {
    return choreCompletions.filter(
      cc => cc.completed_by === childId && cc.status === 'pending'
    ).length;
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest?.id) return;
    try {
      await cancelParentJoinRequest(pendingRequest.id);
      setPendingRequest(null);
      showAlert('Success', 'Your join request has been cancelled.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  if (!user?.family_id) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.emptyHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>👨‍👩‍👧</Text>
            </View>
            <Text style={styles.title}>Family Chores</Text>
            <Text style={styles.subtitle}>
              {pendingRequest 
                ? 'Your join request is pending approval' 
                : 'Create a new family or join an existing one'}
            </Text>
          </View>

          {pendingRequest ? (
            <View style={styles.pendingRequestCard}>
              <View style={styles.pendingIconCircle}>
                <Text style={styles.pendingEmoji}>⏳</Text>
              </View>
              <Text style={styles.pendingTitle}>Request Pending</Text>
              <Text style={styles.pendingMessage}>
                You've requested to join <Text style={styles.pendingFamilyName}>{pendingRequest.families?.name}</Text>
              </Text>
              <Text style={styles.pendingSubtext}>
                Waiting for the family owner to approve your request. You'll be notified once approved.
              </Text>
              <Button
                title="Cancel Request"
                onPress={handleCancelRequest}
                variant="outline"
                size="lg"
                style={{ marginTop: 20 }}
              />
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => router.push('/(app)/parent/create-family')}
              >
                <View style={[styles.optionIconCircle, styles.optionCreate]}>
                  <Text style={styles.optionEmoji}>➕</Text>
                </View>
                <Text style={styles.optionTitle}>Create Family</Text>
                <Text style={styles.optionDescription}>
                  Start a new family and invite members
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => router.push('/(app)/parent/join-family')}
              >
                <View style={[styles.optionIconCircle, styles.optionJoin]}>
                  <Text style={styles.optionEmoji}>🏡</Text>
                </View>
                <Text style={styles.optionTitle}>Join Family</Text>
                <Text style={styles.optionDescription}>
                  Enter a family code to join
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        scrollEventThrottle={16}
      >
        {/* Premium Header with Gradient Background */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Hello, {user?.display_name?.split(' ')[0] || 'Parent'}!</Text>
              <Text style={styles.headerSubtitle}>Let's manage your family today</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(app)/parent/pending-requests')}
              style={styles.premiumNotificationButton}
            >
              <View style={styles.notificationGlow}>
                <Ionicons name="notifications" size={22} color="#FFFFFF" />
              </View>
              { (parentJoinRequests?.length || 0) + (joinRequests?.length || 0) > 0 && (
                <View style={styles.premiumNotificationBadge}>
                  <Text style={styles.notificationBadgeText}>{(parentJoinRequests?.length || 0) + (joinRequests?.length || 0)}</Text>
                </View>
              ) }
            </TouchableOpacity>
          </View>
        </View>

        {family && (
          <View style={styles.contentContainer}>
            {/* Premium Chore Tracker Card */}
            <View style={styles.premiumTrackerCard}>
              <View style={styles.trackerHeader}>
                <View>
                  <Text style={styles.trackerTitle}>Chore Tracker</Text>
                  <Text style={styles.trackerSubtitle}>
                    {children.length} {children.length === 1 ? 'child' : 'children'} • {family.name}
                  </Text>
                </View>
              </View>

              {/* Children Section with Premium Cards */}
              <View style={styles.childrenSection}>
                {children.length === 0 ? (
                  <View style={styles.emptyChildrenCard}>
                    <Text style={styles.emptyChildrenEmoji}>👶</Text>
                    <Text style={styles.emptyChildrenText}>No children yet</Text>
                    <Text style={styles.emptyChildrenSubtext}>Let's add your first child to get started</Text>
                    <Button
                      title="+ Add Child"
                      onPress={() => router.push('/(app)/family/manage')}
                      variant="primary"
                      size="sm"
                      style={{ marginTop: 16 }}
                    />
                  </View>
                ) : (
                  <View style={styles.childrenGrid}>
                    {children.map((child) => {
                      const pendingCount = getPendingCountForChild(child.id);
                      return (
                        <PremiumCard
                          key={child.id}
                          style={styles.premiumChildCard}
                          onPress={() =>
                            router.push({
                              pathname: '/(app)/parent/child-detail',
                              params: { childId: child.id },
                            })
                          }
                          accentColor="rgba(219, 234, 254, 0.5)"
                        >
                          {/* Glassmorphism inner glow */}
                          <View style={styles.glassInnerGlow} />
                          <View style={styles.childCardContent}>
                            {/* Avatar with Glowing White Rim */}
                            <View style={styles.childAvatarGlow}>
                              <View style={styles.avatarGlowRing}>
                                <View style={styles.premiumChildAvatar}>
                                  <Text style={styles.childAvatarEmoji}>{child.emoji || '👶'}</Text>
                                </View>
                              </View>
                              {pendingCount > 0 && (
                                <Animated.View 
                                  style={[
                                    styles.premiumPendingBadge,
                                    {
                                      transform: [
                                        {
                                          scale: starBounceAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 1.15],
                                          }),
                                        },
                                      ],
                                    },
                                  ]}
                                >
                                  <Text style={styles.premiumPendingBadgeText}>{pendingCount}</Text>
                                </Animated.View>
                              )}
                            </View>
                            <View style={styles.childCardDetails}>
                              <Text style={styles.premiumChildName}>{child.display_name}</Text>
                              <GoldenStars points={child.points} />
                            </View>
                          </View>
                        </PremiumCard>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Quick Actions - Modern Hero Buttons */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitlePremium}>Quick Actions</Text>
              <View style={styles.actionCardsRow}>
                {/* Manage Chores - Emerald Modern */}
                <PremiumCard 
                  onPress={() => router.push('/(app)/parent-chores')}
                  style={styles.modernActionCard}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modernActionGradient}
                  >
                    {/* Top glow accent */}
                    <View style={styles.actionAccentGlow} />
                    
                    {/* Icon - Large & Bold */}
                    <View style={styles.modernIconWrapper}>
                      <Ionicons name="checkmark-circle" size={52} color="#FFFFFF" />
                    </View>
                    
                    {/* Text Content */}
                    <View style={styles.modernTextBlock}>
                      <Text style={styles.modernActionTitle}>Chores</Text>
                      <Text style={styles.modernActionSubtitle}>Manage schedule</Text>
                    </View>
                  </LinearGradient>
                </PremiumCard>

                {/* Rewards - Purple Modern */}
                <PremiumCard 
                  onPress={() => router.push('/(app)/parent-rewards')}
                  style={styles.modernActionCard}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modernActionGradient}
                  >
                    {/* Top glow accent */}
                    <View style={styles.actionAccentGlow} />
                    
                    {/* Icon - Large & Bold */}
                    <View style={styles.modernIconWrapper}>
                      <Ionicons name="gift" size={52} color="#FFFFFF" />
                    </View>
                    
                    {/* Text Content */}
                    <View style={styles.modernTextBlock}>
                      <Text style={styles.modernActionTitle}>Rewards</Text>
                      <Text style={styles.modernActionSubtitle}>Unlock rewards</Text>
                    </View>
                  </LinearGradient>
                </PremiumCard>
              </View>
            </View>

            {/* Premium Full-Width Action Tiles with Gradients */}
            <View style={styles.premiumTilesSection}>
              {/* Switch to Child Mode Tile - Blue Gradient */}
              {children.length > 0 && (
                <PremiumCard 
                  onPress={() => router.push('/(app)/parent/switch-to-child')}
                  style={styles.premiumTileWrapper}
                  accentColor="rgba(14, 165, 233, 0.4)"
                >
                  <LinearGradient
                    colors={['#38BDF8', '#0EA5E9', '#0284C7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.premiumWideTile}
                  >
                    <View style={styles.tileInnerGlow} />
                    <View style={styles.premiumTileIcon}>
                      <Ionicons name="people" size={40} color="#FFFFFF" />
                    </View>
                    <View style={styles.premiumTileContent}>
                      <Text style={styles.premiumTileTitle}>Switch to Child Mode</Text>
                      <Text style={styles.premiumTileSubtitle}>Hand the device to your child – they can do chores, earn rewards, and more</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={26} color="#FFFFFF" style={{ opacity: 0.9 }} />
                  </LinearGradient>
                </PremiumCard>
              )}
            </View>
          </View>
        )}

        {!family && !user?.family_id && (
          <View style={styles.contentContainer}>
            <View style={styles.premiumEmptyState}>
              <View style={styles.emptyStateIcon}>
                <Text style={styles.emptyStateIconText}>👨‍👩‍👧</Text>
              </View>
              <Text style={styles.emptyStateTitle}>Family Chores</Text>
              <Text style={styles.emptyStateSubtitle}>
                {pendingRequest 
                  ? 'Your join request is pending approval' 
                  : 'Create a new family or join an existing one'}
              </Text>

              {pendingRequest ? (
                <View style={styles.premiumPendingRequestCard}>
                  <View style={styles.pendingRequestIconWrapper}>
                    <Text style={styles.pendingRequestIcon}>⏳</Text>
                  </View>
                  <Text style={styles.pendingRequestTitle}>Request Pending</Text>
                  <Text style={styles.pendingRequestMessage}>
                    You've requested to join <Text style={styles.pendingRequestFamilyName}>{pendingRequest.families?.name}</Text>
                  </Text>
                  <Text style={styles.pendingRequestSubtext}>
                    Waiting for the family owner to approve your request. You'll be notified once approved.
                  </Text>
                  <Button
                    title="Cancel Request"
                    onPress={handleCancelRequest}
                    variant="outline"
                    size="lg"
                    style={{ marginTop: 24 }}
                  />
                </View>
              ) : (
                <View style={styles.emptyOptionsContainer}>
                  <TouchableOpacity
                    style={[styles.emptyOptionCard, styles.emptyOptionCreate]}
                    onPress={() => router.push('/(app)/parent/create-family')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.emptyOptionIconWrapper}>
                      <MaterialCommunityIcons name="plus-circle" size={40} color="#FFFFFF" />
                    </View>
                    <Text style={styles.emptyOptionTitle}>Create Family</Text>
                    <Text style={styles.emptyOptionDescription}>Start a new family and invite members</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.emptyOptionCard, styles.emptyOptionJoin]}
                    onPress={() => router.push('/(app)/parent/join-family')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.emptyOptionIconWrapper}>
                      <MaterialCommunityIcons name="home-import-outline" size={40} color="#FFFFFF" />
                    </View>
                    <Text style={styles.emptyOptionTitle}>Join Family</Text>
                    <Text style={styles.emptyOptionDescription}>Enter a family code to join</Text>
                  </TouchableOpacity>
                </View>
              )}
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
    backgroundColor: '#FBF8F3', // Warm off-white background
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // ===== PREMIUM HEADER =====
  premiumHeader: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  premiumNotificationButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    // Glassmorphism inner glow simulation
    overflow: 'hidden',
  },
  notificationGlow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumNotificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  // ===== CONTENT CONTAINER =====
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },

  // ===== PREMIUM TRACKER CARD (Glassmorphism) =====
  premiumTrackerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    // Premium soft shadow
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    // Subtle border for glassmorphism
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    // Inner glow effect via nested view
    overflow: 'hidden',
  },
  glassInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  trackerHeader: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 244, 246, 0.8)',
  },
  trackerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  trackerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  // ===== PREMIUM CHILD CARDS (Frosted Glass) =====
  childrenSection: {
    marginTop: 0,
  },
  childrenGrid: {
    gap: 14,
  },
  premiumChildCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 28,
    padding: 18,
    marginBottom: 0,
    // Glassmorphism border
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    // Premium shadow
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    overflow: 'hidden',
  },
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatarGlow: {
    position: 'relative',
    marginRight: 18,
  },
  // Glowing white rim around avatar
  avatarGlowRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    // Glowing white rim
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  premiumChildAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  childAvatarEmoji: {
    fontSize: 38,
  },
  premiumPendingBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumPendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  childCardDetails: {
    flex: 1,
  },
  premiumChildName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  
  // ===== GOLDEN STARS WITH SPARKLE =====
  goldenStarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(254, 243, 199, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    alignSelf: 'flex-start',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  starsArc: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  goldenStar: {
    fontSize: 16,
    color: '#F59E0B',
    textShadowColor: '#FBBF24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sparkleContainer: {
    position: 'relative',
    width: 24,
    height: 16,
    marginLeft: 2,
  },
  sparkleParticle: {
    position: 'absolute',
  },
  sparkleText: {
    fontSize: 8,
    color: '#F59E0B',
    textShadowColor: '#FBBF24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  goldenPointsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
    marginLeft: 0,
  },

  // Legacy star badge (for compatibility)
  premiumStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    width: 'auto',
    alignSelf: 'flex-start',
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  starText: {
    fontSize: 18,
  },
  premiumPointsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },

  // ===== EMPTY CHILDREN CARD =====
  emptyChildrenCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyChildrenEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyChildrenText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyChildrenSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },

  // ===== FLOATING ACTIONS SECTION (Gradients) =====
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitlePremium: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  // ===== QUICK ACTION CARDS (Modern Hero Buttons) =====
  actionCardsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  modernActionCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 168,
    borderRadius: 24,
    overflow: 'hidden',
    // Soft modern shadow
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  modernActionGradient: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  actionAccentGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
  modernIconWrapper: {
    zIndex: 2,
    marginTop: 8,
  },
  modernTextBlock: {
    zIndex: 2,
  },
  modernActionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modernActionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.88,
  },

  floatingActionWrapper: {
    flex: 1,
  },
  floatingActionCard: {
    flex: 1,
    borderRadius: 28,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    // Glassmorphism inner glow
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  cardInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  floatingActionGreen: {
    backgroundColor: '#10B981',
  },
  floatingActionPurple: {
    backgroundColor: '#8B5CF6',
  },
  floatingActionIconWrapper: {
    marginBottom: 14,
  },
  floatingActionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  floatingActionSubtitle: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.9,
  },

  // ===== PREMIUM TILES SECTION (Gradients) =====
  premiumTilesSection: {
    gap: 16,
    marginBottom: 24,
  },
  premiumTileWrapper: {
    width: '100%',
  },
  premiumWideTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    padding: 22,
    // Glassmorphism
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  tileInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  premiumTileOrange: {
    backgroundColor: '#F97316',
  },
  premiumTileBlue: {
    backgroundColor: '#0EA5E9',
  },
  premiumTileIcon: {
    marginRight: 18,
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTileContent: {
    flex: 1,
  },
  premiumTileTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  premiumTileSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.9,
  },

  // ===== EMPTY STATE =====
  premiumEmptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyStateIconText: {
    fontSize: 52,
  },
  emptyStateTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },

  // ===== EMPTY OPTIONS =====
  emptyOptionsContainer: {
    gap: 16,
    width: '100%',
  },
  emptyOptionCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  emptyOptionCreate: {
    backgroundColor: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  },
  emptyOptionJoin: {
    backgroundColor: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  },
  emptyOptionIconWrapper: {
    marginBottom: 16,
  },
  emptyOptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyOptionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // ===== PENDING REQUEST =====
  premiumPendingRequestCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCD34D',
    width: '100%',
    shadowColor: '#FCD34D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 24,
  },
  pendingRequestIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pendingRequestIcon: {
    fontSize: 48,
  },
  pendingRequestTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  pendingRequestMessage: {
    fontSize: 16,
    color: '#78350F',
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingRequestFamilyName: {
    fontWeight: '800',
    color: '#B45309',
  },
  pendingRequestSubtext: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  // ===== LEGACY STYLES (kept for compatibility) =====
  emptyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 100,
  },
  optionsContainer: {
    gap: 16,
    width: '100%',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionCreate: {
    backgroundColor: '#D1FAE5',
  },
  optionJoin: {
    backgroundColor: '#E9D5FF',
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    marginBottom: 24,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  familyPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  familyPanelHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  familyPanelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  familyPanelSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  childGridCard: {
    width: '31%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  childAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  childGridName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  childPointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  childPointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  familyCard: {
    backgroundColor: '#FF6B6B',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  familyLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
    marginBottom: 4,
  },
  familyName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  familyCodeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  familyCodeText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  familyCodeBold: {
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  childIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  childEmoji: {
    fontSize: 24,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  childPoints: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  actionsSection: {
    paddingHorizontal: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 16,
  },
  legacyActionCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionGreen: {
    backgroundColor: '#D1FAE5',
  },
  actionPurple: {
    backgroundColor: '#E9D5FF',
  },
  actionOrange: {
    backgroundColor: '#FED7AA',
  },
  actionBlue: {
    backgroundColor: '#BFDBFE',
  },
  actionRed: {
    backgroundColor: '#FEE2E2',
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  wideActionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  pendingRequestAlert: {
    borderColor: '#FCA5A5',
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  pendingRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestCountBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  requestCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  wideActionContent: {
    marginLeft: 16,
    flex: 1,
  },
  wideActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  wideActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  pendingRequestCard: {
    backgroundColor: '#FFFBEB',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    width: '100%',
  },
  pendingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pendingEmoji: {
    fontSize: 40,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 12,
  },
  pendingMessage: {
    fontSize: 16,
    color: '#78350F',
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingFamilyName: {
    fontWeight: '700',
  },
  pendingSubtext: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Legacy compatibility styles end here
});
