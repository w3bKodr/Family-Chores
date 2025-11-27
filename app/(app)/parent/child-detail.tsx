import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { ConfirmModal } from '@components/ConfirmModal';
import { AlertModal } from '@components/AlertModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const { width } = Dimensions.get('window');
const MAX_CONTENT_WIDTH = 600; // Max width for tablet/iPad
const contentWidth = Math.min(width - 40, MAX_CONTENT_WIDTH);
const DAY_BUTTON_WIDTH = (contentWidth - 24) / 7; // Account for gaps between buttons

// Premium Card with press animation
const PremiumCard = ({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
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

export default function ChildDetail() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { user } = useAuthStore();
  const { children, chores, choreCompletions, getChores, getChoreCompletions, getChildren, approveCompletion, rejectCompletion, updateChild } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedDay, setSelectedDay] = useState(FULL_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const child = children.find((c) => c.id === childId);

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    if (!child?.family_id) return;
    try {
      await Promise.all([
        getChores(child.family_id),
        getChoreCompletions(child.family_id),
        getChildren(child.family_id),
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

  const handleApprove = async (completionId: string) => {
    if (!user?.id) return;
    try {
      await approveCompletion(completionId, user.id);
      showAlert('Approved!', 'Chore approved and points awarded.', 'success');
      await loadData();
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleReject = async (completionId: string) => {
    try {
      await rejectCompletion(completionId);
      showAlert('Rejected', 'Chore completion rejected.', 'error');
      await loadData();
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleUnapprove = async (completion: any, chore: any) => {
    if (!child) return;
    try {
      // Update completion status back to pending
      const { error: completionError } = await supabase
        .from('chore_completions')
        .update({ status: 'pending', approved_by: null, approved_at: null })
        .eq('id', completion.id);

      if (completionError) throw completionError;

      // Deduct points from child
      const { error: childError } = await supabase
        .from('children')
        .update({ points: Math.max(0, child.points - chore.points) })
        .eq('id', child.id);

      if (childError) throw childError;

      showAlert('Unapproved', 'Chore moved back to pending and points deducted.', 'info');
      await loadData();
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

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

  // Get the date for a specific day in the current week
  const getDateForDay = (dayName: string) => {
    const dayIndex = FULL_DAYS.indexOf(dayName);
    const weekStart = getStartOfWeek(new Date());
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    return targetDate;
  };

  // Get scheduled chores for this child on a given day
  const getChoresForDay = (day: string) => {
    if (!child) return [];
    
    // Get chores assigned to this child that have this day in repeating_days
    return chores.filter(chore => 
      chore.assigned_to === childId && 
      chore.repeating_days?.includes(day)
    );
  };

  // Get completion for a specific chore on a specific date
  const getCompletionForChore = (choreId: string, day: string) => {
    const targetDate = getDateForDay(day);
    const targetDateStr = formatDateLocal(targetDate);
    
    return choreCompletions.find(cc => {
      // Handle both ISO format and date-only format from database
      const completionDateStr = cc.completed_date.includes('T') 
        ? cc.completed_date.split('T')[0] 
        : cc.completed_date;
      
      return cc.chore_id === choreId && 
        cc.completed_by === childId &&
        completionDateStr === targetDateStr;
    });
  };

  // Get chores with their completion status for a day
  const getChoresWithStatus = (day: string) => {
    const dayChores = getChoresForDay(day);
    
    return dayChores.map(chore => {
      const completion = getCompletionForChore(chore.id, day);
      return { chore, completion };
    });
  };

  const getPendingCountForDay = (day: string) => {
    return getChoresWithStatus(day).filter(item => item.completion?.status === 'pending').length;
  };

  const handleDeleteChild = async () => {
    if (!child) return;

    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId);

      if (error) throw error;

      if (child.family_id) {
        const { getChildren } = useFamilyStore.getState();
        await getChildren(child.family_id);
      }

      router.push('/(app)/parent');
      
      setTimeout(() => {
        showAlert('Success', `${child.display_name} has been removed from the family.`, 'success');
      }, 100);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleEmojiChange = async (emoji: string) => {
    if (!child) return;
    try {
      await updateChild(childId as string, { emoji });
      showAlert('Updated!', 'Child emoji updated successfully.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  if (!child) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.error}>Child not found</Text>
          <Button
            title="Go Back"
            onPress={() => router.push('/(app)/parent')}
            variant="primary"
            size="lg"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const dayChoresWithStatus = getChoresWithStatus(selectedDay);
  const notStartedChores = dayChoresWithStatus.filter(item => !item.completion);
  const pendingChores = dayChoresWithStatus.filter(item => item.completion?.status === 'pending');
  const approvedChores = dayChoresWithStatus.filter(item => item.completion?.status === 'approved');
  const rejectedChores = dayChoresWithStatus.filter(item => item.completion?.status === 'rejected');

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{child.display_name}</Text>
          <TouchableOpacity 
            onPress={() => setShowEmojiPicker(true)}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {/* Child Avatar & Points */}
        <View style={styles.profileSection}>
          <Pressable 
            onPress={() => setShowEmojiPicker(true)}
            style={styles.avatarContainer}
          >
            <View style={styles.avatarOuter}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>{child.emoji || '👶'}</Text>
              </View>
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="#FFFFFF" />
            </View>
          </Pressable>
          
          {/* Points Card */}
          <View style={styles.pointsCard}>
            <Text style={styles.pointsLabel}>TOTAL POINTS</Text>
            <View style={styles.pointsRow}>
              <Text style={styles.starIcon}>⭐</Text>
              <Text style={styles.pointsValue}>{child.points}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Day Selector */}
        <View style={styles.daySelectorContainer}>
          <View style={styles.daySelectorCard}>
            <View style={styles.dayButtonsRow}>
              {DAYS.map((day, index) => {
                const fullDay = FULL_DAYS[index];
                const pendingCount = getPendingCountForDay(fullDay);
                const isSelected = fullDay === selectedDay;
                const isToday = fullDay === FULL_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                      isToday && !isSelected && styles.dayButtonToday,
                    ]}
                    onPress={() => setSelectedDay(fullDay)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayButtonText, 
                      isSelected && styles.dayButtonTextSelected,
                      isToday && !isSelected && styles.dayButtonTextToday,
                    ]}>
                      {day}
                    </Text>
                    {pendingCount > 0 && (
                      <View style={[styles.dayBadge, isSelected && styles.dayBadgeSelected]}>
                        <Text style={[styles.dayBadgeText, isSelected && styles.dayBadgeTextSelected]}>{pendingCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Not Started Chores */}
        {notStartedChores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconContainer, styles.sectionIconBlue]}>
                  <Ionicons name="list" size={18} color="#0EA5E9" />
                </View>
                <Text style={styles.sectionTitle}>To Do</Text>
              </View>
              <View style={[styles.countBadge, styles.countBadgeBlue]}>
                <Text style={[styles.countText, styles.countTextBlue]}>{notStartedChores.length}</Text>
              </View>
            </View>
            
            {notStartedChores.map(({ chore }) => (
              <PremiumCard key={chore.id} style={styles.choreCard}>
                <View style={styles.choreInfo}>
                  <View style={[styles.choreEmoji, styles.choreEmojiNotStarted]}>
                    <Text style={styles.choreEmojiText}>{chore.emoji}</Text>
                  </View>
                  <View style={styles.choreDetails}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    {chore.description && (
                      <Text style={styles.choreDescription}>{chore.description}</Text>
                    )}
                    <View style={styles.chorePoints}>
                      <Text style={styles.chorePointsText}>+{chore.points} points</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.notStartedBadge}>
                  <Ionicons name="ellipse-outline" size={20} color="#8F92A1" />
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {/* Pending Approvals */}
        {pendingChores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionIconContainer}>
                  <Ionicons name="time" size={18} color="#F59E0B" />
                </View>
                <Text style={styles.sectionTitle}>Pending Approval</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{pendingChores.length}</Text>
              </View>
            </View>
            
            {pendingChores.map(({ completion, chore }) => (
              <PremiumCard key={completion!.id} style={styles.choreCard}>
                <View style={styles.choreInfo}>
                  <View style={styles.choreEmoji}>
                    <Text style={styles.choreEmojiText}>{chore.emoji}</Text>
                  </View>
                  <View style={styles.choreDetails}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    {chore.description && (
                      <Text style={styles.choreDescription}>{chore.description}</Text>
                    )}
                    <View style={styles.chorePoints}>
                      <Text style={styles.chorePointsText}>+{chore.points} points</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.approvalButtons}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(completion!.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(completion!.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {/* Approved Chores */}
        {approvedChores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconContainer, styles.sectionIconGreen]}>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                </View>
                <Text style={styles.sectionTitle}>Approved</Text>
              </View>
              <View style={[styles.countBadge, styles.countBadgeGreen]}>
                <Text style={[styles.countText, styles.countTextGreen]}>{approvedChores.length}</Text>
              </View>
            </View>
            
            {approvedChores.map(({ completion, chore }) => (
              <PremiumCard key={completion!.id} style={[styles.choreCard, styles.choreCardApproved]}>
                <View style={styles.choreInfo}>
                  <View style={[styles.choreEmoji, styles.choreEmojiApproved]}>
                    <Text style={styles.choreEmojiText}>{chore.emoji}</Text>
                  </View>
                  <View style={styles.choreDetails}>
                    <Text style={styles.choreTitle}>{chore.title}</Text>
                    <View style={[styles.chorePoints, styles.chorePointsApprovedBg]}>
                      <Text style={[styles.chorePointsText, styles.chorePointsApproved]}>
                        +{chore.points} points
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unapproveButton}
                  onPress={() => handleUnapprove(completion, chore)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={20} color="#FF6B35" />
                </TouchableOpacity>
              </PremiumCard>
            ))}
          </View>
        )}

        {/* Rejected Chores */}
        {rejectedChores.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconContainer, styles.sectionIconRed]}>
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </View>
                <Text style={styles.sectionTitle}>Rejected</Text>
              </View>
            </View>
            
            {rejectedChores.map(({ completion, chore }) => (
              <PremiumCard key={completion!.id} style={[styles.choreCard, styles.choreCardRejected]}>
                <View style={styles.choreInfo}>
                  <View style={[styles.choreEmoji, styles.choreEmojiRejected]}>
                    <Text style={styles.choreEmojiText}>{chore.emoji}</Text>
                  </View>
                  <View style={styles.choreDetails}>
                    <Text style={[styles.choreTitle, styles.choreTitleRejected]}>{chore.title}</Text>
                  </View>
                </View>
                <View style={styles.rejectedBadge}>
                  <Ionicons name="close" size={20} color="#EF4444" />
                </View>
              </PremiumCard>
            ))}
          </View>
        )}

        {dayChoresWithStatus.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No chores for {selectedDay}</Text>
            <Text style={styles.emptySubtitle}>
              {child.display_name} doesn't have any chores scheduled for this day.
            </Text>
          </View>
        )}

        <View style={styles.dangerZone}>
          <Button
            title="🗑️ Remove Child from Family"
            onPress={() => setShowDeleteConfirm(true)}
            variant="danger"
            size="lg"
          />
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteChild}
        title="Remove Child"
        message={`Are you sure you want to remove ${child.display_name} from the family? This will delete all their chores and progress.`}
        confirmText="Remove"
        cancelText="Cancel"
        type="danger"
      />

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />

      <EmojiPickerModal
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelectEmoji={handleEmojiChange}
        selectedEmoji={child.emoji}
        childMode={true}
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
    paddingBottom: 120,
  },
  premiumHeader: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 42,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0EA5E9',
  },
  pointsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starIcon: {
    fontSize: 20,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  childAvatarEmojiLarge: {
    fontSize: 56,
  },
  editEmojiButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0EA5E9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  childName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
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
    borderColor: 'rgba(14, 165, 233, 0.08)',
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
    backgroundColor: '#0EA5E9',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayButtonToday: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
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
    color: '#0EA5E9',
    fontWeight: '700',
  },
  dayBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
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
  dayBadgeTextSelected: {
    color: '#0EA5E9',
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  sectionIconRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  sectionIconBlue: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  countBadgeBlue: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  countTextGreen: {
    color: '#10B981',
  },
  countTextBlue: {
    color: '#0EA5E9',
  },
  premiumCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  choreCard: {
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choreCardApproved: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  choreCardRejected: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(254, 242, 242, 0.8)',
    opacity: 0.7,
  },
  choreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  choreEmoji: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(251, 248, 243, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  choreEmojiApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  choreEmojiRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  choreEmojiNotStarted: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(14, 165, 233, 0.15)',
  },
  choreEmojiText: {
    fontSize: 28,
  },
  choreDetails: {
    flex: 1,
  },
  choreTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  choreTitleRejected: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  choreDescription: {
    fontSize: 13,
    color: '#8F92A1',
    marginBottom: 6,
  },
  chorePoints: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chorePointsApprovedBg: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  chorePointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
  },
  chorePointsApproved: {
    color: '#10B981',
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveButtonText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rejectButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButtonText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  unapproveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  rejectedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notStartedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(143, 146, 161, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8F92A1',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
    fontWeight: '500',
  },
  dangerZone: {
    paddingHorizontal: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.1)',
    marginTop: 24,
  },
  error: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 20,
  },
});
