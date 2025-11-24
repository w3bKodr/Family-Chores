import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { AlertModal } from '@components/AlertModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';

export default function CreateChore() {
  const router = useRouter();
  const { choreId, edit } = useLocalSearchParams<{ choreId?: string; edit?: string }>();
  const { user } = useAuthStore();
  const { family, children, chores, createChore, updateChore, loading } = useFamilyStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('10');
  const [emoji, setEmoji] = useState('✓');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

  const isEditMode = edit === 'true' && choreId;

  // Load existing chore data if in edit mode
  useEffect(() => {
    if (isEditMode) {
      const existingChore = chores.find(c => c.id === choreId);
      if (existingChore) {
        setTitle(existingChore.title);
        setDescription(existingChore.description || '');
        setPoints(existingChore.points.toString());
        setEmoji(existingChore.emoji);
        setSelectedChild(existingChore.assigned_to);
        setSelectedDays(existingChore.repeating_days);
      }
    }
  }, [isEditMode, choreId, chores]);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCreateChore = async () => {
    if (!title.trim()) {
      showAlert('Error', 'Please enter a chore title', 'error');
      return;
    }

    if (!selectedChild) {
      showAlert('Error', 'Please select a child', 'error');
      return;
    }

    if (selectedDays.length === 0) {
      showAlert('Error', 'Please select at least one day', 'error');
      return;
    }

    if (!family?.id) {
      showAlert('Error', 'Family not found', 'error');
      return;
    }

    try {
      const choreData = {
        family_id: family.id,
        assigned_to: selectedChild,
        title,
        description: description || null,
        points: parseInt(points, 10),
        emoji,
        repeating_days: selectedDays,
      };

      if (isEditMode && choreId) {
        await updateChore(choreId, choreData);
        showAlert('Success', 'Chore updated successfully!', 'success');
      } else {
        await createChore(choreData);
        showAlert('Success', 'Chore created successfully!', 'success');
      }

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>{isEditMode ? '✏️' : '➕'}</Text>
          </View>
          <Text style={styles.title}>{isEditMode ? 'Edit Chore' : 'Create Chore'}</Text>
          <Text style={styles.subtitle}>
            {isEditMode ? 'Update the task details' : 'Add a new task for your child'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose Emoji</Text>
          <TouchableOpacity
            style={styles.emojiSelector}
            onPress={() => setShowEmojiPicker(true)}
          >
            <Text style={styles.selectedEmojiLarge}>{emoji}</Text>
            <Text style={styles.changeLinkText}>Tap to change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Input
            label="Chore Title"
            placeholder="e.g., Clean bedroom"
            value={title}
            onChangeText={setTitle}
          />

          <Input
            label="Description"
            placeholder="Optional details"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Input
            label="Points"
            placeholder="10"
            value={points}
            onChangeText={setPoints}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assign to Child</Text>
          <View style={styles.childList}>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                onPress={() => setSelectedChild(child.id)}
                style={[
                  styles.childItem,
                  selectedChild === child.id && styles.childItemSelected,
                ]}
              >
                <View style={styles.childInfo}>
                  <View style={styles.childAvatar}>
                    <Text>{child.emoji || '👶'}</Text>
                  </View>
                  <Text
                    style={[
                      styles.childName,
                      selectedChild === child.id && styles.childNameSelected,
                    ]}
                  >
                    {child.display_name}
                  </Text>
                </View>
                {selectedChild === child.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Repeat on Days</Text>
          <View style={styles.daysGrid}>
            {DAYS.map((day) => (
              <TouchableOpacity
                key={day}
                onPress={() => toggleDay(day)}
                style={[
                  styles.dayButton,
                  selectedDays.includes(day) && styles.dayButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    selectedDays.includes(day) && styles.dayTextSelected,
                  ]}
                >
                  {day.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title={loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Chore' : 'Create Chore')}
          onPress={handleCreateChore}
          disabled={loading}
          variant="primary"
          size="lg"
        />

        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="ghost"
          size="lg"
        />
      </ScrollView>

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
        onSelectEmoji={setEmoji}
        selectedEmoji={emoji}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#D1FAE5',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  emojiSelector: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedEmojiLarge: {
    fontSize: 72,
    marginBottom: 8,
  },
  changeLinkText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  childList: {
    gap: 12,
  },
  childItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childItemSelected: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  childNameSelected: {
    color: '#92400E',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  dayButtonSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
});