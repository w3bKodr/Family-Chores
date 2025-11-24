import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { AlertModal } from '@components/AlertModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';

export default function AddChild() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { family, addChild, loading } = useFamilyStore();
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👶');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

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

  const handleAddChild = async () => {
    if (!displayName.trim()) {
      showAlert('Error', 'Please enter a name for the child', 'error');
      return;
    }

    if (!family?.id || !user?.id) {
      showAlert('Error', 'Family not found', 'error');
      return;
    }

    try {
      // Create a guest child without a user_id (null)
      await addChild(family.id, displayName.trim(), null, selectedEmoji);
      showAlert('Success', `${displayName} has been added to the family!`, 'success');
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
            <Text style={styles.icon}>{selectedEmoji}</Text>
          </View>
          <Text style={styles.title}>Add Child</Text>
          <Text style={styles.subtitle}>
            Add a child to your family without creating a separate account
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Choose Avatar</Text>
          <TouchableOpacity
            style={styles.emojiSelector}
            onPress={() => setShowEmojiPicker(true)}
          >
            <Text style={styles.selectedEmoji}>{selectedEmoji}</Text>
            <Text style={styles.changeLinkText}>Tap to change</Text>
          </TouchableOpacity>

          <Input
            label="Child's Name"
            placeholder="e.g., Emma, Noah, Olivia"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoEmoji}>💡</Text>
            <Text style={styles.infoText}>
              This child won't have their own login. You can switch to their view from your account to manage their chores.
            </Text>
          </View>
        </View>

        <Button
          title={loading ? 'Adding...' : 'Add Child'}
          onPress={handleAddChild}
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
        onSelectEmoji={setSelectedEmoji}
        selectedEmoji={selectedEmoji}
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
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    backgroundColor: '#FFF4E6',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8F92A1',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  emojiSelector: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  selectedEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  changeLinkText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    fontWeight: '500',
  },
});
