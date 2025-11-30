import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { supabase } from '@lib/supabase/client';
import { AlertModal } from '@components/AlertModal';
import { EmojiPickerModal } from '@components/EmojiPickerModal';
import { PinInputModal } from '@components/PinInputModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function ChildProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { children, getChildren, family, getFamily, verifyParentPin, hasParentPin } = useFamilyStore();
  const [child, setChild] = useState<any>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState('👶');
  const [showPinModal, setShowPinModal] = useState(false);
  const [hasPinSet, setHasPinSet] = useState(false);
  
  // Track if data has been loaded to prevent infinite loops
  const dataLoadedRef = useRef(false);
  const familyIdRef = useRef<string | null>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  // Load active child when screen is focused (not just on mount)
  useFocusEffect(
    React.useCallback(() => {
      const loadChild = async () => {
        const childId = await AsyncStorage.getItem('active_child_id');
        setActiveChildId(childId);
        
        // Immediately set child if children are already loaded
        if (childId && children.length > 0) {
          const activeChild = children.find((c) => c.id === childId);
          if (activeChild) {
            setChild(activeChild);
            setCurrentEmoji(activeChild.emoji || '👶');
          }
        }
      };
      loadChild();
    }, [children])
  );

  // Fetch family data if not already loaded - only trigger on family_id change
  useEffect(() => {
    if (user?.family_id && !family) {
      getFamily(user.family_id);
    }
  }, [user?.family_id]);

  // Fetch children when family is available and check PIN status - only on family ID change
  useEffect(() => {
    if (family?.id && family.id !== familyIdRef.current) {
      familyIdRef.current = family.id;
      if (!dataLoadedRef.current) {
        dataLoadedRef.current = true;
        getChildren(family.id);
      }
      checkPinStatus();
    }
  }, [family?.id]);

  const checkPinStatus = async () => {
    if (family?.id) {
      const hasPin = await hasParentPin(family.id);
      setHasPinSet(hasPin);
    }
  };

  // Set child when activeChildId or children change
  useEffect(() => {
    if (children.length > 0 && activeChildId) {
      const activeChild = children.find((c) => c.id === activeChildId);
      if (activeChild) {
        setChild(activeChild);
        setCurrentEmoji(activeChild.emoji || '👶');
      }
    } else if (children.length > 0 && user?.id && !activeChildId) {
      const userChild = children.find((c) => c.user_id === user.id);
      if (userChild) {
        setChild(userChild);
        setCurrentEmoji(userChild.emoji || '👶');
      }
    }
  }, [activeChildId, children, user?.id]);

  const loadActiveChild = async () => {
    const childId = await AsyncStorage.getItem('active_child_id');
    setActiveChildId(childId);
  };

  const handleEmojiSelect = async (emoji: string) => {
    try {
      if (!child?.id) throw new Error('Child not found');
      
      const { error } = await supabase
        .from('children')
        .update({ emoji })
        .eq('id', child.id);

      if (error) throw error;

      // Refresh children data
      if (family?.id) {
        await getChildren(family.id);
      }
      
      setCurrentEmoji(emoji);
      showAlert('Success', 'Avatar updated!', 'success');
      setEmojiPickerVisible(false);
    } catch (error: any) {
      console.error('Emoji update error:', error);
      showAlert('Error', error.message || 'Failed to update avatar', 'error');
    }
  };

  const handleExitChildMode = async () => {
    // If PIN is set, require PIN verification
    if (hasPinSet) {
      setShowPinModal(true);
    } else {
      // No PIN set, exit directly
      await AsyncStorage.removeItem('active_child_id');
      router.replace('/(app)/parent-dashboard');
    }
  };

  const handlePinSubmit = async (pin: string) => {
    // Ensure we have a family id (family may not be loaded yet). Try fallback to
    // the authenticated user's family_id and fetch family if needed.
    const familyId = family?.id ?? user?.family_id;
    if (!familyId) {
      showAlert('Error', 'Family data not available. Please try again.', 'error');
      return;
    }

    if (!family?.id && user?.family_id) {
      try {
        await getFamily(user.family_id);
      } catch (err) {
        // ignore — verification will still run against familyId
      }
    }

    const isValid = await verifyParentPin(familyId, pin);
    if (isValid) {
      setShowPinModal(false);
      // Delay navigation to allow modal to close first
      setTimeout(async () => {
        await AsyncStorage.removeItem('active_child_id');
        router.replace('/(app)/parent-dashboard');
      }, 100);
    } else {
      showAlert('Incorrect PIN', 'The PIN you entered is incorrect.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Premium Header */}
        <View style={styles.premiumHeader}>
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Manage your settings</Text>
          </LinearGradient>
        </View>

        <View style={styles.contentContainer}>
          {/* Avatar Card */}
          <View style={styles.avatarCard}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={() => setEmojiPickerVisible(true)}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarEmoji}>{currentEmoji}</Text>
              </LinearGradient>
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.childName}>{child?.display_name || 'Loading...'}</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>⭐ {child?.points || 0} points</Text>
            </View>
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>My Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{child?.points || 0}</Text>
                <Text style={styles.statLabel}>Points Earned</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Ionicons name="gift" size={24} color="#8B5CF6" />
                </View>
                <Text style={styles.statValue}>🏆</Text>
                <Text style={styles.statLabel}>Keep Going!</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <PremiumCard
              style={styles.actionCard}
              onPress={() => setEmojiPickerVisible(true)}
            >
              <View style={styles.actionContent}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="happy" size={24} color="#3B82F6" />
                </View>
                <View style={styles.actionText}>
                  <Text style={styles.actionTitle}>Change Avatar</Text>
                  <Text style={styles.actionSubtitle}>Pick a new emoji</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </PremiumCard>

            <PremiumCard
              style={[styles.actionCard, styles.exitCard]}
              onPress={handleExitChildMode}
            >
              <View style={styles.actionContent}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="exit-outline" size={24} color="#EF4444" />
                </View>
                <View style={styles.actionText}>
                  <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Exit Child Mode</Text>
                  <Text style={styles.actionSubtitle}>Return to parent view</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#EF4444" />
              </View>
            </PremiumCard>
          </View>
        </View>
      </ScrollView>

      <EmojiPickerModal
        visible={emojiPickerVisible}
        onClose={() => setEmojiPickerVisible(false)}
        onSelectEmoji={handleEmojiSelect}
        selectedEmoji={currentEmoji}
        childMode={true}
      />

      <PinInputModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={handlePinSubmit}
        title="Enter PIN"
        description="Enter your parent PIN to exit child mode"
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
  scrollContent: {
    paddingBottom: 100,
  },
  premiumHeader: {
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  avatarCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarEmoji: {
    fontSize: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  childName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  pointsBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  actionsSection: {
    gap: 12,
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  exitCard: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
});
