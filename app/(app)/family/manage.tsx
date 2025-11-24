import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Share,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { ConfirmModal } from '@components/ConfirmModal';
import { AlertModal } from '@components/AlertModal';

export default function ManageFamilyScreen() {
  const router = useRouter();
  const { family, children, joinRequests, parentJoinRequests, getJoinRequests, getChildren, approveJoinRequest, rejectJoinRequest, getParentJoinRequests, approveParentJoinRequest, rejectParentJoinRequest, generateFamilyCode, setFamily } = useFamilyStore();
  const { user, setUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [parents, setParents] = useState<any[]>([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemoveParentConfirm, setShowRemoveParentConfirm] = useState(false);
  const [parentToRemove, setParentToRemove] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
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
        getJoinRequests(family.id),
        getChildren(family.id),
        getParentJoinRequests(family.id),
        fetchParents(),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const fetchParents = async () => {
    if (!family?.id) return;
    try {
      const { data: parentsData, error } = await supabase
        .from('users')
        .select('*')
        .eq('family_id', family.id)
        .eq('role', 'parent');
      
      if (error) throw error;
      setParents(parentsData || []);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleShareCode = async () => {
    if (!family) return;

    const message = `Join my family in Family Chores! Use code: ${family.family_code}`;
    
    try {
      if (Platform.OS === 'web') {
        // For web, use Web Share API if available, otherwise copy to clipboard
        if (navigator.share) {
          await navigator.share({
            title: 'Family Chores Invite',
            text: message,
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(message);
          showAlert('Copied!', 'Family code has been copied to your clipboard. You can now share it via any messaging app.', 'success');
        }
      } else {
        // For native platforms, use React Native Share
        await Share.share({
          message,
          title: 'Family Chores Invite',
        });
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        showAlert('Error', error.message || 'Failed to share', 'error');
      }
    }
  };

  const handleUpdateFamilyName = async () => {
    if (!family?.id || !editedName.trim()) return;

    try {
      const { error } = await supabase
        .from('families')
        .update({ name: editedName.trim() })
        .eq('id', family.id);

      if (error) throw error;

      setFamily({ ...family, name: editedName.trim() });
      setIsEditingName(false);
      showAlert('Success', 'Family name updated!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      if (!user?.id) throw new Error('User not found');
      await approveJoinRequest(requestId, user.id);
      showAlert('Success', 'Request approved!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectJoinRequest(requestId);
      showAlert('Success', 'Request rejected.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleApproveParentRequest = async (requestId: string) => {
    try {
      await approveParentJoinRequest(requestId);
      await fetchParents(); // Refresh parents list
      showAlert('Success', 'Family join request approved (Parent)', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleRejectParentRequest = async (requestId: string) => {
    try {
      await rejectParentJoinRequest(requestId);
      showAlert('Success', 'Parent request rejected.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleRemoveParentPress = (parent: any) => {
    setParentToRemove(parent);
    setShowRemoveParentConfirm(true);
  };

  const handleRemoveParent = async () => {
    if (!parentToRemove || !user || !family) return;

    try {
      console.log('=== REMOVE PARENT DEBUG ===');
      console.log('Current user:', user.id, user.email);
      console.log('Family owner:', family.parent_id);
      console.log('Removing parent:', parentToRemove.id, parentToRemove.display_name);
      console.log('Is owner?', user.id === family.parent_id);
      
      // Use RPC function to bypass RLS issues
      const { data, error } = await supabase.rpc('remove_parent_from_family', {
        target_user_id: parentToRemove.id
      });

      console.log('RPC response:', { data, error });

      if (error) throw error;

      // Refresh parents list from database to ensure it's updated
      await fetchParents();

      showAlert('Success', 'Parent removed from family', 'success');
    } catch (error: any) {
      console.error('Remove parent error:', error);
      showAlert('Error', error.message || 'Failed to remove parent', 'error');
    } finally {
      setShowRemoveParentConfirm(false);
      setParentToRemove(null);
    }
  };

  const handleLeaveFamily = async () => {
    if (!user?.family_id || !user?.id) return;

    try {
      // Remove user from children table
      await supabase
        .from('children')
        .delete()
        .eq('user_id', user.id);

      // Update user's family_id to null
      const { error } = await supabase
        .from('users')
        .update({ family_id: null })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUser({ ...user, family_id: null });
      setFamily(null);

      showAlert('Success', 'You have left the family.', 'success');
      setTimeout(() => {
        router.replace('/(app)/parent');
      }, 1500);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  if (!family || user?.role !== 'parent') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>👨‍👩‍👧‍👦</Text>
            <Text style={styles.heading}>Family</Text>
          </View>

          <Card padding={16} marginVertical={12}>
            <Text style={styles.message}>
              Only parents can manage family settings.
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family</Text>
          <Text style={styles.headerSubtitle}>Manage your family settings</Text>
        </View>

        {/* Family Info Card */}
        <View style={styles.familyCard}>
          <TouchableOpacity
            onPress={handleShareCode}
            style={styles.shareButton}
          >
            <Text style={styles.shareButtonText}>Share Family</Text>
            <View style={styles.shareIconCircle}>
              <Ionicons name="share-outline" size={16} color="#3B82F6" />
            </View>
          </TouchableOpacity>
          <View style={styles.familyIconContainer}>
            <Text style={styles.familyIcon}>👨‍👩‍👧‍👦</Text>
          </View>
          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                placeholder="Family name"
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.nameEditButtons}>
                <TouchableOpacity
                  onPress={handleUpdateFamilyName}
                  style={styles.nameEditButton}
                >
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsEditingName(false)}
                  style={styles.nameEditButton}
                >
                  <Ionicons name="close" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setEditedName(family.name);
                setIsEditingName(true);
              }}
              style={styles.nameContainer}
            >
              <Text style={styles.familyName}>{family.name}</Text>
              <Ionicons name="pencil" size={18} color="#6B7280" style={styles.editIcon} />
            </TouchableOpacity>
          )}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Family Code</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{family.family_code}</Text>
            </View>
          </View>
        </View>

        {/* Parents Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👨‍👩 Parents</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{parents.length}</Text>
            </View>
          </View>
          {parents.length > 0 && (
            <View style={styles.parentsGrid}>
              {parents.map((parent) => {
                const isOwner = parent.id === family.parent_id;
                const isSelf = parent.id === user?.id;
                const canRemove = user?.id === family.parent_id && !isSelf;
                
                return (
                  <View key={parent.id} style={styles.parentCard}>
                    <View style={styles.parentAvatar}>
                      <Text style={styles.parentAvatarText}>
                        {parent.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.parentInfo}>
                      <Text style={styles.parentName}>{parent.display_name}</Text>
                      <View style={styles.parentBadges}>
                        {isOwner && (
                          <View style={styles.ownerBadge}>
                            <Text style={styles.ownerBadgeText}>👑 Owner</Text>
                          </View>
                        )}
                        {isSelf && !isOwner && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {canRemove && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveParentPress(parent)}
                      >
                        <Text style={styles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Children Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👶 Children</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{children.length}</Text>
            </View>
          </View>
          
          {children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👶</Text>
              <Text style={styles.emptyTitle}>No children yet</Text>
              <Text style={styles.emptySubtitle}>Add your first child to get started</Text>
              <Button
                title="+ Add Child"
                onPress={() => router.push('/(app)/parent/add-child')}
                variant="primary"
                size="lg"
              />
            </View>
          ) : (
            <View style={styles.childrenGrid}>
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/parent/child-detail',
                      params: { childId: child.id },
                    })
                  }
                  style={styles.childCard}
                >
                  <View style={styles.childIcon}>
                    <Text style={styles.childEmoji}>{child.emoji || '👶'}</Text>
                  </View>
                  <Text style={styles.childName}>{child.display_name}</Text>
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsText}>⭐ {child.points}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => router.push('/(app)/parent/add-child')}
                style={styles.addChildCard}
              >
                <View style={styles.addChildIcon}>
                  <Text style={styles.addChildEmoji}>➕</Text>
                </View>
                <Text style={styles.addChildText}>Add Child</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pending requests moved to the centralized Pending Requests page */}

        {/* Join Requests */}
        {joinRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔔 Join Requests</Text>
              <View style={[styles.countBadge, styles.requestBadge]}>
                <Text style={styles.countText}>{joinRequests.length}</Text>
              </View>
            </View>
            {joinRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <View style={styles.requestIconCircle}>
                    <Text style={styles.requestEmoji}>👤</Text>
                  </View>
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestEmail}>{request.user_email}</Text>
                    <Text style={styles.requestTime}>Pending approval</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    onPress={() => handleApproveRequest(request.id)}
                    style={styles.approveButton}
                  >
                    <Text style={styles.approveText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRejectRequest(request.id)}
                    style={styles.rejectButton}
                  >
                    <Text style={styles.rejectText}>✗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Danger Zone */}
        <View style={[styles.section, styles.dangerZone]}>
          <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
          <TouchableOpacity
            onPress={() => setShowLeaveConfirm(true)}
            style={styles.leaveButton}
          >
            <Text style={styles.leaveButtonText}>Leave Family</Text>
            <Text style={styles.leaveButtonIcon}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveFamily}
        title="Leave Family"
        message="Are you sure you want to leave this family? You will lose access to all chores and data."
        confirmText="Leave"
        cancelText="Cancel"
        type="danger"
      />

      <ConfirmModal
        visible={showRemoveParentConfirm}
        onClose={() => {
          setShowRemoveParentConfirm(false);
          setParentToRemove(null);
        }}
        onConfirm={handleRemoveParent}
        title="Remove Parent?"
        message={`Are you sure you want to remove ${parentToRemove?.display_name} from the family?`}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  
  // Family Card
  familyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  shareIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  familyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  familyIcon: {
    fontSize: 40,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  familyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  editIcon: {
    marginTop: 4,
  },
  nameEditContainer: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 8,
    paddingHorizontal: 16,
    minWidth: 200,
    marginBottom: 12,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  nameEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 1,
  },
  
  // Section
  section: {
    marginBottom: 32,
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
    color: '#1F2937',
  },
  countBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  requestBadge: {
    backgroundColor: '#FEE2E2',
  },
  
  // Parents Grid
  parentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  parentCard: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  parentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  parentAvatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  parentInfo: {
    alignItems: 'center',
  },
  parentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  parentBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  ownerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  youBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Children Grid
  childrenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  childIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  childEmoji: {
    fontSize: 28,
  },
  childName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  pointsBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  addChildCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addChildIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addChildEmoji: {
    fontSize: 28,
  },
  addChildText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  
  // Request Card
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestEmoji: {
    fontSize: 20,
  },
  requestDetails: {
    flex: 1,
  },
  requestEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  
  // Danger Zone
  dangerZone: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 12,
  },
  leaveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  leaveButtonIcon: {
    fontSize: 18,
    color: '#DC2626',
  },
  
  // Non-parent view
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
