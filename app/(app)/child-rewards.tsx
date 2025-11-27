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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { AlertModal } from '@components/AlertModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sparkling gift icon with twinkling sparkle nearby
const SparklingGift = () => {
  const twinkleAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Twinkling effect - quick pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0.2,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0.8,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0.3,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(100),
      ])
    ).start();
    
    // Float up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  
  return (
    <Animated.Text
      style={[
        styles.sparklingGift,
        {
          opacity: twinkleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          }),
          transform: [
            {
              translateY: floatAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [5, -8],
              }),
            },
            {
              scale: twinkleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1.3],
              }),
            },
          ],
        },
      ]}
    >
      ✨
    </Animated.Text>
  );
};

// Firework emoji that sprays from right side and fades/shrinks at halfway
const FlyingEmoji = ({ emoji, delay, topPosition, duration, angle }: { 
  emoji: string; 
  delay: number; 
  topPosition: number;
  duration: number;
  angle: number; // spray angle in degrees
}) => {
  const flyAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const startFly = () => {
      flyAnim.setValue(0);
      scaleAnim.setValue(1);
      
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          // Fly outward with deceleration (like firework)
          Animated.timing(flyAnim, {
            toValue: 1,
            duration: duration,
            easing: Easing.out(Easing.cubic), // Decelerates like real firework
            useNativeDriver: true,
          }),
          // Shrink as it travels
          Animated.timing(scaleAnim, {
            toValue: 0.3,
            duration: duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Restart immediately with tiny random offset for natural feel
        setTimeout(startFly, Math.random() * 200);
      });
    };
    
    startFly();
  }, []);
  
  // Calculate spray direction - spreading from right to left
  const maxDistance = SCREEN_WIDTH * 0.38; // Travel further left
  // Angle determines vertical spread: 0 = straight left, positive = up-left, negative = down-left
  const yOffset = angle * maxDistance * 0.015; // Convert angle to vertical offset
  
  return (
    <Animated.Text
      style={[
        styles.flyingEmoji,
        {
          top: topPosition,
          opacity: flyAnim.interpolate({
            inputRange: [0, 0.1, 0.6, 1],
            outputRange: [0, 1, 0.7, 0],
          }),
          transform: [
            {
              translateX: flyAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -maxDistance], // Move left
              }),
            },
            {
              translateY: flyAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, yOffset], // Spread vertically based on angle
              }),
            },
            {
              scale: scaleAnim,
            },
            {
              rotate: flyAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', `${angle > 0 ? -30 : 30}deg`],
              }),
            },
          ],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

// Container for all flying emojis - continuous spray pattern
const FlyingEmojis = () => {
  const configs = [
    // Continuous spray - staggered to always have emojis visible
    { emoji: '🌟', delay: 0, top: 35, duration: 1800, angle: -12 },
    { emoji: '💫', delay: 150, top: 40, duration: 1600, angle: 0 },
    { emoji: '⭐', delay: 300, top: 45, duration: 2000, angle: 12 },
    { emoji: '💎', delay: 450, top: 38, duration: 1700, angle: -6 },
    { emoji: '✨', delay: 600, top: 42, duration: 1500, angle: 6 },
    { emoji: '🎁', delay: 750, top: 40, duration: 1900, angle: 2 },
    { emoji: '🌟', delay: 900, top: 36, duration: 1800, angle: -14 },
    { emoji: '⭐', delay: 1050, top: 44, duration: 1600, angle: 14 },
    { emoji: '✨', delay: 1200, top: 39, duration: 1700, angle: -4 },
    { emoji: '💫', delay: 1350, top: 41, duration: 1800, angle: 8 },
  ];
  
  return (
    <>
      {configs.map((config, i) => (
        <FlyingEmoji
          key={i}
          emoji={config.emoji}
          delay={config.delay}
          topPosition={config.top}
          duration={config.duration}
          angle={config.angle}
        />
      ))}
    </>
  );
};

