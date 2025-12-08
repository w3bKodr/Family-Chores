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
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const { family, children, chores, createChore, updateChore, deleteChore, loading } = useFamilyStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState('1');
  const [emoji, setEmoji] = useState('✓');
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [mode, setMode] = useState<'recurring' | 'adHoc'>('recurring');
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
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
        setSelectedChildren([existingChore.assigned_to]);
        setSelectedDays(existingChore.repeating_days || []);
        // load recurrence fields if present
        if ((existingChore as any).scheduled_date) {
          setMode('adHoc');
          setScheduledDate((existingChore as any).scheduled_date as string);
        } else {
          setMode('recurring');
          setRecurrenceType(((existingChore as any).recurrence_type as any) || 'weekly');
          setRecurrenceInterval(((existingChore as any).recurrence_interval as any) || (existingChore.repeating_days && existingChore.repeating_days.length > 0 ? 1 : 1));
          setRecurrenceDayOfMonth(((existingChore as any).recurrence_day_of_month as any) || null);
        }
      }
    } else {
      // Reset form when creating a new chore
      setTitle('');
      setDescription('');
      setPoints('1');
      setEmoji('✓');
      setSelectedChildren([]);
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

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const getCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of month and day of week it starts on
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    const days: (number | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const toggleChild = (childId: string) => {
    if (selectedChildren.includes(childId)) {
      setSelectedChildren(selectedChildren.filter(id => id !== childId));
    } else {
      setSelectedChildren([...selectedChildren, childId]);
    }
  };

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

    if (selectedChildren.length === 0) {
      showAlert('Error', 'Please select at least one child', 'error');
      return;
    }

    if (mode === 'recurring') {
      if (recurrenceType === 'monthly') {
        if (!recurrenceDayOfMonth) {
          showAlert('Error', 'Please pick a day of month for monthly recurrence', 'error');
          return;
        }
      } else {
        if (selectedDays.length === 0) {
          showAlert('Error', 'Please select at least one day', 'error');
          return;
        }
      }
    } else {
      // ad-hoc
      if (!scheduledDate) {
        showAlert('Error', 'Please pick a date for the ad-hoc chore', 'error');
        return;
      }
    }

    if (!family?.id) {
      showAlert('Error', 'Family not found', 'error');
      return;
    }

    try {
      if (isEditMode && choreId) {
        // In edit mode, update the existing chore and create new ones for additional children
        const existingChore = chores.find(c => c.id === choreId);
        
        // Update the original chore
        const choreData: any = {
          family_id: family.id,
          assigned_to: existingChore?.assigned_to,
          title,
          description: description || null,
          points: parseInt(points, 10),
          emoji,
        };

        if (mode === 'adHoc') {
          choreData.scheduled_date = scheduledDate;
          choreData.repeating_days = [];
          choreData.recurrence_type = null;
          choreData.recurrence_interval = null;
          choreData.recurrence_day_of_month = null;
        } else {
          // recurring
          choreData.scheduled_date = null;
          choreData.recurrence_type = recurrenceType;
          choreData.recurrence_interval = recurrenceType === 'biweekly' ? 2 : 1;
          choreData.recurrence_day_of_month = recurrenceType === 'monthly' ? recurrenceDayOfMonth : null;
          choreData.repeating_days = recurrenceType === 'monthly' ? [] : selectedDays;
        }

        await updateChore(choreId, choreData);

        // Find which children are newly added (not the original assignee)
        const newlyAddedChildren = selectedChildren.filter(id => id !== existingChore?.assigned_to);
        
        // Create chores for newly added children only
        if (newlyAddedChildren.length > 0) {
          const chorePromises = newlyAddedChildren.map(childId =>
            createChore({
              family_id: family.id,
              assigned_to: childId,
              title,
              description: description || null,
              points: parseInt(points, 10),
              emoji,
              repeating_days: selectedDays,
            })
          );

          await Promise.all(chorePromises);
        }

        showAlert('Success', 'Chore updated successfully!', 'success');
      } else {
        // In create mode, create a chore for each selected child
        const chorePromises = selectedChildren.map(childId => {
          const chorePayload: any = {
            family_id: family.id,
            assigned_to: childId,
            title,
            description: description || null,
            points: parseInt(points, 10),
            emoji,
          };

          if (mode === 'adHoc') {
            chorePayload.scheduled_date = scheduledDate;
            chorePayload.repeating_days = [];
            chorePayload.recurrence_type = null;
            chorePayload.recurrence_interval = null;
            chorePayload.recurrence_day_of_month = null;
          } else {
            chorePayload.scheduled_date = null;
            chorePayload.recurrence_type = recurrenceType;
            chorePayload.recurrence_interval = recurrenceType === 'biweekly' ? 2 : 1;
            chorePayload.recurrence_day_of_month = recurrenceType === 'monthly' ? recurrenceDayOfMonth : null;
            chorePayload.repeating_days = recurrenceType === 'monthly' ? [] : selectedDays;
          }

          return createChore(chorePayload);
        });

        await Promise.all(chorePromises);
        const childCount = selectedChildren.length;
        showAlert('Success', `Chore created for ${childCount} ${childCount === 1 ? 'child' : 'children'}!`, 'success');
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

        {/* Mode Selector: Recurring / Ad-Hoc */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Schedule Type</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              onPress={() => setMode('recurring')}
              style={[styles.segment, mode === 'recurring' && styles.segmentActive]}
            >
              <Ionicons
                name={mode === 'recurring' ? 'repeat' : 'repeat-outline'}
                size={18}
                color={mode === 'recurring' ? '#10B981' : '#9CA3AF'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, mode === 'recurring' && styles.segmentTextActive]}>Recurring</Text>
            </TouchableOpacity>
            <View style={styles.segmentDivider} />
            <TouchableOpacity
              onPress={() => {
                setMode('adHoc');
                // Set default to today when switching to adHoc mode
                const today = new Date();
                const todayStr = formatDate(today);
                setScheduledDate(todayStr);
              }}
              style={[styles.segment, mode === 'adHoc' && styles.segmentActive]}
            >
              <Ionicons
                name={mode === 'adHoc' ? 'calendar' : 'calendar-outline'}
                size={18}
                color={mode === 'adHoc' ? '#10B981' : '#9CA3AF'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, mode === 'adHoc' && styles.segmentTextActive]}>One-Off</Text>
            </TouchableOpacity>
          </View>
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
                onPress={() => toggleChild(child.id)}
                style={[
                  styles.childItem,
                  selectedChildren.includes(child.id) && styles.childItemSelected,
                ]}
              >
                <View style={styles.childInfo}>
                  <View style={[
                    styles.childAvatar,
                    selectedChildren.includes(child.id) && styles.childAvatarSelected,
                  ]}>
                    <Text style={styles.childAvatarEmoji}>{child.emoji || '👶'}</Text>
                  </View>
                  <Text
                    style={[
                      styles.childName,
                      selectedChildren.includes(child.id) && styles.childNameSelected,
                    ]}
                  >
                    {child.display_name}
                  </Text>
                </View>
                {selectedChildren.includes(child.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </PremiumCard>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          {mode === 'recurring' ? (
            <>
              <Text style={styles.sectionTitle}>Recurrence Pattern</Text>
              <View style={styles.recurrenceGrid}>
                <TouchableOpacity
                  onPress={() => { setRecurrenceType('weekly'); setRecurrenceInterval(1); }}
                  style={[styles.recurrenceButton, recurrenceType === 'weekly' && styles.recurrenceButtonActive]}
                >
                  <Text style={[styles.recurrenceButtonText, recurrenceType === 'weekly' && styles.recurrenceButtonTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setRecurrenceType('biweekly'); setRecurrenceInterval(2); }}
                  style={[styles.recurrenceButton, recurrenceType === 'biweekly' && styles.recurrenceButtonActive]}
                >
                  <Text style={[styles.recurrenceButtonText, recurrenceType === 'biweekly' && styles.recurrenceButtonTextActive]}>Bi-Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setRecurrenceType('monthly'); setRecurrenceInterval(1); }}
                  style={[styles.recurrenceButton, recurrenceType === 'monthly' && styles.recurrenceButtonActive]}
                >
                  <Text style={[styles.recurrenceButtonText, recurrenceType === 'monthly' && styles.recurrenceButtonTextActive]}>Monthly</Text>
                </TouchableOpacity>
              </View>

              {recurrenceType === 'monthly' ? (
                <View style={styles.monthlyPickerContainer}>
                  <Text style={styles.pickerLabel}>Pick day of month</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                    <Text style={styles.datePickerButtonText}>{recurrenceDayOfMonth ? `${recurrenceDayOfMonth}${getOrdinalSuffix(recurrenceDayOfMonth)}` : 'Select day'}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#10B981" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.daysPickerContainer}>
                  <Text style={styles.pickerLabel}>Select days</Text>
                  <View style={styles.daysGrid}>
                    {DAYS.map((day) => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleDay(day)}
                        style={[
                          styles.dayPill,
                          selectedDays.includes(day) && styles.dayPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayPillText,
                            selectedDays.includes(day) && styles.dayPillTextSelected,
                          ]}
                        >
                          {day.slice(0, 3)}
                        </Text>
                        {selectedDays.includes(day) && (
                          <View style={styles.dayPillDot} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Pick Date</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)} 
                style={styles.adHocDateButton}
              >
                <View style={styles.adHocDateButtonContent}>
                  <Ionicons 
                    name={scheduledDate ? 'calendar' : 'add-circle-outline'} 
                    size={20} 
                    color="#10B981" 
                  />
                  <Text style={styles.adHocDateButtonText}>
                    {scheduledDate ? scheduledDate : 'Pick a date'}
                  </Text>
                </View>
                {scheduledDate && (
                  <TouchableOpacity 
                    onPress={() => setScheduledDate(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </>
          )}
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

        {/* Date Picker - Native for iOS/Android, Modal for Web */}
        {Platform.OS !== 'web' ? (
          showDatePicker && (
            <DateTimePicker
              value={scheduledDate || new Date()}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                if (event.type === 'dismissed') {
                  setShowDatePicker(false);
                  return;
                }
                if (!date) return;
                if (mode === 'adHoc') {
                  // Convert date to string to avoid timezone issues
                  const dateStr = formatDate(date);
                  setScheduledDate(dateStr);
                } else if (recurrenceType === 'monthly') {
                  setRecurrenceDayOfMonth(date.getDate());
                }
                setShowDatePicker(false);
              }}
            />
          )
        ) : (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.webDatePickerOverlay}>
              <View style={styles.webDatePickerContainer}>
                <View style={styles.webDatePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.webDatePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.webDatePickerTitle}>
                    {mode === 'adHoc' ? 'Select Date' : 'Pick Day of Month'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (mode === 'adHoc') {
                        setScheduledDate(scheduledDate || new Date());
                      } else if (recurrenceType === 'monthly') {
                        // recurrenceDayOfMonth is already set by the user's selection
                        // No need to do anything here, just close the picker
                      }
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.webDatePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                
                {mode === 'adHoc' ? (
                  // Ad-hoc mode: full calendar view
                  <View style={styles.webCalendarContainer}>
                    {/* Calendar Header with Month/Year and Navigation */}
                    <View style={styles.webCalendarHeader}>
                      <TouchableOpacity 
                        onPress={() => {
                          const prevMonth = new Date(calendarMonth);
                          prevMonth.setMonth(prevMonth.getMonth() - 1);
                          setCalendarMonth(prevMonth);
                        }}
                        style={styles.webCalendarNavButton}
                      >
                        <Ionicons name="chevron-back" size={24} color="#10B981" />
                      </TouchableOpacity>
                      
                      <Text style={styles.webCalendarMonthYear}>
                        {calendarMonth.toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                      
                      <TouchableOpacity 
                        onPress={() => {
                          const nextMonth = new Date(calendarMonth);
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          setCalendarMonth(nextMonth);
                        }}
                        style={styles.webCalendarNavButton}
                      >
                        <Ionicons name="chevron-forward" size={24} color="#10B981" />
                      </TouchableOpacity>
                    </View>

                    {/* Day of week headers */}
                    <View style={styles.webCalendarWeekDays}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <Text key={day} style={styles.webCalendarWeekDayText}>
                          {day}
                        </Text>
                      ))}
                    </View>

                    {/* Calendar grid */}
                    <View style={styles.webCalendarGrid}>
                      {getCalendarDays(calendarMonth).map((day, idx) => {
                        if (day === null) {
                          return <View key={`empty-${idx}`} style={styles.webCalendarDayEmpty} />;
                        }

                        const dateObj = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        dateObj.setHours(0, 0, 0, 0);
                        
                        const dateStr = formatDate(dateObj);
                        const isPast = dateObj < today;
                        const isToday = dateObj.toDateString() === today.toDateString();
                        const isSelected = scheduledDate === dateStr;

                        return (
                          <TouchableOpacity
                            key={day}
                            disabled={isPast}
                            onPress={() => {
                              setScheduledDate(dateStr);
                            }}
                            style={[
                              styles.webCalendarDay,
                              isToday && styles.webCalendarDayToday,
                              isSelected && styles.webCalendarDaySelected,
                              isPast && styles.webCalendarDayDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.webCalendarDayText,
                                isToday && styles.webCalendarDayTodayText,
                                isSelected && styles.webCalendarDaySelectedText,
                                isPast && styles.webCalendarDayDisabledText,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  // Monthly mode: grid showing available days of any month
                  <View style={styles.webMonthlyPickerWrapper}>
                    <View style={styles.webMonthlyPickerGrid}>
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        // Check if this day exists in all months
                        let isAvailable = true;
                        for (let month = 0; month < 12; month++) {
                          const testDate = new Date(2024, month, day);
                          if (testDate.getDate() !== day) {
                            isAvailable = false;
                            break;
                          }
                        }
                        return { day, isAvailable };
                      }).map(({ day, isAvailable }) => {
                        const isSelected = day === recurrenceDayOfMonth;
                        return (
                          <TouchableOpacity
                            key={day}
                            onPress={() => {
                              if (isAvailable) {
                                setRecurrenceDayOfMonth(day);
                              }
                            }}
                            disabled={!isAvailable}
                            style={[
                              styles.webMonthlyPickerDay,
                              isSelected && styles.webMonthlyPickerDaySelected,
                              !isAvailable && styles.webMonthlyPickerDayDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.webMonthlyPickerDayText,
                                isSelected && styles.webMonthlyPickerDayTextSelected,
                                !isAvailable &&
                                  styles.webMonthlyPickerDayTextDisabled,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}

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

  // ===== SEGMENTED CONTROL =====
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 6,
    gap: 0,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: -0.2,
  },
  segmentTextActive: {
    color: '#10B981',
  },
  segmentDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'transparent',
  },

  // ===== RECURRENCE BUTTONS (Modern 2025 style) =====
  recurrenceGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  recurrenceButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: 'rgba(0, 0, 0, 0.02)',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 0.5,
  },
  recurrenceButtonActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  recurrenceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: -0.15,
  },
  recurrenceButtonTextActive: {
    color: '#10B981',
    fontWeight: '600',
  },

  // ===== MODERN DAY PICKER STYLES =====
  daysPickerContainer: {
    marginTop: 2,
  },
  monthlyPickerContainer: {
    marginTop: 2,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 9,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  dayPillSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1.2,
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    letterSpacing: -0.1,
  },
  dayPillTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  dayPillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    position: 'absolute',
    bottom: 4,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
    letterSpacing: -0.1,
  },

  // ===== AD-HOC DATE PICKER BUTTON =====
  adHocDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 56,
  },
  adHocDateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  adHocDateButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#10B981',
    letterSpacing: -0.2,
  },

  // ===== RECURRENCE ROW (legacy fallback) =====
  recurrenceRow: {
    flexDirection: 'row',
    gap: 12,
  },

    // ===== WEB DATE PICKER STYLES =====
  webDatePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  webDatePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingBottom: 20,
    maxWidth: 500,
    width: '100%',
    maxHeight: '80%',
  },
  webDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webDatePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  webDatePickerCancel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  webDatePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  webDatePickerScrollView: {
    height: 100,
  },
  webDatePickerScroll: {
    paddingHorizontal: 12,
    gap: 8,
    paddingVertical: 12,
  },
  webDatePickerDay: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webDatePickerDaySelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  webDatePickerDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  webDatePickerDayTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },

  // ===== WEB CALENDAR STYLES =====
  webCalendarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  webCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  webCalendarNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webCalendarMonthYear: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  webCalendarWeekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  webCalendarWeekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    width: '14.28%',
    textAlign: 'center',
  },
  webCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  webCalendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webCalendarDayEmpty: {
    width: '14.28%',
    aspectRatio: 1,
  },
  webCalendarDayToday: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  webCalendarDaySelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    borderWidth: 2,
  },
  webCalendarDayDisabled: {
    opacity: 0.35,
    backgroundColor: '#F3F4F6',
  },
  webCalendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  webCalendarDayTodayText: {
    color: '#10B981',
    fontWeight: '600',
  },
  webCalendarDaySelectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  webCalendarDayDisabledText: {
    color: '#D1D5DB',
  },

  // ===== WEB MONTHLY PICKER STYLES =====
  webMonthlyPickerWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  webMonthlyPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  webMonthlyPickerDay: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMonthlyPickerDaySelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1.5,
  },
  webMonthlyPickerDayDisabled: {
    opacity: 0.4,
    backgroundColor: '#F3F4F6',
  },
  webMonthlyPickerDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  webMonthlyPickerDayTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  webMonthlyPickerDayTextDisabled: {
    color: '#D1D5DB',
  },
});