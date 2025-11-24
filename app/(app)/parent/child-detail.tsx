import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
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

  const getCompletionsForDay = (day: string) => {
    if (!child) return [];
    
    const getDayOfWeek = (dateString: string) => {
      const date = new Date(dateString);
      const dayIndex = date.getDay();
      return FULL_DAYS[dayIndex === 0 ? 6 : dayIndex - 1];
    };
    
    return choreCompletions
      .filter(cc => {
        if (cc.completed_by !== childId) return false;
        const completionDay = getDayOfWeek(cc.completed_date);
        return completionDay === day;
      })
      .map(cc => {
        const chore = chores.find(c => c.id === cc.chore_id);
        return { completion: cc, chore };
      })
      .filter(item => item.chore);
  };

  const getPendingCountForDay = (day: string) => {
    return getCompletionsForDay(day).filter(item => item.completion.status === 'pending').length;
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

  const dayCompletions = getCompletionsForDay(selectedDay);
  const pendingCompletions = dayCompletions.filter(item => item.completion.status === 'pending');
  const approvedCompletions = dayCompletions.filter(item => item.completion.status === 'approved');
  const rejectedCompletions = dayCompletions.filter(item => item.completion.status === 'rejected');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.push('/(app)/parent')}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <View style={styles.childHeader}>
            <TouchableOpacity 
              onPress={() => setShowEmojiPicker(true)}
              style={styles.childAvatarLarge}
            >
              <Text style={styles.childAvatarEmojiLarge}>{child.emoji || '👶'}</Text>
              <View style={styles.editEmojiButton}>
                <Text style={styles.editEmojiIcon}>✏️</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.childName}>{child.display_name}</Text>
            <View style={styles.pointsCard}>
              <Text style={styles.pointsLabel}>Total Points</Text>
              <Text style={styles.pointsValue}>⭐ {child.points}</Text>
            </View>
          </View>
        </View>

        {/* Responsive Day Selector */}
        <View style={styles.daySelectorContainer}>
          <View style={styles.daySelectorWrapper}>
            <View style={styles.daySelector}>
              {DAYS.map((day, index) => {
                const fullDay = FULL_DAYS[index];
                const pendingCount = getPendingCountForDay(fullDay);
                const isSelected = fullDay === selectedDay;
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      isSelected && styles.dayButtonSelected,
                      { width: DAY_BUTTON_WIDTH },
                    ]}
                    onPress={() => setSelectedDay(fullDay)}
                  >
                    <Text style={[styles.dayButtonText, isSelected && styles.dayButtonTextSelected]}>
                      {day}
                    </Text>
                    {pendingCount > 0 && (
                      <View style={styles.dayBadge}>
                        <Text style={styles.dayBadgeText}>{pendingCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Pending Approvals */}
        {pendingCompletions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⏳ Pending Approval</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{pendingCompletions.length}</Text>
              </View>
            </View>
            
            {pendingCompletions.map(({ completion, chore }) => (
              <View key={completion.id} style={styles.choreCard}>
                <View style={styles.choreInfo}>
                  <View style={styles.choreEmoji}>
                    <Text style={styles.choreEmojiText}>{chore!.emoji}</Text>
                  </View>
                  <View style={styles.choreDetails}>
                    <Text style={styles.choreTitle}>{chore!.title}</Text>
                    {chore!.description && (
                      <Text style={styles.choreDescription}>{chore!.description}</Text>
                    )}
                    <View style={styles.chorePoints}>
                      <Text style={styles.chorePointsText}>+{chore!.points} points</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.approvalButtons}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(completion.id)}
                  >
                    <Text style={styles.approveButtonText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(completion.id)}
                  >
                    <Text style={styles.rejectButtonText}>✗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Approved Chores */}
        {approvedCompletions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✅ Approved</Text>
              <View style={[styles.countBadge, styles.countBadgeGreen]}>
                <Text style={[styles.countText, styles.countTextGreen]}>{approvedCompletions.length}</Text>
              </View>
            </View>
            
            {approvedCompletions.map(({ completion, chore }) => (
              <View key={completion.id} style={[styles.choreCard, styles.choreCardApproved]}>
                <View style={styles.choreInfo}>
                  <View style={[styles.choreEmoji, styles.choreEmojiApproved]}>
                    <Text style={styles.choreEmojiText}>{chore!.emoji}</Text>
                  </View>
                  <View style={styles.choreDetails}>
                    <Text style={styles.choreTitle}>{chore!.title}</Text>
                    <View style={styles.chorePoints}>
                      <Text style={[styles.chorePointsText, styles.chorePointsApproved]}>
                        +{chore!.points} points
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unapproveButton}
                  onPress={() => handleUnapprove(completion, chore)}
                >
                  <Text style={styles.unapproveButtonText}>↺</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Rejected Chores */}
        {rejectedCompletions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>❌ Rejected</Text>
            </View>
            
            {rejectedCompletions.map(({ completion, chore }) => (
              <View key={completion.id} style={[styles.choreCard, styles.choreCardRejected]}>
                <View style={styles.choreInfo}>
                  <View style={[styles.choreEmoji, styles.choreEmojiRejected]}>
                    <Text style={styles.choreEmojiText}>{chore!.emoji}</Text>
                  </View>
                  <View style={styles.choreDetails}>
                    <Text style={[styles.choreTitle, styles.choreTitleRejected]}>{chore!.title}</Text>
                  </View>
                </View>
                <Text style={styles.rejectedBadge}>✗</Text>
              </View>
            ))}
          </View>
        )}

        {dayCompletions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No chores for {selectedDay}</Text>
            <Text style={styles.emptySubtitle}>
              {child.display_name} hasn't completed any chores on this day yet.
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
    backgroundColor: '#F8F9FE',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  childHeader: {
    alignItems: 'center',
  },
  childAvatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
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
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F8F9FE',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editEmojiIcon: {
    fontSize: 16,
  },
  childName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  pointsCard: {
    backgroundColor: '#6366F1',
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 52,
  },
  daySelectorContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  daySelectorWrapper: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dayButtonSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  dayButtonTextSelected: {
    color: '#FFFFFF',
  },
  dayBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#F8F9FE',
  },
  dayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  countBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countBadgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  countTextGreen: {
    color: '#10B981',
  },
  choreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  choreCardApproved: {
    borderColor: '#D1FAE5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOpacity: 0.08,
  },
  choreCardRejected: {
    borderColor: '#FFE5E5',
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  choreEmojiApproved: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  choreEmojiRejected: {
    backgroundColor: '#FFE5E5',
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
  },
  choreTitleRejected: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  choreDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  chorePoints: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chorePointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  chorePointsApproved: {
    color: '#059669',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rejectButtonText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  approvedBadge: {
    fontSize: 32,
    color: '#10B981',
  },
  unapproveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  unapproveButtonText: {
    fontSize: 20,
    color: '#92400E',
    fontWeight: '700',
  },
  rejectedBadge: {
    fontSize: 32,
    color: '#EF4444',
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
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8F92A1',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  dangerZone: {
    paddingHorizontal: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 24,
  },
  error: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 20,
  },
});
