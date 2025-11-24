import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { AlertModal } from '@components/AlertModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
                      <TouchableOpacity
                        key={chore.id}
                        style={[
                          styles.choreCard,
                          isCompleted && styles.choreCardCompleted,
                          isPending && styles.choreCardPending,
                        ]}
                        onPress={() => {
                          // Navigate to edit chore
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
                      </TouchableOpacity>
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
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  daySubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  choresContainer: {
    gap: 12,
  },
  choreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choreCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  choreCardPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  choreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  choreEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choreEmojiCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  choreEmojiPending: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE68A',
  },
  choreEmojiText: {
    fontSize: 22,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  choreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choreChild: {
    fontSize: 12,
    color: '#6B7280',
  },
  chorePoints: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chorePointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  choreRight: {
    marginLeft: 8,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgePending: {
    backgroundColor: '#F59E0B',
  },
  statusBadgeText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  editHint: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
