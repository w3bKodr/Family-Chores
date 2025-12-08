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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { AlertModal } from '@components/AlertModal';
import { ConfirmModal } from '@components/ConfirmModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Get today's day name
const getTodayIndex = () => {
  const dayIndex = new Date().getDay();
  return dayIndex === 0 ? 6 : dayIndex - 1; // Convert Sunday=0 to index 6
};

// Get start of current week (Monday)
const getWeekStart = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get date for a specific day of the week
const getDateForDayIndex = (weekStart: Date, dayIndex: number) => {
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + dayIndex);
  return date;
};

// Format date as YYYY-MM-DD
const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0];
};

// Format date for display
const formatDisplayDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

export default function ParentChores() {
  const router = useRouter();
  const { chores, choreCompletions, children, getChores, getChoreCompletions, family, deleteChore } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(getTodayIndex());
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [selectedHistoryDay, setSelectedHistoryDay] = useState(getTodayIndex());
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [choreToDelete, setChoreToDelete] = useState<string | null>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const handleDeleteChore = async () => {
    if (!choreToDelete || !family?.id) return;
    
    try {
      await deleteChore(choreToDelete);
      await getChores(family.id);
      setDeleteConfirmVisible(false);
      setChoreToDelete(null);
      showAlert('Success', 'Chore deleted successfully!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
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

  // Get the start of the selected week
  const currentWeekStart = getWeekStart(new Date());
  const selectedWeekStart = new Date(currentWeekStart);
  selectedWeekStart.setDate(currentWeekStart.getDate() + (weekOffset * 7));

  // Get chores scheduled for a specific day of the week
  const getChoresForDay = (day: string) => {
    return chores.filter((c) => c.repeating_days.includes(day));
  };

  // Get completions for a specific date
  const getCompletionsForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return choreCompletions.filter(cc => cc.completed_date === dateStr);
  };

  // Get completion for a specific chore on a specific date
  const getCompletionForChoreOnDate = (choreId: string, date: Date) => {
    const dateStr = formatDate(date);
    return choreCompletions.find(cc => cc.chore_id === choreId && cc.completed_date === dateStr);
  };

  const getChildName = (childId: string) => {
    return children.find(c => c.id === childId)?.display_name || 'Unknown';
  };

  const getChildEmoji = (childId: string) => {
    return children.find(c => c.id === childId)?.emoji || '👶';
  };

  // Week navigation
  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => {
    if (weekOffset < 0) setWeekOffset(prev => prev + 1);
  };
  const goToCurrentWeek = () => setWeekOffset(0);

  const getWeekLabel = () => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === -1) return 'Last Week';
    const startDate = formatDisplayDate(selectedWeekStart);
    const endDate = new Date(selectedWeekStart);
    endDate.setDate(selectedWeekStart.getDate() + 6);
    return `${startDate} - ${formatDisplayDate(endDate)}`;
  };

  // Get selected date for history
  const selectedDate = getDateForDayIndex(selectedWeekStart, selectedHistoryDay);
  const selectedDayCompletions = getCompletionsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Green Header */}
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Chores</Text>
            <Text style={styles.headerSubtitle}>Manage your family's schedule</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/parent/create-chore')}
            style={styles.addButton}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('schedule')}
            style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          >
            <Ionicons 
              name="calendar-outline" 
              size={18} 
              color={activeTab === 'schedule' ? '#10B981' : 'rgba(255,255,255,0.7)'} 
            />
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
              Weekly Schedule
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={activeTab === 'history' ? '#10B981' : 'rgba(255,255,255,0.7)'} 
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'schedule' ? (
          // ========== WEEKLY SCHEDULE TAB ==========
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="repeat" size={20} color="#10B981" />
                </View>
                <Text style={styles.sectionTitle}>Recurring Chores</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Set up chores that repeat weekly
              </Text>
            </View>

            {/* Day Selector for Schedule */}
            <View style={styles.daySelector}>
              {SHORT_DAYS.map((day, index) => {
                const isSelected = selectedScheduleDay === index;
                const isToday = index === getTodayIndex();
                const dayChoresCount = getChoresForDay(DAYS[index]).length;
                
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedScheduleDay(index)}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                    ]}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextSelected,
                    ]}>
                      {day}
                    </Text>
                    {isToday && !isSelected && (
                      <View style={styles.todayDot} />
                    )}
                    {dayChoresCount > 0 && (
                      <View style={[styles.choreBadge, isSelected && styles.choreBadgeSelected]}>
                        <Text style={[styles.choreBadgeText, isSelected && styles.choreBadgeTextSelected]}>
                          {dayChoresCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Chores for Selected Day */}
            <View style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{DAYS[selectedScheduleDay]}</Text>
                <Text style={styles.dayCount}>
                  {getChoresForDay(DAYS[selectedScheduleDay]).length} chores
                </Text>
              </View>

              {getChoresForDay(DAYS[selectedScheduleDay]).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyText}>No chores scheduled for {DAYS[selectedScheduleDay]}</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(app)/parent/create-chore')}
                    style={styles.addChoreLink}
                  >
                    <Text style={styles.addChoreLinkText}>+ Add a chore</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.choresContainer}>
                  {getChoresForDay(DAYS[selectedScheduleDay]).map((chore) => (
                    <PremiumCard
                      key={chore.id}
                      style={styles.choreCard}
                      onPress={() => {
                        router.push({
                          pathname: '/(app)/parent/create-chore',
                          params: { choreId: chore.id, edit: 'true' },
                        });
                      }}
                    >
                      <View style={styles.choreLeft}>
                        <View style={styles.choreEmoji}>
                          <Text style={styles.choreEmojiText}>{chore.emoji}</Text>
                        </View>
                        <View style={styles.choreInfo}>
                          <Text style={styles.choreTitle}>{chore.title}</Text>
                          <View style={styles.choreMetaRow}>
                            <View style={styles.childBadge}>
                              <Text style={styles.childEmoji}>{getChildEmoji(chore.assigned_to)}</Text>
                              <Text style={styles.choreChild}>{getChildName(chore.assigned_to)}</Text>
                            </View>
                            <View style={styles.chorePoints}>
                              <Text style={styles.chorePointsText}>{chore.points} pts</Text>
                            </View>
                          </View>
                          {chore.repeating_days.length > 0 && (
                            <View style={styles.repeatDays}>
                              {chore.repeating_days.map(d => (
                                <View key={d} style={styles.repeatDayBadge}>
                                  <Text style={styles.repeatDayText}>{d.slice(0, 3)}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.choreActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setChoreToDelete(chore.id);
                            setDeleteConfirmVisible(true);
                          }}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={22} color="#10B981" />
                      </View>
                    </PremiumCard>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : (
          // ========== HISTORY TAB ==========
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIcon, styles.sectionIconPurple]}>
                  <Ionicons name="analytics" size={20} color="#8B5CF6" />
                </View>
                <Text style={styles.sectionTitle}>Completion History</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                View chore completions by date
              </Text>
            </View>

            {/* Week Navigation */}
            <View style={styles.weekNavigation}>
              <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekNavButton}>
                <Ionicons name="chevron-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={goToCurrentWeek} style={styles.weekLabel}>
                <Text style={styles.weekLabelText}>{getWeekLabel()}</Text>
                {weekOffset !== 0 && (
                  <Text style={styles.weekLabelHint}>Tap to go to current week</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={goToNextWeek} 
                style={[styles.weekNavButton, weekOffset >= 0 && styles.weekNavButtonDisabled]}
                disabled={weekOffset >= 0}
              >
                <Ionicons name="chevron-forward" size={24} color={weekOffset >= 0 ? '#D1D5DB' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            {/* Day Selector for History */}
            <View style={styles.daySelector}>
              {SHORT_DAYS.map((day, index) => {
                const isSelected = selectedHistoryDay === index;
                const date = getDateForDayIndex(selectedWeekStart, index);
                const completions = getCompletionsForDate(date);
                const approvedCount = completions.filter(c => c.status === 'approved').length;
                const pendingCount = completions.filter(c => c.status === 'pending').length;
                const isToday = weekOffset === 0 && index === getTodayIndex();
                const isFuture = weekOffset === 0 && index > getTodayIndex();
                
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setSelectedHistoryDay(index)}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelectedPurple,
                      isFuture && styles.dayButtonFuture,
                    ]}
                    disabled={isFuture}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      isSelected && styles.dayButtonTextSelected,
                      isFuture && styles.dayButtonTextFuture,
                    ]}>
                      {day}
                    </Text>
                    <Text style={[
                      styles.dayDateText,
                      isSelected && styles.dayDateTextSelected,
                      isFuture && styles.dayButtonTextFuture,
                    ]}>
                      {date.getDate()}
                    </Text>
                    {isToday && !isSelected && (
                      <View style={styles.todayDotPurple} />
                    )}
                    {approvedCount > 0 && (
                      <View style={[styles.choreBadge, styles.choreBadgeGreen, isSelected && styles.choreBadgeSelectedPurple]}>
                        <Text style={[styles.choreBadgeText, isSelected && styles.choreBadgeTextSelectedPurple]}>
                          {approvedCount}
                        </Text>
                      </View>
                    )}
                    {pendingCount > 0 && (
                      <View style={[styles.pendingIndicator, isSelected && styles.pendingIndicatorSelected]}>
                        <Ionicons name="time" size={10} color={isSelected ? '#FFFFFF' : '#F59E0B'} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* History for Selected Date */}
            <View style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View>
                  <Text style={styles.dayTitle}>{DAYS[selectedHistoryDay]}</Text>
                  <Text style={styles.dateSubtitle}>{formatDisplayDate(selectedDate)}</Text>
                </View>
                <View style={styles.dayStats}>
                  <View style={styles.dayStat}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.dayStatText}>
                      {selectedDayCompletions.filter(c => c.status === 'approved').length} done
                    </Text>
                  </View>
                  <View style={styles.dayStat}>
                    <Ionicons name="time" size={16} color="#F59E0B" />
                    <Text style={styles.dayStatText}>
                      {selectedDayCompletions.filter(c => c.status === 'pending').length} pending
                    </Text>
                  </View>
                </View>
              </View>

              {selectedDayCompletions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📅</Text>
                  <Text style={styles.emptyText}>No completions on this day</Text>
                </View>
              ) : (
                <View style={styles.choresContainer}>
                  {selectedDayCompletions.map((completion) => {
                    const chore = chores.find(c => c.id === completion.chore_id);
                    if (!chore) return null;
                    
                    const isApproved = completion.status === 'approved';
                    const isPending = completion.status === 'pending';
                    const isRejected = completion.status === 'rejected';

                    return (
                      <View
                        key={completion.id}
                        style={[
                          styles.choreCard,
                          isApproved && styles.choreCardCompleted,
                          isPending && styles.choreCardPending,
                          isRejected && styles.choreCardRejected,
                        ]}
                      >
                        <View style={styles.choreLeft}>
                          <View style={[
                            styles.choreEmoji,
                            isApproved && styles.choreEmojiCompleted,
                            isPending && styles.choreEmojiPending,
                            isRejected && styles.choreEmojiRejected,
                          ]}>
                            <Text style={styles.choreEmojiText}>{chore.emoji}</Text>
                          </View>
                          <View style={styles.choreInfo}>
                            <Text style={[styles.choreTitle, isRejected && styles.choreTitleRejected]}>
                              {chore.title}
                            </Text>
                            <View style={styles.choreMetaRow}>
                              <View style={styles.childBadge}>
                                <Text style={styles.childEmoji}>{getChildEmoji(completion.completed_by)}</Text>
                                <Text style={styles.choreChild}>{getChildName(completion.completed_by)}</Text>
                              </View>
                              <View style={[
                                styles.chorePoints,
                                isApproved && styles.chorePointsApproved,
                              ]}>
                                <Text style={[
                                  styles.chorePointsText,
                                  isApproved && styles.chorePointsTextApproved,
                                ]}>
                                  {isApproved ? '+' : ''}{chore.points} pts
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>

                        <View style={styles.choreRight}>
                          {isApproved && (
                            <View style={styles.statusBadge}>
                              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                            </View>
                          )}
                          {isPending && (
                            <View style={[styles.statusBadge, styles.statusBadgePending]}>
                              <Ionicons name="time" size={18} color="#FFFFFF" />
                            </View>
                          )}
                          {isRejected && (
                            <View style={[styles.statusBadge, styles.statusBadgeRejected]}>
                              <Ionicons name="close" size={20} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}

        {/* Quick Add Button */}
        {activeTab === 'schedule' && (
          <TouchableOpacity
            onPress={() => router.push('/(app)/parent/create-chore')}
            style={styles.floatingAddButton}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingAddGradient}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.floatingAddText}>Create New Chore</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete Chore?"
        message="Are you sure you want to delete this chore? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDeleteChore}
        onClose={() => {
          setDeleteConfirmVisible(false);
          setChoreToDelete(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F3',
  },
  
  // ===== PREMIUM HEADER =====
  premiumHeader: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
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
    marginBottom: 20,
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
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },

  // ===== TAB SELECTOR =====
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabTextActive: {
    color: '#10B981',
  },

  content: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },

  // ===== SECTION HEADER =====
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconPurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 46,
  },

  // ===== WEEK NAVIGATION =====
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavButtonDisabled: {
    opacity: 0.5,
  },
  weekLabel: {
    alignItems: 'center',
  },
  weekLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  weekLabelHint: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 2,
  },
  
  // ===== DAY SELECTOR =====
  daySelector: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    position: 'relative',
    minHeight: 60,
  },
  dayButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  dayButtonSelectedPurple: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  dayButtonFuture: {
    opacity: 0.4,
  },
  dayButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  dayButtonTextFuture: {
    color: '#9CA3AF',
  },
  dayDateText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 2,
  },
  dayDateTextSelected: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginTop: 3,
  },
  todayDotPurple: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#8B5CF6',
    marginTop: 3,
  },
  choreBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  choreBadgeGreen: {
    backgroundColor: '#10B981',
  },
  choreBadgeSelected: {
    backgroundColor: '#FFFFFF',
  },
  choreBadgeSelectedPurple: {
    backgroundColor: '#FFFFFF',
  },
  choreBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  choreBadgeTextSelected: {
    color: '#10B981',
  },
  choreBadgeTextSelectedPurple: {
    color: '#8B5CF6',
  },
  pendingIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIndicatorSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // ===== DAY CARDS =====
  dayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
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
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.3,
  },
  dayCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dateSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  dayStats: {
    flexDirection: 'row',
    gap: 12,
  },
  dayStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  
  // ===== EMPTY STATE =====
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
    marginBottom: 12,
    textAlign: 'center',
  },
  addChoreLink: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
  },
  addChoreLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  
  // ===== CHORE CARDS =====
  choresContainer: {
    gap: 12,
  },
  choreCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FBF8F3',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  choreActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreCardCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  choreCardPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  choreCardRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    opacity: 0.7,
  },
  choreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  choreEmoji: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  choreEmojiRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  choreEmojiText: {
    fontSize: 22,
  },
  choreInfo: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  choreTitleRejected: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  choreMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  childBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childEmoji: {
    fontSize: 13,
  },
  choreChild: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  chorePoints: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chorePointsApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  chorePointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
  },
  chorePointsTextApproved: {
    color: '#10B981',
  },
  repeatDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  repeatDayBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  repeatDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  choreRight: {
    marginLeft: 8,
  },
  statusBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  statusBadgeRejected: {
    backgroundColor: '#EF4444',
    shadowColor: 'rgba(239, 68, 68, 0.3)',
  },
  
  // ===== FLOATING ADD BUTTON =====
  floatingAddButton: {
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  floatingAddGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  floatingAddText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
