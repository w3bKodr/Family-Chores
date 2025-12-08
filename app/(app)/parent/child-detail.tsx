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
  TextInput,
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
  const { childId, from } = useLocalSearchParams<{ childId: string; from?: string }>();
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'chores'>('overview');
  const [completeChoreModal, setCompleteChoreModal] = useState<{ visible: boolean; chore: any | null; date?: string }>({ visible: false, chore: null });

  const handleGoBack = () => {
    if (from === 'family') {
      router.replace('/(app)/family');
    } else {
      router.replace('/(app)/parent-dashboard');
    }
  };

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
      // Delete the completion row completely so it's as if it never happened
      const { error } = await supabase
        .from('chore_completions')
        .delete()
        .eq('id', completionId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Completion deleted successfully');

      // Remove from local store immediately so parent doesn't see it
      const currentCompletions = useFamilyStore.getState().choreCompletions;
      const filtered = currentCompletions.filter(c => c.id !== completionId);
      useFamilyStore.setState({ choreCompletions: filtered });

      showAlert('Rejected', 'Chore removed. Child needs to complete it again.', 'info');
    } catch (error: any) {
      console.error('Reject error:', error);
      showAlert('Error', error.message, 'error');
    }
  };

  const handleCompleteChore = async (chore: any) => {
    if (!child || !user?.id) return;
    try {
      // Use the date from the modal state (selected day), not today
      const completionDate = completeChoreModal.date || new Date().toISOString().split('T')[0];
      
      // Create a new completion record as approved
      const { error: insertError } = await supabase
        .from('chore_completions')
        .insert({
          chore_id: chore.id,
          completed_by: childId,
          completed_date: completionDate,
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Award points to child
      const { error: childError } = await supabase
        .from('children')
        .update({ points: child.points + chore.points })
        .eq('id', child.id);

      if (childError) throw childError;

      showAlert('Chore Completed!', `${chore.title} marked as done and +${chore.points} points awarded.`, 'success');
      setCompleteChoreModal({ visible: false, chore: null });
      await loadData();
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleUnapprove = async (completion: any, chore: any) => {
    if (!child) return;
    try {
      // Delete the completion entirely
      const { error: deleteError } = await supabase
        .from('chore_completions')
        .delete()
        .eq('id', completion.id);

      if (deleteError) throw deleteError;

      // Calculate new points
      const newPoints = Math.max(0, child.points - chore.points);

      // Deduct points from child
      const { error: childError } = await supabase
        .from('children')
        .update({ points: newPoints })
        .eq('id', child.id);

      if (childError) throw childError;

      // Remove from local store immediately and update points
      const currentCompletions = useFamilyStore.getState().choreCompletions;
      const filtered = currentCompletions.filter(c => c.id !== completion.id);
      useFamilyStore.setState({ choreCompletions: filtered });

      // Update child's points in the store
      const { children: storeChildren } = useFamilyStore.getState();
      const updatedChildren = storeChildren.map(c => 
        c.id === child.id ? { ...c, points: newPoints } : c
      );
      useFamilyStore.setState({ children: updatedChildren });

      showAlert('Unapproved', `Chore removed and ${chore.points} points deducted.`, 'info');
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
    
    // Get the date in YYYY-MM-DD format for this day
    const targetDate = getDateForDay(day);
    const targetDateStr = formatDateLocal(targetDate);
    
    // Get chores assigned to this child that either:
    // 1. Have this day in repeating_days (recurring chores)
    // 2. Have a scheduled_date matching this date (ad-hoc chores)
    return chores.filter(chore => 
      chore.assigned_to === childId && 
      (chore.repeating_days?.includes(day) || chore.scheduled_date === targetDateStr)
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

  const handleNameChange = async () => {
    if (!child || !editedName.trim()) {
      showAlert('Error', 'Name cannot be empty', 'error');
      return;
    }
    try {
      await updateChild(childId as string, { display_name: editedName.trim() });
      showAlert('Updated!', 'Child name updated successfully.', 'success');
      setIsEditingName(false);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const startEditingName = () => {
    if (child) {
      setEditedName(child.display_name);
      setIsEditingName(true);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Modern Compact Header */}
      <LinearGradient
        colors={['#0EA5E9', '#0284C7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.modernHeader}
      >
        <View style={styles.modernHeaderTop}>
          <TouchableOpacity 
            onPress={handleGoBack}
            style={styles.modernBackButton}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.modernNameSection}>
            {isEditingName ? (
              <View style={styles.nameEditContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  autoFocus
                  placeholder="Child's name"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  onSubmitEditing={handleNameChange}
                />
                <TouchableOpacity onPress={handleNameChange} style={styles.nameEditButton}>
                  <Ionicons name="checkmark" size={18} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsEditingName(false)} style={styles.nameEditButton}>
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={startEditingName} style={styles.nameEmojiRow}>
                <Text style={styles.modernEmoji}>{child.emoji || '👶'}</Text>
                <Text style={styles.modernName}>{child.display_name}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Total Points on Right */}
          <View style={styles.modernPointsBox}>
            <Text style={styles.modernPointsLabel}>POINTS</Text>
            <Text style={styles.modernPointsValue}>{child.points}</Text>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setSelectedTab('overview')}
            style={[styles.tab, selectedTab === 'overview' && styles.tabActive]}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedTab('chores')}
            style={[styles.tab, selectedTab === 'chores' && styles.tabActive]}
          >
            <Text style={[styles.tabText, selectedTab === 'chores' && styles.tabTextActive]}>
              Chores
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {selectedTab === 'chores' && (
          <>
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
              <PremiumCard 
                key={chore.id} 
                style={styles.choreCard}
                onPress={() => {
                  const selectedDate = formatDateLocal(getDateForDay(selectedDay));
                  setCompleteChoreModal({ visible: true, chore, date: selectedDate });
                }}
              >
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
        {dayChoresWithStatus.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No chores for {selectedDay}</Text>
            <Text style={styles.emptySubtitle}>
              {child.display_name} doesn't have any chores scheduled for this day.
            </Text>
          </View>
        )}
          </>
        )}

        {selectedTab === 'overview' && (
          <>
            {/* MODERN LUXURY STATISTICS DASHBOARD */}
            <View style={styles.modernOverviewContainer}>
              
              {/* TOP ROW: Today's Progress (2/3) + Active Chores (1/3) */}
              <View style={styles.topMetricsRow}>
                {/* Today's Progress */}
                <View style={[styles.modernKpiCard, styles.kpiCardPrimary]}>
                  <Text style={styles.kpiLabel}>Today's Progress</Text>
                  <View style={styles.kpiValueContainer}>
                    <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                      {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        return choreCompletions.filter(
                          cc => cc.completed_by === childId && cc.completed_date === today && cc.status === 'approved'
                        ).length;
                      })()}
                    </Text>
                    <Text style={styles.kpiValueLabel}>completed</Text>
                  </View>
                </View>

                {/* Active Chores */}
                <View style={[styles.modernKpiCard, styles.kpiCardSecondary]}>
                  <Text style={styles.kpiLabel}>Active Chores</Text>
                  <View style={styles.kpiValueContainer}>
                    <Text style={[styles.kpiValue, { color: '#06B6D4' }]}>
                      {(() => {
                        const today = FULL_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                        return chores.filter(c => c.assigned_to === childId && c.repeating_days?.includes(today)).length;
                      })()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* TIME-BASED STATS ROW: This Week / Month / Year */}
              <View style={styles.timeStatsRow}>
                {/* This Week */}
                <View style={[styles.modernStatCard, styles.statCardWeek]}>
                  <View style={[styles.statIconContainer, styles.statIconContainerWeek]}>
                    <Ionicons name="trending-up" size={28} color="#06B6D4" />
                  </View>
                  <Text style={styles.statValue}>
                    {(() => {
                      const weekStart = new Date();
                      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1));
                      weekStart.setHours(0, 0, 0, 0);
                      
                      return choreCompletions.filter(cc => {
                        const completionDate = new Date(cc.completed_date);
                        return cc.completed_by === childId && 
                               completionDate >= weekStart && 
                               cc.status === 'approved';
                      }).length;
                    })()}
                  </Text>
                  <Text style={styles.statLabel}>This Week</Text>
                </View>

                {/* This Month */}
                <View style={[styles.modernStatCard, styles.statCardMonth]}>
                  <View style={[styles.statIconContainer, styles.statIconContainerMonth]}>
                    <Ionicons name="calendar" size={28} color="#FF6B35" />
                  </View>
                  <Text style={styles.statValue}>
                    {(() => {
                      const monthStart = new Date();
                      monthStart.setDate(1);
                      monthStart.setHours(0, 0, 0, 0);
                      
                      return choreCompletions.filter(cc => {
                        const completionDate = new Date(cc.completed_date);
                        return cc.completed_by === childId && 
                               completionDate >= monthStart && 
                               cc.status === 'approved';
                      }).length;
                    })()}
                  </Text>
                  <Text style={styles.statLabel}>This Month</Text>
                </View>

                {/* This Year */}
                <View style={[styles.modernStatCard, styles.statCardYear]}>
                  <View style={[styles.statIconContainer, styles.statIconContainerYear]}>
                    <Ionicons name="sparkles" size={28} color="#10B981" />
                  </View>
                  <Text style={styles.statValue}>
                    {(() => {
                      const yearStart = new Date();
                      yearStart.setMonth(0);
                      yearStart.setDate(1);
                      yearStart.setHours(0, 0, 0, 0);
                      
                      return choreCompletions.filter(cc => {
                        const completionDate = new Date(cc.completed_date);
                        return cc.completed_by === childId && 
                               completionDate >= yearStart && 
                               cc.status === 'approved';
                      }).length;
                    })()}
                  </Text>
                  <Text style={styles.statLabel}>This Year</Text>
                </View>
              </View>

              {/* FULL-WIDTH ACHIEVEMENT CARD: Total Completed Ever */}
              <View style={[styles.modernAchievementCard, styles.achievementCardFull]}>
                <View style={styles.achievementHeader}>
                  <View>
                    <Text style={styles.achievementLabel}>Total Completed Ever</Text>
                    <Text style={[styles.achievementValue, { color: '#8B5CF6' }]}>
                      {choreCompletions.filter(
                        cc => cc.completed_by === childId && cc.status === 'approved'
                      ).length}
                    </Text>
                  </View>
                  <View style={[styles.achievementIconBadge, styles.iconBadgePurple]}>
                    <Ionicons name="star" size={36} color="#8B5CF6" />
                  </View>
                </View>
                <Text style={styles.achievementSubtext}>All-time achievements & milestones</Text>
              </View>
            </View>

            <View style={styles.dangerZone}>
              <Button
                title="🗑️ Remove Child from Family"
                onPress={() => setShowDeleteConfirm(true)}
                variant="danger"
                size="lg"
              />
            </View>
          </>
        )}
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

      <ConfirmModal
        visible={completeChoreModal.visible}
        onClose={() => setCompleteChoreModal({ visible: false, chore: null, date: undefined })}
        onConfirm={() => handleCompleteChore(completeChoreModal.chore)}
        title="Mark Chore Complete"
        message={`Mark "${completeChoreModal.chore?.title}" as complete for ${child?.display_name}? They will receive +${completeChoreModal.chore?.points} points.`}
        confirmText="Complete"
        cancelText="Cancel"
        type="success"
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

  // ===== MODERN HEADER =====
  modernHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modernHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernNameSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameEmojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modernEmoji: {
    fontSize: 36,
  },
  modernName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  nameTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernPointsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modernPointsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernPointsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // ===== TAB NAVIGATION =====
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 4,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabTextActive: {
    color: '#0EA5E9',
  },

  // ===== MODERN PREMIUM OVERVIEW SECTION - 2025 DESIGN =====
  modernOverviewContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 48,
    backgroundColor: '#FBF8F3',
    // Subtle gradient background
    backgroundImage: 'linear-gradient(135deg, #FBF8F3 0%, #F5F1EB 100%)',
  },

  // TOP METRICS ROW (Today's Progress + Active Chores)
  topMetricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    alignItems: 'stretch',
  },

  modernKpiCard: {
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 32,
    // Layered premium shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    // Glassmorphism effect
    opacity: 0.99,
  },

  kpiCardPrimary: {
    flex: 4, // Today's Progress takes 4/7
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },

  kpiCardSecondary: {
    flex: 3, // Active Chores takes 3/7
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
  },

  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },

  modernIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  kpiValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },

  kpiValue: {
    fontSize: 76,
    fontWeight: '900',
    lineHeight: 88,
    letterSpacing: -2,
  },

  kpiValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 2,
  },

  // TIME STATS ROW (This Week, Month, Year)
  timeStatsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 28,
  },

  modernStatCard: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: '#FFFFFF',
    // Optional: asymmetric curve with slight rotation effect (visual interest)
    overflow: 'hidden',
  },

  statCardWeek: {
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderColor: 'rgba(6, 182, 212, 0.12)',
    borderLeftColor: 'rgba(6, 182, 212, 0.3)',
    borderLeftWidth: 4,
  },

  statCardMonth: {
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
    borderColor: 'rgba(255, 107, 53, 0.12)',
    borderLeftColor: 'rgba(255, 107, 53, 0.3)',
    borderLeftWidth: 4,
  },

  statCardYear: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderColor: 'rgba(16, 185, 129, 0.12)',
    borderLeftColor: 'rgba(16, 185, 129, 0.3)',
    borderLeftWidth: 4,
  },

  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  statValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -1,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // ACHIEVEMENT CARD (Full Width) - PREMIUM STANDOUT
  modernAchievementCard: {
    borderRadius: 32,
    paddingHorizontal: 32,
    paddingVertical: 36,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
    overflow: 'hidden',
  },

  achievementCardFull: {
    width: '100%',
  },

  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  achievementLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  achievementValue: {
    fontSize: 76,
    fontWeight: '900',
    color: '#8B5CF6',
    lineHeight: 88,
    letterSpacing: -2,
  },

  achievementIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  achievementSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },

  // Icon Badge Color Variants
  iconBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },

  iconBadgeCyan: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },

  iconBadgeCoral: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderColor: 'rgba(255, 107, 53, 0.25)',
  },

  iconBadgePurple: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },

  // Stat icon container color variants
  statIconContainerWeek: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },

  statIconContainerMonth: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },

  statIconContainerYear: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },

  // Premium Card Animation Base (for PremiumCard component)
  premiumCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },

  // ===== LUXURY OVERVIEW SECTION - 2025 DESIGN AWARD =====
  luxuryOverviewContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    backgroundColor: '#FAFAF8',
  },

  // HERO STATS SECTION
  heroStatsSection: {
    marginBottom: 20,
    gap: 16,
  },

  // NEW: Top row with Today's Progress (2/3) + Active Chores (1/3)
  topRowContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    alignItems: 'stretch',
  },

  heroStatCard: {
    flex: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 24,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  heroValue: {
    fontSize: 96,
    fontWeight: '900',
    color: '#10B981',
    lineHeight: 104,
  },
  heroValueSuffix: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // QUICK STATS GRID (2 columns)
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  // QUICK STATS GRID (3 columns)
  quickStatsGrid3Column: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  quickStatCardTeal: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  quickStatCardCoral: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  quickStatCardGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  quickStatCardViolet: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  quickStatIcon: {
    marginBottom: 10,
  },
  quickStatValue: {
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 4,
    color: '#1F2937',
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },

  // DETAILED METRICS SECTION
  detailedMetricsSection: {
    gap: 16,
    marginTop: 0,
  },
  detailedMetricsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  compactFloatingCard: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  // Active Chores card: 3/7 width
  activeChoresCard: {
    flex: 3,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  // Active Chores top row with label and badge
  activeChoresTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Active Chores value row
  activeChoresValueRow: {
    justifyContent: 'center',
    marginBottom: 12,
  },
  // Active Chores number
  activeChoresValue: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  // New: Full width card for All-Time metric
  fullWidthCard: {
    flex: undefined,
  },
  compactMetricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  compactMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  compactMetricValue: {
    fontSize: 40,
    fontWeight: '900',
    lineHeight: 44,
  },
  compactMetricDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  luxurySectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: -0.4,
  },

  // FLOATING METRIC CARDS
  floatingMetricCard: {
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 32,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  floatingMetricCardCoral: {
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  floatingMetricCardTeal: {
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
  },
  floatingMetricCardGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  floatingMetricCardViolet: {
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  floatingMetricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  floatingMetricSmallLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  floatingMetricHugeValue: {
    fontSize: 72,
    fontWeight: '900',
    lineHeight: 80,
  },
  coralGradientBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tealGradientBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenGradientBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  violetGradientBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingMetricDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },

  // ===== PROGRESS SECTION =====
  progressSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  statsRowCompact: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  progressBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 5,
  },
  progressBarWeekly: {
    backgroundColor: '#10B981',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
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
  },
  nameTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  nameEditIcon: {
    marginLeft: 8,
  },
  nameEditContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  nameEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  headerSpacer: {
    width: 44,
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
    borderColor: 'rgba(245, 158, 11, 0.2)',
    backgroundColor: 'rgba(255, 251, 235, 0.6)',
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
  resubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
