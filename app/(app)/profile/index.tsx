import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Animated, Easing, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { AlertModal } from '@components/AlertModal';
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Premium Header with Sky Blue */}
        <View style={styles.premiumHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>Manage your account</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* User Profile Card */}
          <View style={styles.profileCard}>
            <PremiumCard 
              onPress={() => user?.role === 'parent' ? setEmojiPickerVisible(true) : undefined}
              style={styles.avatarWrapper}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarEmoji}>{currentEmoji}</Text>
              </LinearGradient>
              {user?.role === 'parent' && (
                <View style={styles.editBadgeContainer}>
                  <Text style={styles.editBadge}>✏️</Text>
                </View>
              )}
            </PremiumCard>
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
                    style={[styles.nameEditButton, styles.confirmButton]}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditingName(false);
                      setEditedName(user?.emoji ? user?.display_name || '' : (user?.display_name?.replace(/^[^\s]+ /, '') || ''));
                    }}
                    style={[styles.nameEditButton, styles.cancelButton]}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditingName(true)}
                style={styles.nameContainer}
              >
                <Text style={styles.name}>{user?.emoji ? (user?.display_name || 'User') : (user?.display_name?.replace(/^[^\s]+ /, '') || 'User')}</Text>
                <Ionicons name="pencil" size={16} color="#3B82F6" style={styles.editIcon} />
              </TouchableOpacity>
            )}
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role === 'parent' ? '👨‍👩‍👧 Parent' : '👶 Child'}</Text>
            </View>
          </View>

        <View style={styles.section}>
          <PremiumCard style={styles.signOutButton} onPress={handleSignOut}>
            <View style={styles.signOutButtonInner}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </View>
          </PremiumCard>
        </View>
        </View>
      </ScrollView>

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
    backgroundColor: '#FBF8F3',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  
  // ===== PREMIUM HEADER =====
  premiumHeader: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#3B82F6',
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
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  
  // Profile Card
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
    paddingTop: 24,
  },
  avatarWrapper: {
    marginBottom: 20,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(59, 130, 246, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  editBadgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  editBadge: {
    fontSize: 16,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  editIcon: {
    marginTop: 4,
  },
  nameEditContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    marginBottom: 16,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    minWidth: 200,
  },
  nameEditButtons: {
    flexDirection: 'row',
    gap: 14,
  },
  nameEditButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 14,
  },
  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3B82F6',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  signOutButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  signOutButtonInner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  signOutButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: -0.3,
  },
});
