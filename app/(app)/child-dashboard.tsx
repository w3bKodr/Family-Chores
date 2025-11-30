import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { AlertModal } from '@components/AlertModal';
import { PinInputModal } from '@components/PinInputModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToday, getTodayDate } from '@lib/utils/dates';

// Glowing Stars Panel with giant number in center
const GlowingStarsPanel = ({ points, duration = 2500 }: { points: number; duration?: number }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const numberGlow = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  useEffect(() => {
    // Create bouncing and glowing animation
    animationRef.current = Animated.loop(
      Animated.parallel([
        // Bounce animation
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
        // Glow pulse
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
        // Number glow
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
    
    // Stop animation after specified duration
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
      {
        translateY: bounceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
      {
        scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
      { rotate: '-15deg' },
    ],
    opacity: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    }),
  };
  
  const rightStarStyle = {
    transform: [
      {
        translateY: bounceAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
      {
        scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
      { rotate: '15deg' },
    ],
    opacity: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1],
    }),
  };
  
  return (
    <View style={styles.starsPanel}>
      <Text style={styles.starsPanelTitle}>Your Points</Text>
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
      style={{ flex: 1 }}
    >
      <Animated.View style={[style, { flex: 1, transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function ChildDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family, chores, children, choreCompletions, getChores, getChoreCompletions, getChildren, getFamily, verifyParentPin, hasParentPin } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [child, setChild] = useState<any>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [showPinModal, setShowPinModal] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  
  // Track if data has been loaded to prevent infinite loops
  const dataLoadedRef = useRef(false);
  const familyIdRef = useRef<string | null>(null);

  const today = getToday();
  const todayDate = getTodayDate();

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  // Load active child when screen is focused (not just on mount)
  useFocusEffect(
    React.useCallback(() => {
      const loadChild = async () => {
        const childId = await AsyncStorage.getItem('active_child_id');
        setActiveChildId(childId);
        
        // Immediately set child if children are already loaded
        if (childId && children.length > 0) {
          const activeChild = children.find((c) => c.id === childId);
          if (activeChild) {
            setChild(activeChild);
          }
        }
      };
      loadChild();
    }, [children])
  );

  // Fetch family data if not already loaded - only trigger on family_id change
  useEffect(() => {
    if (user?.family_id && !family) {
      getFamily(user.family_id);
    }
  }, [user?.family_id]);

  // Set child when activeChildId or children change
  useEffect(() => {
    if (children.length > 0 && activeChildId) {
      const activeChild = children.find((c) => c.id === activeChildId);
      if (activeChild) {
        setChild(activeChild);
      }
    } else if (children.length > 0 && user?.id && !activeChildId) {
      // Fallback: if no activeChildId, try to find by user_id
      const userChild = children.find((c) => c.user_id === user.id);
      if (userChild) {
        setChild(userChild);
      }
    }
  }, [activeChildId, children, user?.id]);

  // Load data only when family ID changes, not on every render
  useEffect(() => {
    if (family?.id && family.id !== familyIdRef.current) {
      familyIdRef.current = family.id;
      loadData();
      checkPinStatus();
    }
  }, [family?.id]);

  const checkPinStatus = async () => {
    if (family?.id) {
      const hasPin = await hasParentPin(family.id);
      setHasPinSet(hasPin);
    }
  };

  const loadActiveChild = async () => {
    const childId = await AsyncStorage.getItem('active_child_id');
    setActiveChildId(childId);
  };

  const loadData = async () => {
    if (!family?.id || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    try {
      await Promise.all([
        getChildren(family.id),
        getChores(family.id),
        getChoreCompletions(family.id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
      dataLoadedRef.current = false; // Allow retry on error
    }
  };

  const handleRefresh = async () => {
    if (!family?.id) return;
    setRefreshing(true);
    await loadActiveChild();
    try {
      await Promise.all([
        getChildren(family.id),
        getChores(family.id),
        getChoreCompletions(family.id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
    setRefreshing(false);
  };

  // Get today's chores for this child
  const todaysChores = chores.filter(
    (c) => c.assigned_to === child?.id && c.repeating_days.includes(today)
  );

  const completedToday = todaysChores.filter((chore) => {
    const completion = choreCompletions.find(
      (cc) => cc.chore_id === chore.id && cc.completed_date === todayDate
    );
    return completion?.status === 'approved';
  });

  const pendingToday = todaysChores.filter((chore) => {
    const completion = choreCompletions.find(
      (cc) => cc.chore_id === chore.id && cc.completed_date === todayDate
    );
    return completion?.status === 'pending';
  });

  const remainingToday = todaysChores.length - completedToday.length - pendingToday.length;
  const progressPercent = todaysChores.length > 0 
    ? Math.round((completedToday.length / todaysChores.length) * 100) 
    : 0;

  const handleExitChildMode = async () => {
    // If PIN is set, require PIN verification
    if (hasPinSet) {
      setShowPinModal(true);
    } else {
      // No PIN set, exit directly
      await AsyncStorage.removeItem('active_child_id');
      router.replace('/(app)/parent-dashboard');
    }
  };

  const handlePinSubmit = async (pin: string) => {
    // Ensure we have a family id (family may not be loaded yet). Try to fall back to the
    // authenticated user's family_id and fetch family if needed. Avoid silent no-op.
    const familyId = family?.id ?? user?.family_id;
    if (!familyId) {
      showAlert('Error', 'Family data not available. Please try again.', 'error');
      return;
    }

    // If the family object itself is not loaded in state, attempt to fetch it so
    // subsequent flows that rely on family are populated.
    if (!family?.id && user?.family_id) {
      try {
        await getFamily(user.family_id);
      } catch (err) {
        // proceed — verification below will still run against familyId
      }
    }

    const isValid = await verifyParentPin(familyId, pin);
    if (isValid) {
      setShowPinModal(false);
      // Delay navigation to allow modal to close first
      setTimeout(async () => {
        await AsyncStorage.removeItem('active_child_id');
        router.replace('/(app)/parent-dashboard');
      }, 100);
    } else {
      showAlert('Incorrect PIN', 'The PIN you entered is incorrect.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Premium Header */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerGreeting}>Hi, {child?.display_name || 'there'}! 👋</Text>
              <Text style={styles.headerSubtitle}>Let's get things done today</Text>
            </View>
            <TouchableOpacity onPress={handleExitChildMode} style={styles.exitButton}>
              <Ionicons name="exit-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Your Points Panel */}
          <GlowingStarsPanel points={child?.points || 0} duration={2500} />

          {/* Today's Progress */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Today's Progress</Text>
              <View style={styles.progressBadge}>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
            </View>
            
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.statText}>{completedToday.length} Done</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.statText}>{pendingToday.length} Pending</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: '#9CA3AF' }]} />
                <Text style={styles.statText}>{remainingToday} Remaining</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <PremiumCard
              style={styles.actionCard}
              onPress={() => router.push('/(app)/child-chores')}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGradient}
              >
                {/* Top glow accent */}
                <View style={styles.actionAccentGlow} />
                
                {/* Icon - Large & Bold */}
                <View style={styles.actionIconWrapper}>
                  <Ionicons name="checkmark-circle" size={44} color="#FFFFFF" />
                </View>
                
                {/* Text Content */}
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>My Chores</Text>
                  <Text style={styles.actionSubtitle}>{todaysChores.length} today</Text>
                </View>
              </LinearGradient>
            </PremiumCard>

            <PremiumCard
              style={styles.actionCard}
              onPress={() => router.push('/(app)/child-rewards')}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionGradient}
              >
                {/* Top glow accent */}
                <View style={styles.actionAccentGlow} />
                
                {/* Icon - Large & Bold */}
                <View style={styles.actionIconWrapper}>
                  <Ionicons name="gift" size={44} color="#FFFFFF" />
                </View>
                
                {/* Text Content */}
                <View style={styles.actionTextBlock}>
                  <Text style={styles.actionTitle}>Rewards</Text>
                  <Text style={styles.actionSubtitle}>Claim prizes</Text>
                </View>
              </LinearGradient>
            </PremiumCard>
          </View>
        </View>
      </ScrollView>

      <PinInputModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        title="Enter PIN"
        description="Enter your parent PIN to exit child mode"
      />

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
  scrollContent: {
    paddingBottom: 100,
  },
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
  headerGreeting: {
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
  exitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  // Your Points Panel
  starsPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 32,
    marginBottom: 20,
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
  
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 168,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  actionGradient: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    position: 'relative',
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
  actionIconWrapper: {
    zIndex: 2,
    marginTop: 8,
  },
  actionTextBlock: {
    zIndex: 2,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    opacity: 0.88,
    marginTop: 4,
  },
});
