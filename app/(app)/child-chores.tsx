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
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { ChoreItem } from '@components/ChoreItem';
import { PinInputModal } from '@components/PinInputModal';
import { AlertModal } from '@components/AlertModal';
import { getTodayDate, getToday } from '@lib/utils/dates';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function ChildChoresScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family, chores, children, choreCompletions, completeChore, getChores, getChoreCompletions, getChildren, getFamily } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [child, setChild] = useState<any>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(getToday());
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

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const today = getToday();
  const todayDate = getTodayDate();

  // Track if initial data has been loaded to prevent infinite loops
  const dataLoadedRef = useRef(false);
  const familyIdRef = useRef<string | null>(null);

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

        // Refresh choreCompletions when this page comes into focus
        if (family?.id) {
          await getChoreCompletions(family.id);
        }
      };
      loadChild();
    }, [children, family?.id, getChoreCompletions])
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
    }
  }, [family?.id]);

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

  const handleSwitchToParentMode = () => {
    setShowPinModal(true);
  };

  const handlePinSubmit = async (pin: string) => {
    if (pin === '1234') {
      await AsyncStorage.removeItem('active_child_id');
      setShowPinModal(false);
      router.replace('/(app)/parent');
    } else {
      setShowPinModal(false);
      setTimeout(() => {
        showAlert('Incorrect PIN', 'Please try again', 'error');
      }, 300);
    }
  };

  const isToday = selectedDay === today;

  // Get the start of the current week (Monday) in local timezone
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // Format date as YYYY-MM-DD in local timezone (not UTC)
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateForDay = (dayName: string) => {
    const dayIndex = DAYS.indexOf(dayName);
    const weekStart = getStartOfWeek(new Date());
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    return formatDateLocal(targetDate);
  };

  const selectedDate = isToday ? todayDate : getDateForDay(selectedDay);

  const todayChores = child ? chores.filter(
    (c) => {
      const isAssignedToChild = c.assigned_to === child.id;
      const isRepeatingOnDay = c.repeating_days?.includes(selectedDay);
      const isScheduledForDate = c.scheduled_date === selectedDate;
      return isAssignedToChild && (isRepeatingOnDay || isScheduledForDate);
    }
  ) : [];

  const completedChores = choreCompletions.filter(
    (cc) => cc.completed_date === selectedDate && cc.status === 'approved'
  );

  const handleCompleteChore = async (choreId: string) => {
    if (!child?.id || !isToday) return;

    try {
      await completeChore(choreId, child.id, todayDate);
      showAlert('Awesome!', 'Chore marked as complete! Waiting for parent approval 🎉', 'success');
    } catch (error: any) {
      // Might already exist
      showAlert('Heads up', 'This chore is already marked for today.', 'info');
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
        <View style={styles.premiumHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>{isToday ? "Today's Chores" : `${selectedDay}'s Chores`}</Text>
              <Text style={styles.headerSubtitle}>{isToday ? "Let's get things done!" : "Plan ahead"}</Text>
            </View>
          </View>
        </View>

        {/* Day Selector */}
        <View style={styles.daySelectorContainer}>
          <View style={styles.daySelectorCard}>
            <View style={styles.dayButtonsRow}>
              {DAYS.map((day) => {
                const isSelected = selectedDay === day;
                const isDayToday = day === today;
                const dayDate = isSelected ? selectedDate : getDateForDay(day);
                const dayChores = child ? chores.filter(
                  (c) => {
                    const isAssignedToChild = c.assigned_to === child.id;
                    const isRepeatingOnDay = c.repeating_days?.includes(day);
                    const isScheduledForDate = c.scheduled_date === dayDate;
                    return isAssignedToChild && (isRepeatingOnDay || isScheduledForDate);
                  }
                ) : [];
                
                return (
                  <Pressable
                    key={day}
                    onPress={() => setSelectedDay(day)}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                      isDayToday && !isSelected && styles.dayButtonToday,
                    ]}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextSelected,
                      isDayToday && !isSelected && styles.dayButtonTextToday,
                    ]}>
                      {day.slice(0, 3)}
                    </Text>
                    {dayChores.length > 0 && (
                      <View style={[styles.dayBadge, isSelected && styles.dayBadgeSelected]}>
                        <Text style={[styles.dayBadgeText, isSelected && styles.dayBadgeTextSelected]}>
                          {dayChores.length}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {todayChores.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>🎉</Text>
            </View>
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptyText}>
              {isToday 
                ? "No chores for today. Time to play!" 
                : `Nothing scheduled for ${selectedDay}`}
            </Text>
          </View>
        ) : (
          <View style={styles.choresContainer}>
            <View style={styles.choresHeader}>
              <Text style={styles.choresHeaderText}>
                {todayChores.length} {todayChores.length === 1 ? 'Chore' : 'Chores'}
              </Text>
            </View>
            {todayChores.map((chore, index) => {
              const completion = choreCompletions.find(
                (cc) => cc.chore_id === chore.id && cc.completed_date === selectedDate
              );
              const isCompleted = completion?.status === 'approved';
              const isPending = completion?.status === 'pending';

              return (
                <View key={chore.id} style={styles.choreCard}>
                  <View style={styles.choreCardHeader}>
                    <View style={[
                      styles.choreEmojiCircle,
                      (isCompleted || isPending) && styles.choreEmojiCircleCompleted
                    ]}>
                      <Text style={styles.choreEmoji}>{chore.emoji}</Text>
                    </View>
                    <View style={styles.choreInfo}>
                      <Text style={[
                        styles.choreTitle,
                        (isCompleted || isPending) && styles.choreTitleCompleted
                      ]}>
                        {chore.title}
                      </Text>
                      {chore.description && (
                        <Text style={styles.choreDescription}>{chore.description}</Text>
                      )}
                    </View>
                    <View style={styles.chorePointsBadge}>
                      <Text style={styles.chorePointsText}>+{chore.points}</Text>
                    </View>
                  </View>
                  
                  {isCompleted ? (
                    <View style={styles.completedBanner}>
                      <Text style={styles.completedText}>✓ Completed!</Text>
                    </View>
                  ) : isPending ? (
                    <View style={styles.pendingBanner}>
                      <Text style={styles.pendingText}>⏳ Pending Approval</Text>
                    </View>
                  ) : isToday ? (
                    <PremiumCard 
                      style={styles.markDoneButton}
                      onPress={() => handleCompleteChore(chore.id)}
                    >
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.markDoneGradient}
                      >
                        <Text style={styles.markDoneText}>Mark as Done</Text>
                        <Text style={styles.markDoneIcon}>✓</Text>
                      </LinearGradient>
                    </PremiumCard>
                  ) : (
                    <View style={styles.scheduledBanner}>
                      <Text style={styles.scheduledText}>📅 Scheduled for {selectedDay}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      
      <PinInputModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        title="Return to Parent Mode"
        description="Enter your 4-digit PIN to continue"
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

  // ===== PREMIUM HEADER (matches Dashboard) =====
  premiumHeader: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#10B981',
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
  },

  // Day Selector (card style matching child-detail)
  daySelectorContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 24,
  },
  daySelectorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 6,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  dayButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'transparent',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  dayButtonSelected: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayButtonToday: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8F92A1',
    letterSpacing: 0.2,
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayButtonTextToday: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  dayBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dayBadgeSelected: {
    backgroundColor: '#FFFFFF',
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dayBadgeTextSelected: {
    color: '#8B5CF6',
  },
  
  // Chores Container
  choresContainer: {
    paddingHorizontal: 20,
  },
  choresHeader: {
    marginBottom: 18,
  },
  choresHeaderText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  
  // Chore Card
  choreCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  choreCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  choreEmojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  choreEmojiCircleCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  choreEmoji: {
    fontSize: 30,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  choreTitleCompleted: {
    color: '#A0A8B8',
    textDecorationLine: 'line-through',
  },
  choreDescription: {
    fontSize: 14,
    color: '#8F92A1',
    lineHeight: 20,
  },
  chorePointsBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chorePointsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: -0.3,
  },
  
  // Action Buttons/Banners
  markDoneButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  markDoneGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  markDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  markDoneIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  completedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  completedText: {
    color: '#047857',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  pendingBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  pendingText: {
    color: '#B45309',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scheduledBanner: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  scheduledText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  emptyIcon: {
    fontSize: 68,
  },
  emptyTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    color: '#8F92A1',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
});