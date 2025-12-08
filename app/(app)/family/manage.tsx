import React, { useEffect, useState, useRef } from 'react';
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
  Animated,
  Easing,
  Pressable,
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { ConfirmModal } from '@components/ConfirmModal';
import { AlertModal } from '@components/AlertModal';

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

// Separate child card component so hooks are called in a stable order.
const ChildCard = ({
  child,
  index,
  reorderMode,
  draggedItem,
  setDraggedItem,
  reorderedChildren,
  handleDragStart,
  handleDropOnChild,
  router,
}: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = draggedItem === child.id;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => reorderMode,
      onMoveShouldSetPanResponder: () => reorderMode && isDragging,
      onPanResponderGrant: () => {
        if (reorderMode) {
          handleDragStart(child.id);
        }
      },
      onPanResponderMove: isDragging
        ? Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })
        : undefined,
      onPanResponderRelease: (e, gesture) => {
        if (!isDragging) return;

        pan.flattenOffset();

        // Calculate which position we're over
        const cardWidth = 170;
        const cardHeight = 180;
        const offsetX = Math.round(gesture.dx / cardWidth);
        const offsetY = Math.round(gesture.dy / cardHeight);

        const cols = 2;
        const currentRow = Math.floor(index / cols);
        const currentCol = index % cols;

        const newCol = Math.max(0, Math.min(1, currentCol + offsetX));
        const newRow = Math.max(0, currentRow + offsetY);
        const newIndex = Math.min(
          reorderedChildren.length - 1,
          Math.max(0, newRow * cols + newCol)
        );

        if (newIndex !== index) {
          handleDropOnChild(index, newIndex);
        }

        setDraggedItem(null);

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.childCardWrapper,
        isDragging && {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          zIndex: 1000,
        },
      ]}
      {...(reorderMode ? panResponder.panHandlers : {})}
    >
      <TouchableOpacity
        onPress={() => {
          if (reorderMode) {
            if (!draggedItem) {
              handleDragStart(child.id);
            } else if (draggedItem === child.id) {
              setDraggedItem(null);
            } else {
              const fromIndex = reorderedChildren.findIndex((c: any) => c.id === draggedItem);
              const toIndex = index;
              handleDropOnChild(fromIndex, toIndex);
              setDraggedItem(null);
            }
          } else {
            router.push({
              pathname: '/(app)/parent/child-detail',
              params: { childId: child.id, from: 'family' },
            });
          }
        }}
        style={[
          styles.childCard,
          isDragging && styles.childCardDragging,
          reorderMode && !isDragging && draggedItem && styles.childCardDropTarget,
        ]}
        activeOpacity={reorderMode ? 1 : 0.7}
      >
        <View style={styles.childIcon}>
          <Text style={styles.childEmoji}>{child.emoji || '👶'}</Text>
        </View>
        <Text style={styles.childName}>{child.display_name}</Text>
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>⭐ {child.points}</Text>
        </View>

        {reorderMode && !isDragging && draggedItem && (
          <View style={styles.dropZoneOverlay}>
            <Text style={styles.dropZoneText}>Drop here</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ManageFamilyScreen() {
  const router = useRouter();
  const { family, children, joinRequests, parentJoinRequests, getJoinRequests, getChildren, approveJoinRequest, rejectJoinRequest, getParentJoinRequests, approveParentJoinRequest, rejectParentJoinRequest, generateFamilyCode, setFamily, parents, getParents, reorderChildren } = useFamilyStore();
  const { user, setUser } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showRemoveParentConfirm, setShowRemoveParentConfirm] = useState(false);
  const [parentToRemove, setParentToRemove] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedChildren, setReorderedChildren] = useState<any[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragAnimValues] = useState(
    new Map<string, Animated.Value>()
  );

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const enterReorderMode = () => {
    setReorderedChildren([...children]);
    setReorderMode(true);
  };

  const handleDragStart = (childId: string) => {
    setDraggedItem(childId);
    const anim = dragAnimValues.get(childId) || new Animated.Value(0);
    dragAnimValues.set(childId, anim);
    
    Animated.timing(anim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleDragEnd = async () => {
    if (!family?.id) return;
    
    try {
      // Update all children with their new order positions
      for (let i = 0; i < reorderedChildren.length; i++) {
        const child = reorderedChildren[i];
        if (child.order !== i) {
          await reorderChildren(family.id, child.id, i);
        }
      }
      
      setReorderMode(false);
      setDraggedItem(null);
      setReorderedChildren([]);
      dragAnimValues.clear();
      await getChildren(family.id);
      showAlert('Success', 'Child order updated!', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleDropOnChild = (draggedIndex: number, targetIndex: number) => {
    if (draggedIndex === targetIndex) return;
    
    const newOrder = [...reorderedChildren];
    const [draggedChild] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedChild);
    setReorderedChildren(newOrder);
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setDraggedItem(null);
    setReorderedChildren([]);
    dragAnimValues.clear();
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
        getParents(family.id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  // Parents are now part of the family store; use getParents to refresh

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
      // Refresh parents list from store
      if (family?.id) await getParents(family.id);
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
      if (family?.id) await getParents(family.id);

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
    const isParent = user?.role === 'parent';
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.notParentContainer}>
            <View style={styles.notParentIconCircle}>
              <Text style={styles.notParentIcon}>�</Text>
            </View>
            <Text style={styles.notParentTitle}>Family</Text>
            <Text style={styles.notParentSubtitle}>
              {isParent
                ? 'You aren’t in a family yet. Create a family or join one with a code.'
                : 'Only parents can manage family settings.'}
            </Text>

            <Card padding={20} marginVertical={16} style={styles.notParentCard}>
              <Text style={styles.message}>
                {isParent
                  ? 'Create a new family to start assigning chores, or join an existing family using a family code.'
                  : 'If you are a parent, ask your partner to invite you or create a family.'}
              </Text>

              {isParent && (
                <View style={styles.notParentActions}>
                  <Button
                    title="Create Family"
                    onPress={() => router.push('/(app)/parent/create-family')}
                    variant="primary"
                    size="md"
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Join Family"
                    onPress={() => router.push('/(app)/parent/join-family')}
                    variant="outline"
                    size="md"
                    style={{ flex: 1 }}
                  />
                </View>
              )}
            </Card>
          </View>
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
        {/* Premium Header with Orange Gradient */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Family</Text>
              <Text style={styles.headerSubtitle}>Manage your family settings</Text>
            </View>
            <TouchableOpacity
              onPress={handleShareCode}
              style={styles.premiumNotificationButton}
            >
              <Ionicons name="share-social" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Family Info Card */}
        <View style={styles.familyCard}>
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
          <View style={styles.parentsGrid}>
            {parents.map((parent) => {
              const isOwner = parent.id === family.parent_id;
              const isSelf = parent.id === user?.id;
              const canRemove = user?.id === family.parent_id && !isSelf;
              
              return (
                <View key={parent.id} style={styles.parentCard}>
                  <View style={styles.parentAvatar}>
                    <Text style={styles.parentAvatarText}>
                      {parent.emoji || parent.display_name.charAt(0)}
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
            
            {/* Invite Parent Card */}
            <View style={styles.inviteParentCard}>
              <View style={styles.inviteParentIcon}>
                <Text style={styles.inviteParentEmoji}>👋</Text>
              </View>
              <Text style={styles.inviteParentTitle}>Invite a Parent</Text>
              <Text style={styles.inviteParentText}>
                Have them create an account, tap "Join Family", and enter the family code shown above.
              </Text>
            </View>
          </View>
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
            <View>
              {/* Reorder Mode Button/Controls */}
              {!reorderMode ? (
                <TouchableOpacity
                  onPress={enterReorderMode}
                  style={styles.reorderButton}
                >
                  <Ionicons name="swap-vertical" size={20} color="#10B981" />
                  <Text style={styles.reorderButtonText}>Reorder Children</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.reorderModeInfo}>
                  <Text style={styles.reorderInfoText}>👆 Long press and drag to reorder</Text>
                  <TouchableOpacity onPress={handleDragEnd} style={styles.saveButton}>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelReorder} style={styles.cancelButton}>
                    <Ionicons name="close" size={18} color="#EF4444" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Children Grid */}
              <View style={styles.childrenGrid}>
                {(reorderMode ? reorderedChildren : children).map((child, index) => (
                  <ChildCard
                    key={child.id}
                    child={child}
                    index={index}
                    reorderMode={reorderMode}
                    draggedItem={draggedItem}
                    setDraggedItem={setDraggedItem}
                    reorderedChildren={reorderedChildren}
                    handleDragStart={handleDragStart}
                    handleDropOnChild={handleDropOnChild}
                    router={router}
                  />
                ))}
                <TouchableOpacity
                  onPress={() => !reorderMode && router.push('/(app)/parent/add-child')}
                  style={[styles.addChildCard, reorderMode && styles.disabledCard]}
                  disabled={reorderMode}
                >
                  <View style={styles.addChildIcon}>
                    <Text style={styles.addChildEmoji}>➕</Text>
                  </View>
                  <Text style={styles.addChildText}>Add Child</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#FBF8F3',
  },
  content: {
    paddingBottom: 100,
  },
  
  // ===== PREMIUM HEADER =====
  premiumHeader: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#EF4444',
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
  
  // Not Parent View
  notParentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 100,
  },
  notParentIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  notParentIcon: {
    fontSize: 40,
  },
  notParentTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  notParentSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    maxWidth: 420,
    lineHeight: 24,
  },
  notParentCard: {
    width: '100%',
    maxWidth: 640,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  notParentActions: {
    flexDirection: 'row',
    marginTop: 12,
    width: '100%',
  },
  
  // Family Info Card
  familyCard: {
    backgroundColor: 'rgba(254, 226, 226, 0.6)',
    borderRadius: 28,
    padding: 28,
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    shadowColor: 'rgba(239, 68, 68, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
    position: 'relative',
  },
  shareButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    display: 'none',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    display: 'none',
  },
  shareIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'none',
  },
  familyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  familyIcon: {
    fontSize: 44,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  familyName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  editIcon: {
    marginTop: 4,
  },
  nameEditContainer: {
    width: '100%',
    marginBottom: 18,
    alignItems: 'center',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
    paddingBottom: 10,
    paddingHorizontal: 16,
    minWidth: 200,
    marginBottom: 14,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 14,
  },
  nameEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeContainer: {
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  codeBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  codeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF6B35',
    letterSpacing: 2,
  },
  
  // Section
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  countText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  requestBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  
  // Parents Grid
  parentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  parentCard: {
    width: '47%',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
    position: 'relative',
  },
  parentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  parentAvatarText: {
    color: '#8B5CF6',
    fontSize: 30,
    fontWeight: '700',
  },
  parentInfo: {
    alignItems: 'center',
  },
  parentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  parentBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  ownerBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  youBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Empty State
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  // Children Grid
  childrenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  childCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  childIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  childEmoji: {
    fontSize: 30,
  },
  childName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  pointsBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  addChildCard: {
    backgroundColor: '#FBF8F3',
    borderRadius: 24,
    padding: 20,
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderStyle: 'dashed',
  },
  addChildIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  addChildEmoji: {
    fontSize: 30,
  },
  addChildText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Reorder Styles
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
    gap: 8,
  },
  reorderButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  reorderModeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 16,
    gap: 8,
  },
  reorderInfoText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#10B981',
    borderRadius: 8,
    gap: 4,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    gap: 4,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  childCardWrapper: {
    width: '47%',
  },
  childCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  childCardDragging: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    borderColor: '#10B981',
    borderWidth: 2,
  },
  dropZoneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  disabledCard: {
    opacity: 0.4,
  },
  
  // Invite Parent Card
  inviteParentCard: {
    backgroundColor: '#FBF8F3',
    borderRadius: 24,
    padding: 20,
    width: '47%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderStyle: 'dashed',
  },
  inviteParentIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  inviteParentEmoji: {
    fontSize: 24,
  },
  inviteParentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  inviteParentText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  inviteCodeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inviteCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1,
  },
  
  // Request Card
  requestCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  requestEmoji: {
    fontSize: 22,
  },
  requestDetails: {
    flex: 1,
  },
  requestEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  requestTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  approveText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(239, 68, 68, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  rejectText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  
  // Danger Zone
  dangerZone: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
  },
  dangerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  leaveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  leaveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.3,
  },
  leaveButtonIcon: {
    fontSize: 20,
    color: '#DC2626',
  },
  
  // Non-parent view
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
  },
});
