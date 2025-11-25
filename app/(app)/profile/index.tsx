import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { AlertModal } from '@components/AlertModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, setUser } = useAuthStore();
  const { family } = useFamilyStore();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  // Use emoji field if available (after migration), fall back to parsing display_name (before migration)
  const [currentEmoji, setCurrentEmoji] = useState(user?.emoji || user?.display_name?.charAt(0) || '👤');
  const [isEditingName, setIsEditingName] = useState(false);
  // Use display_name directly if emoji is separate, otherwise strip emoji prefix
  const [editedName, setEditedName] = useState(user?.emoji ? user?.display_name || '' : (user?.display_name?.replace(/^[^\s]+ /, '') || ''));

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    try {
      if (!user?.id) throw new Error('User ID not found');
      
      // Extract current name from display_name (remove emoji prefix if present)
      const currentName = user?.display_name?.replace(/^[^\s]+ /, '') || 'Parent';
      
      const { data, error } = await supabase.rpc('update_user_profile', { 
        p_emoji: emoji,
        p_display_name: currentName
      });

      if (error) throw error;

      // Fetch updated user data from database
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update auth store and local state
      setUser(updatedUser);
      setCurrentEmoji(emoji);
      showAlert('Success', 'Avatar updated!', 'success');
      setEmojiPickerVisible(false);
    } catch (error: any) {
      console.error('Emoji update error:', error);
      showAlert('Error', error.message || 'Failed to update avatar', 'error');
    }
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) {
      showAlert('Error', 'Name cannot be empty', 'error');
      return;
    }

    try {
      if (!user?.id) throw new Error('User ID not found');
      
      const emoji = currentEmoji;
      
      const { data, error } = await supabase.rpc('update_user_profile', { 
        p_emoji: emoji,
        p_display_name: editedName.trim()
      });

      if (error) throw error;

      // Fetch updated user data from database
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update auth store and local state
      setUser(updatedUser);
      showAlert('Success', 'Name updated!', 'success');
      setIsEditingName(false);
    } catch (error: any) {
      console.error('Name update error:', error);
      showAlert('Error', error.message || 'Failed to update name', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => user?.role === 'parent' && setEmojiPickerVisible(true)}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarEmoji}>{currentEmoji}</Text>
            {user?.role === 'parent' && <Text style={styles.editBadge}>✏️</Text>}
          </TouchableOpacity>
          {isEditingName ? (
            <View style={styles.nameEditContainer}>
              <TextInput
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                autoFocus
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
              />
              <View style={styles.nameEditButtons}>
                <TouchableOpacity
                  onPress={handleUpdateName}
                  style={styles.nameEditButton}
                >
                  <Ionicons name="checkmark" size={20} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingName(false);
                    setEditedName(user?.emoji ? user?.display_name || '' : (user?.display_name?.replace(/^[^\s]+ /, '') || ''));
                  }}
                  style={styles.nameEditButton}
                >
                  <Ionicons name="close" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditingName(true)}
              style={styles.nameContainer}
            >
              <Text style={styles.name}>{user?.emoji ? (user?.display_name || 'User') : (user?.display_name?.replace(/^[^\s]+ /, '') || 'User')}</Text>
              <Ionicons name="pencil" size={16} color="#6B7280" style={styles.editIcon} />
            </TouchableOpacity>
          )}
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === 'parent' ? '👨‍👩‍👧 Parent' : '👶 Child'}</Text>
          </View>
        </View>

        {family && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family</Text>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Family Name</Text>
              <Text style={styles.cardValue}>{family.name}</Text>
              <Text style={styles.cardLabel}>Family Code</Text>
              <Text style={styles.cardValue}>{family.family_code}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="danger"
            size="lg"
          />
        </View>
      </View>

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />

      <EmojiPickerModal
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelectEmoji={handleEmojiSelect}
        selectedEmoji={currentEmoji}
        parentMode={true}
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
    flex: 1,
    content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    fontSize: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  editIcon: {
    marginTop: 4,
  },
  nameEditContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 12,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    minWidth: 200,
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
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
});
