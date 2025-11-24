import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { ChoreItem } from '@components/ChoreItem';
import { PinInputModal } from '@components/PinInputModal';
import { AlertModal } from '@components/AlertModal';
import { getTodayDate, getToday } from '@lib/utils/dates';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family, chores, children, choreCompletions, completeChore, getChores, getChoreCompletions } = useFamilyStore();
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

  useEffect(() => {
    loadActiveChild();
  }, []);

  useEffect(() => {
    if (activeChildId) {
      const activeChild = children.find((c) => c.id === activeChildId);
      setChild(activeChild);
    } else if (user?.id) {
      const userChild = children.find((c) => c.user_id === user.id);
      setChild(userChild);
    }
  }, [activeChildId, children, user]);

  useEffect(() => {
    loadData();
  }, [family, child]);

  const loadActiveChild = async () => {
    const childId = await AsyncStorage.getItem('active_child_id');
    setActiveChildId(childId);
  };

  const loadData = async () => {
    if (!family?.id) return;
    try {
      await Promise.all([
        getChores(family.id),
        getChoreCompletions(family.id),
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

  const todayChores = chores.filter(
    (c) => c.assigned_to === child?.id && c.repeating_days.includes(selectedDay)
  );

  const isToday = selectedDay === today;

  const getDateForDay = (dayName: string) => {
    // Get a date string for the selected day
    const dayIndex = DAYS.indexOf(dayName);
    const currentDayIndex = DAYS.indexOf(today);
    const dayDiff = dayIndex - currentDayIndex;
    
    const date = new Date();
    date.setDate(date.getDate() + dayDiff);
    return date.toISOString().split('T')[0];
  };

  const selectedDate = isToday ? todayDate : getDateForDay(selectedDay);

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
        <View style={styles.header}>
          <Text style={styles.title}>{isToday ? "Today's Chores" : `${selectedDay}'s Chores`}</Text>
          <Text style={styles.subtitle}>{isToday ? "Let's get things done! 🎯" : "Plan ahead 📅"}</Text>
          {activeChildId && (
            <TouchableOpacity
              onPress={handleSwitchToParentMode}
              style={styles.switchButton}
            >
              <Text style={styles.switchEmoji}>👨‍👩‍👧</Text>
            </TouchableOpacity>
          )}
        </View>

        {child && (
          <View style={styles.pointsCard}>
            <View style={styles.pointsIconCircle}>
              <Text style={styles.pointsIcon}>⭐</Text>
            </View>
            <View style={styles.pointsContent}>
              <Text style={styles.pointsLabel}>Your Points</Text>
              <Text style={styles.pointsValue}>{child.points}</Text>
            </View>
          </View>
        )}

        {/* Day Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelectorContent}
          style={styles.daySelector}
        >
          {DAYS.map((day) => {
            const dayChores = chores.filter(
              (c) => c.assigned_to === child?.id && c.repeating_days.includes(day)
            );
            return (
              <TouchableOpacity
                key={day}
                onPress={() => setSelectedDay(day)}
                style={[
                  styles.dayButton,
                  selectedDay === day && styles.dayButtonActive,
                ]}
              >
                <Text style={[
                  styles.dayButtonText,
                  selectedDay === day && styles.dayButtonTextActive,
                ]}>
                  {day.slice(0, 3)}
                </Text>
                {day === today && (
                  <View style={styles.todayIndicator}>
                    <Text style={styles.todayIndicatorText}>Today</Text>
                  </View>
                )}
                {dayChores.length > 0 && (
                  <View style={[
                    styles.choreCountBadge,
                    selectedDay === day && styles.choreCountBadgeActive
                  ]}>
                    <Text style={[
                      styles.choreCountText,
                      selectedDay === day && styles.choreCountTextActive
                    ]}>{dayChores.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
              const isCompleted = choreCompletions.some(
                (cc) => cc.chore_id === chore.id && cc.completed_date === selectedDate
              );

              return (
                <View key={chore.id} style={styles.choreCard}>
                  <View style={styles.choreCardHeader}>
                    <View style={[
                      styles.choreEmojiCircle,
                      isCompleted && styles.choreEmojiCircleCompleted
                    ]}>
                      <Text style={styles.choreEmoji}>{chore.emoji}</Text>
                    </View>
                    <View style={styles.choreInfo}>
                      <Text style={[
                        styles.choreTitle,
                        isCompleted && styles.choreTitleCompleted
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
                  ) : isToday ? (
                    <TouchableOpacity
                      onPress={() => handleCompleteChore(chore.id)}
                      style={styles.markDoneButton}
                    >
                      <Text style={styles.markDoneText}>Mark as Done</Text>
                      <Text style={styles.markDoneIcon}>✓</Text>
                    </TouchableOpacity>
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
    backgroundColor: '#F0F4FF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: 'relative',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
  switchButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  switchEmoji: {
    fontSize: 24,
  },
  
  // Points Card
  pointsCard: {
    backgroundColor: '#6366F1',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  pointsIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  pointsIcon: {
    fontSize: 32,
  },
  pointsContent: {
    flex: 1,
  },
  pointsLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
    marginBottom: 4,
  },
  pointsValue: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  
  // Day Selector
  daySelector: {
    marginTop: 24,
    marginBottom: 24,
  },
  daySelectorContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayButtonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  todayIndicator: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  todayIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  choreCountBadge: {
    marginTop: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  choreCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  choreCountTextActive: {
    color: '#FFFFFF',
  },
  
  // Chores Container
  choresContainer: {
    paddingHorizontal: 20,
  },
  choresHeader: {
    marginBottom: 16,
  },
  choresHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  
  // Chore Card
  choreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  choreCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  choreEmojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  choreEmojiCircleCompleted: {
    backgroundColor: '#D1FAE5',
  },
  choreEmoji: {
    fontSize: 28,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  choreTitleCompleted: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  choreDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  chorePointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  chorePointsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
  },
  
  // Action Buttons/Banners
  markDoneButton: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  markDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  markDoneIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  completedBanner: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedText: {
    color: '#047857',
    fontSize: 16,
    fontWeight: '700',
  },
  scheduledBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  scheduledText: {
    color: '#4338CA',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});