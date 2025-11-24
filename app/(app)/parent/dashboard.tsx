import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { AlertModal } from '@components/AlertModal';
import { Ionicons } from '@expo/vector-icons';

export default function ParentDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family, children, choreCompletions, joinRequests, parentJoinRequests, getFamily, getChildren, getChoreCompletions, getParentJoinRequests, cancelParentJoinRequest } = useFamilyStore();
  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  useEffect(() => {
    if (user?.family_id) {
      loadData();
    } else if (user?.id) {
      checkPendingRequest();
    }
  }, [user]);

  useEffect(() => {
    console.log('Parent join requests updated:', parentJoinRequests);
  }, [parentJoinRequests]);

  const loadData = async () => {
    if (!user?.family_id) return;
    try {
      await Promise.all([
        getFamily(user.family_id),
        getChildren(user.family_id),
        getChoreCompletions(user.family_id),
        getParentJoinRequests(user.family_id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const checkPendingRequest = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('parent_join_requests')
        .select(`
          *,
          families(name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking pending request:', error);
      }
      
      if (data) {
        setPendingRequest(data);
      }
    } catch (error: any) {
      console.error('Error checking pending request:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (user?.family_id) {
      await loadData();
    } else {
      await checkPendingRequest();
    }
    setRefreshing(false);
  };

  const getPendingCountForChild = (childId: string) => {
    return choreCompletions.filter(
      cc => cc.completed_by === childId && cc.status === 'pending'
    ).length;
  };

  const handleCancelRequest = async () => {
    if (!pendingRequest?.id) return;
    try {
      await cancelParentJoinRequest(pendingRequest.id);
      setPendingRequest(null);
      showAlert('Success', 'Your join request has been cancelled.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  if (!user?.family_id) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.emptyScrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.emptyHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>👨‍👩‍👧</Text>
            </View>
            <Text style={styles.title}>Family Chores</Text>
            <Text style={styles.subtitle}>
              {pendingRequest 
                ? 'Your join request is pending approval' 
                : 'Create a new family or join an existing one'}
            </Text>
          </View>

          {pendingRequest ? (
            <View style={styles.pendingRequestCard}>
              <View style={styles.pendingIconCircle}>
                <Text style={styles.pendingEmoji}>⏳</Text>
              </View>
              <Text style={styles.pendingTitle}>Request Pending</Text>
              <Text style={styles.pendingMessage}>
                You've requested to join <Text style={styles.pendingFamilyName}>{pendingRequest.families?.name}</Text>
              </Text>
              <Text style={styles.pendingSubtext}>
                Waiting for the family owner to approve your request. You'll be notified once approved.
              </Text>
              <Button
                title="Cancel Request"
                onPress={handleCancelRequest}
                variant="outline"
                size="lg"
                style={{ marginTop: 20 }}
              />
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => router.push('/(app)/parent/create-family')}
              >
                <View style={[styles.optionIconCircle, styles.optionCreate]}>
                  <Text style={styles.optionEmoji}>➕</Text>
                </View>
                <Text style={styles.optionTitle}>Create Family</Text>
                <Text style={styles.optionDescription}>
                  Start a new family and invite members
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionCard}
                onPress={() => router.push('/(app)/parent/join-family')}
              >
                <View style={[styles.optionIconCircle, styles.optionJoin]}>
                  <Text style={styles.optionEmoji}>🏡</Text>
                </View>
                <Text style={styles.optionTitle}>Join Family</Text>
                <Text style={styles.optionDescription}>
                  Enter a family code to join
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user?.display_name}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/parent/pending-requests')}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={20} color="#374151" />
            { (parentJoinRequests?.length || 0) + (joinRequests?.length || 0) > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{(parentJoinRequests?.length || 0) + (joinRequests?.length || 0)}</Text>
              </View>
            ) }
          </TouchableOpacity>
        </View>

        {family && (
          <View style={styles.familyPanel}>
            <View style={styles.familyPanelHeader}>
              <Text style={styles.familyPanelTitle}>Chore Tracker</Text>
              <Text style={styles.familyPanelSubtitle}>
                {children.length} {children.length === 1 ? 'child' : 'children'}
              </Text>
            </View>

            {/* Children Section */}
            <View style={styles.childrenSection}>
              {children.length === 0 ? (
                <View style={styles.emptyChildrenCard}>
                  <Text style={styles.emptyChildrenEmoji}>👶</Text>
                  <Text style={styles.emptyChildrenText}>No children yet</Text>
                  <Button
                    title="+ Add Child"
                    onPress={() => router.push('/(app)/family/manage')}
                    variant="primary"
                    size="sm"
                  />
                </View>
              ) : (
                <View style={styles.childrenGrid}>
                  {children.map((child) => {
                    const pendingCount = getPendingCountForChild(child.id);
                    return (
                      <TouchableOpacity
                        key={child.id}
                        style={styles.childGridCard}
                        onPress={() =>
                          router.push({
                            pathname: '/(app)/parent/child-detail',
                            params: { childId: child.id },
                          })
                        }
                      >
                        <View style={styles.childAvatarContainer}>
                          <View style={styles.childAvatar}>
                            <Text style={styles.childAvatarEmoji}>{child.emoji || '👶'}</Text>
                          </View>
                          {pendingCount > 0 && (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.childGridName}>{child.display_name}</Text>
                        <View style={styles.childPointsBadge}>
                          <Text style={styles.childPointsText}>⭐ {child.points}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              onPress={() => router.push('/(app)/parent/create-chore')}
              style={styles.actionCard}
            >
              <View style={[styles.actionIconCircle, styles.actionGreen]}>
                <Text style={styles.actionEmoji}>➕</Text>
              </View>
              <Text style={styles.actionTitle}>New Chore</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/(app)/parent/rewards')}
              style={styles.actionCard}
            >
              <View style={[styles.actionIconCircle, styles.actionPurple]}>
                <Text style={styles.actionEmoji}>🎁</Text>
              </View>
              <Text style={styles.actionTitle}>Rewards</Text>
            </TouchableOpacity>
          </View>

          {/* Pending Requests card removed — notification bell in the header replaces it */}

          <TouchableOpacity 
            onPress={() => router.push('/(app)/parent/weekly-view')}
            style={styles.wideActionCard}
          >
            <View style={[styles.actionIconCircle, styles.actionOrange]}>
              <Text style={styles.actionEmoji}>📅</Text>
            </View>
            <View style={styles.wideActionContent}>
              <Text style={styles.wideActionTitle}>Weekly Schedule</Text>
              <Text style={styles.wideActionSubtitle}>View all chores for the week</Text>
            </View>
          </TouchableOpacity>

          {children.length > 0 && (
            <TouchableOpacity 
              onPress={() => router.push('/(app)/parent/switch-to-child')}
              style={styles.wideActionCard}
            >
              <View style={[styles.actionIconCircle, styles.actionBlue]}>
                <Text style={styles.actionEmoji}>🔄</Text>
              </View>
              <View style={styles.wideActionContent}>
                <Text style={styles.wideActionTitle}>Switch to Child Mode</Text>
                <Text style={styles.wideActionSubtitle}>View and complete chores as your child</Text>
              </View>
            </TouchableOpacity>
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
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  optionsContainer: {
    gap: 16,
    width: '100%',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionCreate: {
    backgroundColor: '#D1FAE5',
  },
  optionJoin: {
    backgroundColor: '#E9D5FF',
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  familyPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  familyPanelHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  familyPanelTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  familyPanelSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  childrenSection: {
    marginTop: 0,
  },
  emptyChildrenCard: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyChildrenEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyChildrenText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  childrenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  childGridCard: {
    width: '31%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  childAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarEmoji: {
    fontSize: 32,
  },
  pendingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  childGridName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  childPointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  childPointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  familyCard: {
    backgroundColor: '#FF6B6B',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  familyLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
    marginBottom: 4,
  },
  familyName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  familyCodeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  familyCodeText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  familyCodeBold: {
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  childEmoji: {
    fontSize: 24,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  childPoints: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  actionsSection: {
    paddingHorizontal: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 16,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionGreen: {
    backgroundColor: '#D1FAE5',
  },
  actionPurple: {
    backgroundColor: '#E9D5FF',
  },
  actionOrange: {
    backgroundColor: '#FED7AA',
  },
  actionBlue: {
    backgroundColor: '#BFDBFE',
  },
  actionRed: {
    backgroundColor: '#FEE2E2',
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  wideActionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  pendingRequestAlert: {
    borderColor: '#FCA5A5',
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  pendingRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestCountBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  requestCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  wideActionContent: {
    marginLeft: 16,
    flex: 1,
  },
  wideActionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  wideActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  pendingRequestCard: {
    backgroundColor: '#FFFBEB',
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
    width: '100%',
  },
  pendingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pendingEmoji: {
    fontSize: 40,
  },
  pendingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 12,
  },
  pendingMessage: {
    fontSize: 16,
    color: '#78350F',
    textAlign: 'center',
    marginBottom: 12,
  },
  pendingFamilyName: {
    fontWeight: '700',
  },
  pendingSubtext: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 20,
  },
});

