import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { AlertModal } from '@components/AlertModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';

// Premium Card with press animation
const PremiumCard = ({ children, style, onPress }: { children: React.ReactNode; style?: any; onPress?: () => void }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 100,
      easing: Easing.out(Easing.ease),
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

  if (onPress) {
    return (
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.premiumCard, style, { transform: [{ scale: scaleAnim }] }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return <View style={[styles.premiumCard, style]}>{children}</View>;
};

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
        router.replace('/(app)/family/manage');
      }, 1500);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.push('/(app)/family/manage')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add Child</Text>
            <Text style={styles.headerSubtitle}>Add a new family member</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={['#FF6B35', '#FF8F5A']}
              style={styles.iconGradient}
            >
              <Text style={styles.icon}>{selectedEmoji}</Text>
            </LinearGradient>
          </View>
          <Text style={styles.subtitle}>
            Add a child to your family without creating a separate account
          </Text>
        </View>

        <PremiumCard>
          <Text style={styles.sectionLabel}>Choose Avatar</Text>
          <Pressable
            style={styles.emojiSelector}
            onPress={() => setShowEmojiPicker(true)}
          >
            <Text style={styles.selectedEmoji}>{selectedEmoji}</Text>
            <Text style={styles.changeLinkText}>Tap to change</Text>
          </Pressable>

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
        </PremiumCard>

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
    backgroundColor: '#FBF8F3',
  },
  premiumHeader: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 56,
  },
  subtitle: {
    fontSize: 15,
    color: '#8F92A1',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
    lineHeight: 22,
  },
  premiumCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 24,
    borderRadius: 28,
    marginBottom: 24,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emojiSelector: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(251, 248, 243, 0.8)',
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  selectedEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  changeLinkText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.15)',
  },
  infoEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8B5A3C',
    lineHeight: 20,
    fontWeight: '500',
  },
});
