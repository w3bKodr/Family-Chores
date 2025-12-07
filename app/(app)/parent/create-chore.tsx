import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
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

export default function CreateChore() {
  const router = useRouter();
  const { choreId, edit } = useLocalSearchParams<{ choreId?: string; edit?: string }>();
  const { user } = useAuthStore();
  const { family, children, chores, createChore, updateChore, loading } = useFamilyStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('1');
  const [emoji, setEmoji] = useState('✓');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const scrollViewRef = useRef<ScrollView>(null);

  const isEditMode = edit === 'true' && choreId;

  // Scroll to top when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

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
    } else {
      // Reset form when creating a new chore
      setTitle('');
      setDescription('');
      setPoints('1');
      setEmoji('✓');
      setSelectedChild(null);
      setSelectedDays([]);
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
        router.replace('/(app)/parent-chores');
      }, 1500);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Green Header */}
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.replace('/(app)/parent-chores')}
            style={styles.headerBackButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Chore' : 'Create Chore'}</Text>
            <Text style={styles.headerSubtitle}>
              {isEditMode ? 'Update the task details' : 'Add a new task for your child'}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Choose Emoji</Text>
          <PremiumCard
            style={styles.emojiSelector}
            onPress={() => setShowEmojiPicker(true)}
          >
            <Text style={styles.selectedEmojiLarge}>{emoji}</Text>
            <Text style={styles.changeLinkText}>Tap to change</Text>
          </PremiumCard>
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
            placeholder="1"
            value={points}
            onChangeText={setPoints}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assign to Child</Text>
          <View style={styles.childList}>
            {children.map((child) => (
              <PremiumCard
                key={child.id}
                onPress={() => setSelectedChild(child.id)}
                style={[
                  styles.childItem,
                  selectedChild === child.id && styles.childItemSelected,
                ]}
              >
                <View style={styles.childInfo}>
                  <View style={[
                    styles.childAvatar,
                    selectedChild === child.id && styles.childAvatarSelected,
                  ]}>
                    <Text style={styles.childAvatarEmoji}>{child.emoji || '👶'}</Text>
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
              </PremiumCard>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Repeat on Days</Text>
          <View style={styles.daysGrid}>
            {DAYS.map((day) => (
              <PremiumCard
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
              </PremiumCard>
            ))}
          </View>
        </View>

        <PremiumCard style={styles.primaryButton} onPress={handleCreateChore}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Chore' : 'Create Chore')}
            </Text>
          </LinearGradient>
        </PremiumCard>

        <TouchableOpacity 
          onPress={() => router.replace('/(app)/parent-chores')}
          style={styles.backLink}
        >
          <Text style={styles.backLinkText}>Cancel</Text>
        </TouchableOpacity>
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
    backgroundColor: '#FBF8F3',
  },
  
  // ===== PREMIUM HEADER =====
  premiumHeader: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
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
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  headerSpacer: {
    width: 44,
  },

  scrollContent: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 8,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    lineHeight: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 24,
    borderRadius: 28,
    marginBottom: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emojiSelector: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#FBF8F3',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  selectedEmojiLarge: {
    fontSize: 72,
    marginBottom: 12,
  },
  changeLinkText: {
    fontSize: 15,
    color: '#10B981',
    fontWeight: '600',
  },
  childList: {
    gap: 12,
  },
  childItem: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: '#FBF8F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  childItemSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0EA5E9',
  },
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  childAvatarSelected: {
    backgroundColor: '#0EA5E9',
  },
  childAvatarEmoji: {
    fontSize: 20,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: -0.3,
  },
  childNameSelected: {
    color: '#0369A1',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0369A1',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 8,
  },
  dayButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: '#FBF8F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
    shadowColor: 'rgba(16, 185, 129, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  backLink: {
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  backLinkText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
});