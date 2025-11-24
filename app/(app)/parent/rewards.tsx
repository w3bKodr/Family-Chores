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
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Card } from '@components/Card';
import { RewardItem } from '@components/RewardItem';
import { AlertModal } from '@components/AlertModal';
import { ConfirmModal } from '@components/ConfirmModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';

export default function RewardsScreen() {
  const router = useRouter();
  const { family, rewards, children, getRewards, createReward, updateReward, deleteReward, loading } = useFamilyStore();
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
      await getRewards(family.id);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.headerContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🎁</Text>
          </View>
          <Text style={styles.heading}>Rewards</Text>
          <Text style={styles.subtitle}>Manage family rewards</Text>
        </View>

        {showForm && (
          <Card padding={20} marginVertical={12} backgroundColor="#FFFFFF">
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Emoji</Text>
              <TouchableOpacity
                style={styles.emojiSelector}
                onPress={() => setEmojiPickerVisible(true)}
              >
                <Text style={styles.selectedEmoji}>{emoji}</Text>
                <Text style={styles.changeLinkText}>Change</Text>
              </TouchableOpacity>
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

            <Button
              title={loading ? (editingRewardId ? 'Updating...' : 'Creating...') : (editingRewardId ? 'Update Reward' : 'Create Reward')}
              onPress={handleSaveReward}
              disabled={loading}
              variant="primary"
              size="md"
            />

            <Button
              title="Cancel"
              onPress={handleCancelEdit}
              variant="outline"
              size="md"
            />
          </Card>
        )}

        {!showForm && (
          <View style={styles.addButtonContainer}>
            <Button
              title="+ Add Reward"
              onPress={() => setShowForm(true)}
              variant="primary"
              size="lg"
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          {rewards.length === 0 ? (
            <Card padding={16} marginVertical={8}>
              <Text style={styles.emptyText}>No rewards yet</Text>
            </Card>
          ) : (
            rewards.map((reward) => (
              <View key={reward.id} style={styles.rewardCard}>
                <TouchableOpacity
                  style={styles.rewardContent}
                  onPress={() => handleEditReward(reward.id)}
                  activeOpacity={0.7}
                >
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
                </TouchableOpacity>
              </View>
            ))
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
    backgroundColor: '#F8F9FE',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  icon: {
    fontSize: 40,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8F92A1',
    fontWeight: '500',
  },
  addButtonContainer: {
    marginBottom: 24,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    marginLeft: 4,
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  rewardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rewardIcon: {
    fontSize: 28,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardPoints: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  deleteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 24,
    color: '#FF6B6B',
    fontWeight: '600',
    lineHeight: 24,
    marginTop: -2,
  },
  emptyText: {
    fontSize: 15,
    color: '#8F92A1',
    textAlign: 'center',
    paddingVertical: 32,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emojiSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedEmoji: {
    fontSize: 48,
  },
  changeLinkText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