// Keep FloatingSparkles as a fallback (not used anymore)
const FloatingSparkles = () => {
  // Create multiple animation values for more complex movement
  const particles = [0, 1, 2, 3, 4, 5];
  const floatAnims = particles.map(() => useRef(new Animated.Value(Math.random())).current);
  const wobbleAnims = particles.map(() => useRef(new Animated.Value(Math.random() * 2 - 1)).current);
  const pulseAnims = particles.map(() => useRef(new Animated.Value(Math.random())).current);
  const spinAnims = particles.map(() => useRef(new Animated.Value(0)).current);
  
  useEffect(() => {
    particles.forEach((_, i) => {
      // Truly random timing for each particle
      const baseSpeed = 1800 + Math.random() * 1500;
      const floatDuration = baseSpeed + Math.random() * 800;
      const wobbleDuration = baseSpeed * 0.7 + Math.random() * 600;
      const pulseDuration = baseSpeed * 0.5 + Math.random() * 400;
      const spinDuration = baseSpeed * 2 + Math.random() * 2000;
      const startDelay = Math.random() * 500;
      
      // Vertical floating - random direction start
      const floatUp = Math.random() > 0.5;
      Animated.loop(
        Animated.sequence([
          Animated.delay(startDelay),
          Animated.timing(floatAnims[i], {
            toValue: floatUp ? 1 : 0,
            duration: floatDuration,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnims[i], {
            toValue: floatUp ? 0 : 1,
            duration: floatDuration * (0.8 + Math.random() * 0.4),
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Horizontal wobble - asymmetric movement
      const wobbleDir = Math.random() > 0.5 ? 1 : -1;
      Animated.loop(
        Animated.sequence([
          Animated.delay(startDelay + Math.random() * 200),
          Animated.timing(wobbleAnims[i], {
            toValue: wobbleDir,
            duration: wobbleDuration,
            easing: Easing.bezier(0.33, 0, 0.67, 1),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnims[i], {
            toValue: -wobbleDir * 0.6,
            duration: wobbleDuration * 0.8,
            easing: Easing.bezier(0.33, 0, 0.67, 1),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnims[i], {
            toValue: wobbleDir * 0.3,
            duration: wobbleDuration * 0.5,
            easing: Easing.bezier(0.33, 0, 0.67, 1),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnims[i], {
            toValue: 0,
            duration: wobbleDuration * 0.4,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Scale pulse - irregular breathing
      Animated.loop(
        Animated.sequence([
          Animated.delay(startDelay + Math.random() * 100),
          Animated.timing(pulseAnims[i], {
            toValue: 1,
            duration: pulseDuration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(Math.random() * 200),
          Animated.timing(pulseAnims[i], {
            toValue: 0.3 + Math.random() * 0.3,
            duration: pulseDuration * 1.2,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnims[i], {
            toValue: 0,
            duration: pulseDuration * 0.8,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Gentle spin for some particles
      if (i % 2 === 0) {
        Animated.loop(
          Animated.timing(spinAnims[i], {
            toValue: 1,
            duration: spinDuration,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      }
    });
  }, []);
  
  const emojis = ['✨', '🌟', '💫', '⭐', '🌟', '💎'];
  // Positioned in the CENTER of header only (avoiding left text and right icon)
  // Left side ends around 55%, right icon starts around 75%
  const configs = [
    { left: '32%', top: -5, size: 28, floatRange: 25, wobbleRange: 12 },
    { left: '48%', top: 70, size: 32, floatRange: 30, wobbleRange: 15 },
    { left: '38%', top: 40, size: 26, floatRange: 22, wobbleRange: 10 },
    { left: '55%', top: 15, size: 30, floatRange: 28, wobbleRange: 14 },
    { left: '42%', top: 95, size: 24, floatRange: 20, wobbleRange: 8 },
    { left: '60%', top: 55, size: 26, floatRange: 24, wobbleRange: 11 },
  ];
  
  return (
    <>
      {particles.map((_, i) => {
        const config = configs[i];
        return (
          <Animated.Text
            key={i}
            style={[
              styles.floatingSparkle,
              { fontSize: config.size },
              { left: config.left, top: config.top },
              {
                opacity: pulseAnims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
                transform: [
                  {
                    translateY: floatAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [config.floatRange / 2, -config.floatRange],
                    }),
                  },
                  {
                    translateX: wobbleAnims[i].interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: [-config.wobbleRange, 0, config.wobbleRange],
                    }),
                  },
                  {
                    scale: pulseAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                  {
                    rotate: i % 2 === 0 
                      ? spinAnims[i].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        })
                      : wobbleAnims[i].interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: ['-20deg', '0deg', '20deg'],
                        }),
                  },
                ],
              },
            ]}
          >
            {emojis[i]}
          </Animated.Text>
        );
      })}
    </>
  );
};

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

  useEffect(() => {
    loadActiveChild();
  }, []);

  // Fetch family data if not already loaded
  useEffect(() => {
    if (user?.family_id && !family) {
      getFamily(user.family_id);
    }
  }, [user, family]);

  useEffect(() => {
    // Try to find child by active_child_id first, then by user_id
    if (children.length > 0) {
      if (activeChildId) {
        const activeChild = children.find((c) => c.id === activeChildId);
        if (activeChild) {
          setChild(activeChild);
          return;
        }
      }
      // Fallback: try to find by user_id
      if (user?.id) {
        const userChild = children.find((c) => c.user_id === user.id);
        if (userChild) {
          setChild(userChild);
        }
      }
    }
  }, [activeChildId, children, user]);

  const loadActiveChild = async () => {
    const childId = await AsyncStorage.getItem('active_child_id');
    setActiveChildId(childId);
  };

  useEffect(() => {
    loadData();
  }, [family]);

  const loadData = async () => {
    if (!family?.id) return;
    try {
      await Promise.all([
        getChildren(family.id),
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
        {/* Premium Header with flying emojis and sparkling gift */}
        <View style={styles.premiumHeader}>
          <FlyingEmojis />
          <View style={styles.headerTop}>
            <View style={styles.headerLeftContent}>
              <View style={styles.giftIconContainer}>
                <Text style={styles.giftIcon}>🎁</Text>
                <SparklingGift />
              </View>
              <View>
                <Text style={styles.headerTitle}>Rewards</Text>
                <Text style={styles.headerSubtitle}>Claim amazing prizes!</Text>
              </View>
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
              const claimed = myClaims.some((rc) => rc.reward_id === reward.id);
              const canClaim = !claimed && child && child.points >= reward.points_required;
              const notEnoughPoints = !claimed && child && child.points < reward.points_required;

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
                    {claimed && (
                      <View style={styles.claimedBadge}>
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
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
                        <Text style={styles.claimButtonText}>Claim Now!</Text>
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
            <Text style={styles.sectionTitle}>🎊 Claimed ({myClaims.length})</Text>
            <View style={styles.claimedCard}>
              <Text style={styles.claimedEmoji}>🎉</Text>
              <Text style={styles.claimedText}>
                Amazing! You've claimed {myClaims.length} reward{myClaims.length !== 1 ? 's' : ''}!
              </Text>
              <Text style={styles.claimedSubtext}>Keep earning points for more!</Text>
            </View>
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
  
  // Floating sparkles
  floatingSparkle: {
    position: 'absolute',
    fontSize: 16,
    zIndex: 10,
  },
  
  // Flying emojis that cross the screen
  flyingEmoji: {
    position: 'absolute',
    fontSize: 26,
    zIndex: 10,
    right: 0,
  },
  
  // Sparkling gift sparkle
  sparklingGift: {
    position: 'absolute',
    fontSize: 18,
    top: -8,
    right: -6,
    zIndex: 15,
  },
  
  // Gift icon with sparkle container
  giftIconContainer: {
    position: 'relative',
    marginRight: 10,
  },
  giftIcon: {
    fontSize: 28,
  },
  
  // Header left content grouping
  headerLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
});
