import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { AlertModal } from '@components/AlertModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

export default function WeeklyView() {
  const router = useRouter();
  const { chores, choreCompletions, children, getChores, getChoreCompletions, family } = useFamilyStore();
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

  useEffect(() => {
    loadData();
  }, [family]);

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

  const getChoresForDay = (day: string) => {
    return chores.filter((c) => c.repeating_days.includes(day));
  };

  const getCompletionForChoreOnDay = (choreId: string, day: string) => {
    // Get day of week from completion date
    const getDayOfWeek = (dateString: string) => {
      const date = new Date(dateString);
      const dayIndex = date.getDay();
      return DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
    };

    return choreCompletions.find(cc => {
      if (cc.chore_id !== choreId) return false;
      const completionDay = getDayOfWeek(cc.completed_date);
      return completionDay === day;
    });
  };

  const getChildName = (childId: string) => {
    return children.find(c => c.id === childId)?.display_name || 'Unknown';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['#FF6B35', '#F7931E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Text style={styles.headerIconText}>📅</Text>
          </LinearGradient>
          <Text style={styles.headerTitle}>Weekly Schedule</Text>
          <Text style={styles.headerSubtitle}>All chores organized by day</Text>
        </View>

        {DAYS.map((day) => {
          const dayChores = getChoresForDay(day);
          const completedCount = dayChores.filter(chore => {
            const completion = getCompletionForChoreOnDay(chore.id, day);
            return completion?.status === 'approved';
          }).length;

          return (
            <View key={day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View>
                  <Text style={styles.dayTitle}>{day}</Text>
                  <Text style={styles.daySubtitle}>
                    {completedCount}/{dayChores.length} completed
                  </Text>
                </View>
                {dayChores.length > 0 && (
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressText}>
                      {dayChores.length > 0 ? Math.round((completedCount / dayChores.length) * 100) : 0}%
                    </Text>
                  </View>
                )}
              </View>

              {dayChores.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyText}>No chores scheduled</Text>
                </View>
              ) : (
                <View style={styles.choresContainer}>
                  {dayChores.map((chore) => {
                    const completion = getCompletionForChoreOnDay(chore.id, day);
                    const isCompleted = completion?.status === 'approved';
                    const isPending = completion?.status === 'pending';

                    return (
                      <PremiumCard
                        key={chore.id}
                        style={[
                          styles.choreCard,
                          isCompleted && styles.choreCardCompleted,
                          isPending && styles.choreCardPending,
                        ]}
                        onPress={() => {
                          router.push({
                            pathname: '/(app)/parent/create-chore',
                            params: { 
                              choreId: chore.id,
                              edit: 'true'
                            },
                          });
                        }}
                      >
                        <View style={styles.choreLeft}>
                          <View style={[
                            styles.choreEmoji,
                            isCompleted && styles.choreEmojiCompleted,
                            isPending && styles.choreEmojiPending,
                          ]}>
                            <Text style={styles.choreEmojiText}>{chore.emoji}</Text>
                          </View>
                          <View style={styles.choreInfo}>
                            <Text style={styles.choreTitle}>{chore.title}</Text>
                            <View style={styles.choreMetaRow}>
                              <Text style={styles.choreChild}>
                                👶 {getChildName(chore.assigned_to)}
                              </Text>
                              <View style={styles.chorePoints}>
                                <Text style={styles.chorePointsText}>{chore.points} pts</Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        <View style={styles.choreRight}>
                          {isCompleted && (
                            <View style={styles.statusBadge}>
                              <Text style={styles.statusBadgeText}>✓</Text>
                            </View>
                          )}
                          {isPending && (
                            <View style={[styles.statusBadge, styles.statusBadgePending]}>
                              <Text style={styles.statusBadgeText}>⏳</Text>
                            </View>
                          )}
                          {!completion && (
                            <Text style={styles.editHint}>Edit →</Text>
                          )}
                        </View>
                      </PremiumCard>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
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
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: 'rgba(255, 107, 53, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  headerIconText: {
    fontSize: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 17,
    color: '#6B7280',
  },
  dayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  daySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  progressText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6366F1',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  choresContainer: {
    gap: 14,
  },
  choreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FBF8F3',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  choreCardCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  choreCardPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  choreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  choreEmoji: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  choreEmojiCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  choreEmojiPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  choreEmojiText: {
    fontSize: 24,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  choreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  choreChild: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chorePoints: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chorePointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
  choreRight: {
    marginLeft: 10,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  statusBadgePending: {
    backgroundColor: '#F59E0B',
    shadowColor: 'rgba(245, 158, 11, 0.3)',
  },
  statusBadgeText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  editHint: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
});
