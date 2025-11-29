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
import { useAuthStore } from '@lib/store/authStore';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Card } from '@components/Card';
import { RewardItem } from '@components/RewardItem';
import { AlertModal } from '@components/AlertModal';
import { ConfirmModal } from '@components/ConfirmModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';

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

export default function ParentRewardsScreen() {
  const router = useRouter();
  const { family, rewards, children, rewardClaims, getRewards, getRewardClaims, createReward, updateReward, deleteReward, approveRewardClaim, rejectRewardClaim, loading } = useFamilyStore();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [pointsRequired, setPointsRequired] = useState('50');
  const [emoji, setEmoji] = useState('🎁');
  const [showForm, setShowForm] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null);
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'rewards' | 'requests' | 'history'>('rewards');

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
        getRewards(family.id),
        getRewardClaims(family.id),
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

  const handleSaveReward = async () => {
    if (!title.trim()) {
      showAlert('Error', 'Please enter reward title', 'error');
      return;
    }

    if (!family?.id) {
      showAlert('Error', 'Family not found', 'error');
      return;
    }

    try {
      if (editingRewardId) {
        // Update existing reward
        await updateReward(editingRewardId, {
          title,
          points_required: parseInt(pointsRequired, 10),
          emoji,
        });
        showAlert('Success', 'Reward updated!', 'success');
      } else {
        // Create new reward
        await createReward({
          family_id: family.id,
          title,
          points_required: parseInt(pointsRequired, 10),
          emoji,
          image_url: null,
        });
        showAlert('Success', 'Reward created!', 'success');
      }

      setTitle('');
      setPointsRequired('50');
      setEmoji('🎁');
      setShowForm(false);
      setEditingRewardId(null);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleEditReward = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId);
    if (reward) {
      setTitle(reward.title);
      setPointsRequired(reward.points_required.toString());
      setEmoji(reward.emoji || '🎁');
      setEditingRewardId(rewardId);
      setShowForm(true);
    }
  };

  const handleCancelEdit = () => {
    setTitle('');
    setPointsRequired('50');
    setEmoji('🎁');
    setShowForm(false);
    setEditingRewardId(null);
  };

  const handleDeleteReward = async (rewardId: string) => {
    setRewardToDelete(rewardId);
    setConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!rewardToDelete) return;
    try {
      await deleteReward(rewardToDelete);
      setConfirmVisible(false);
      setRewardToDelete(null);
    } catch (error: any) {
      setConfirmVisible(false);
      showAlert('Error', error.message, 'error');
    }
  };

  // Filter claims by status
  const pendingClaims = rewardClaims.filter(c => c.status === 'pending');
  const approvedClaims = rewardClaims.filter(c => c.status === 'approved');
  const rejectedClaims = rewardClaims.filter(c => c.status === 'rejected');
  const historyClaims = [...approvedClaims, ...rejectedClaims].sort(
    (a, b) => new Date(b.approved_at || b.claimed_at).getTime() - new Date(a.approved_at || a.claimed_at).getTime()
  );

  // Helper to get reward and child info for a claim
  const getRewardForClaim = (claim: typeof rewardClaims[0]) => rewards.find(r => r.id === claim.reward_id);
  const getChildForClaim = (claim: typeof rewardClaims[0]) => children.find(c => c.id === claim.child_id);

  const handleApproveClaim = async (claimId: string) => {
    if (!user?.id) return;
    try {
      await approveRewardClaim(claimId, user.id);
      showAlert('Approved!', 'The reward has been given to the child.', 'success');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    if (!user?.id) return;
    try {
      await rejectRewardClaim(claimId, user.id);
      showAlert('Declined', 'The reward request has been declined.', 'info');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Rewards</Text>
            <Text style={styles.headerSubtitle}>Manage family rewards</Text>
          </View>
        </View>
        
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'rewards' && styles.tabActive]}
            onPress={() => setActiveTab('rewards')}
          >
            <Ionicons name="gift" size={16} color={activeTab === 'rewards' ? '#8B5CF6' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'rewards' && styles.tabTextActive]}>Rewards</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Ionicons name="time" size={16} color={activeTab === 'requests' ? '#8B5CF6' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>Requests</Text>
            {pendingClaims.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{pendingClaims.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons name="receipt" size={16} color={activeTab === 'history' ? '#8B5CF6' : 'rgba(255,255,255,0.7)'} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <>
        {showForm && (
          <View style={styles.formCard}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Emoji</Text>
              <PremiumCard
                style={styles.emojiSelector}
                onPress={() => setEmojiPickerVisible(true)}
              >
                <Text style={styles.selectedEmoji}>{emoji}</Text>
                <Text style={styles.changeLinkText}>Change</Text>
              </PremiumCard>
            </View>

            <Input
              label="Reward Title"
              placeholder="e.g., Extra gaming time"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Points Required"
              placeholder="50"
              value={pointsRequired}
              onChangeText={setPointsRequired}
              keyboardType="numeric"
            />

            <PremiumCard style={styles.primaryButton} onPress={handleSaveReward}>
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? (editingRewardId ? 'Updating...' : 'Creating...') : (editingRewardId ? 'Update Reward' : 'Create Reward')}
                </Text>
              </LinearGradient>
            </PremiumCard>

            <TouchableOpacity 
              onPress={handleCancelEdit}
              style={styles.cancelLink}
            >
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {!showForm && (
          <View style={styles.addButtonContainer}>
            <PremiumCard style={styles.primaryButton} onPress={() => setShowForm(true)}>
              <LinearGradient
                colors={['#8B5CF6', '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>+ Add Reward</Text>
              </LinearGradient>
            </PremiumCard>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          {rewards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No rewards yet</Text>
            </View>
          ) : (
            rewards.map((reward) => (
              <PremiumCard 
                key={reward.id} 
                style={styles.rewardCard}
                onPress={() => handleEditReward(reward.id)}
              >
                <View style={styles.rewardContent}>
                  <View style={styles.rewardIconContainer}>
                    <Text style={styles.rewardIcon}>{reward.emoji || '🏆'}</Text>
                  </View>
                  <View style={styles.rewardInfo}>
                    <Text style={styles.rewardTitle}>{reward.title}</Text>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.rewardPoints}>
                        {reward.points_required} points
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteReward(reward.id);
                    }}
                  >
                    <View style={styles.deleteIconContainer}>
                      <Text style={styles.deleteIcon}>×</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            ))
          )}
        </View>
          </>
        )}

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {pendingClaims.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No pending reward requests</Text>
              </View>
            ) : (
              pendingClaims.map((claim) => {
                const reward = rewards.find(r => r.id === claim.reward_id);
                const child = children.find(c => c.id === claim.child_id);
                return (
                  <View key={claim.id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <View style={styles.rewardIconContainer}>
                        <Text style={styles.rewardIcon}>{reward?.emoji || '🏆'}</Text>
                      </View>
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestRewardTitle}>{reward?.title || 'Unknown Reward'}</Text>
                        <Text style={styles.requestChildName}>{child?.display_name || 'Unknown Child'}</Text>
                      </View>
                      <View style={styles.requestPoints}>
                        <Text style={styles.requestPointsValue}>{reward?.points_required || 0}</Text>
                        <Text style={styles.requestPointsLabel}>points</Text>
                      </View>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity 
                        style={styles.approveButton}
                        onPress={() => handleApproveClaim(claim.id)}
                      >
                        <Text style={styles.approveButtonText}>✓ Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={() => handleRejectClaim(claim.id)}
                      >
                        <Text style={styles.rejectButtonText}>✕ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reward History</Text>
            {historyClaims.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No reward history yet</Text>
              </View>
            ) : (
              historyClaims.map((claim) => {
                const reward = rewards.find(r => r.id === claim.reward_id);
                const child = children.find(c => c.id === claim.child_id);
                const isApproved = claim.status === 'approved';
                return (
                  <View key={claim.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={[styles.historyIconContainer, isApproved ? styles.historyApproved : styles.historyRejected]}>
                        <Text style={styles.historyIcon}>{isApproved ? '✓' : '✕'}</Text>
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyRewardTitle}>{reward?.title || 'Unknown Reward'}</Text>
                        <Text style={styles.historyChildName}>{child?.display_name || 'Unknown Child'}</Text>
                      </View>
                      <View style={styles.historyMeta}>
                        <Text style={[styles.historyStatus, isApproved ? styles.historyStatusApproved : styles.historyStatusRejected]}>
                          {isApproved ? 'Approved' : 'Rejected'}
                        </Text>
                        <Text style={styles.historyDate}>
                          {claim.approved_at ? new Date(claim.approved_at).toLocaleDateString() : new Date(claim.claimed_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
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
        visible={confirmVisible}
        title="Delete Reward"
        message="Are you sure you want to delete this reward?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onClose={() => {
          setConfirmVisible(false);
          setRewardToDelete(null);
        }}
        type="danger"
      />

      <EmojiPickerModal
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelectEmoji={setEmoji}
        selectedEmoji={emoji}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F3',
  },
  premiumHeader: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#8B5CF6',
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
  content: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  addButtonContainer: {
    marginBottom: 24,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: -0.3,
  },
  rewardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  rewardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardIcon: {
    fontSize: 30,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  rewardPoints: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  deleteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 26,
    color: '#EF4444',
    fontWeight: '600',
    lineHeight: 26,
    marginTop: -2,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 16,
    marginVertical: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#8F92A1',
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 24,
    marginVertical: 12,
    borderRadius: 28,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  emojiSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FBF8F3',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  selectedEmoji: {
    fontSize: 48,
  },
  changeLinkText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: 'rgba(139, 92, 246, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cancelLink: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  cancelLinkText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  pendingCountBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  pendingCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    flexWrap: 'nowrap',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },
  tabBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
    padding: 18,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestRewardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  requestChildName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  requestPoints: {
    alignItems: 'flex-end',
  },
  requestPointsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  requestPointsLabel: {
    fontSize: 12,
    color: '#8F92A1',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
    padding: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  historyApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  historyRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  historyIcon: {
    fontSize: 24,
  },
  historyInfo: {
    flex: 1,
  },
  historyRewardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  historyChildName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  historyMeta: {
    alignItems: 'flex-end',
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyStatusApproved: {
    color: '#10B981',
  },
  historyStatusRejected: {
    color: '#EF4444',
  },
  historyDate: {
    fontSize: 12,
    color: '#8F92A1',
  },
});
