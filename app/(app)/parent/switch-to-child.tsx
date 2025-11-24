import React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SwitchToChild() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { children } = useFamilyStore();

  const handleSelectChild = async (childId: string) => {
    // Store selected child ID in AsyncStorage
    await AsyncStorage.setItem('active_child_id', childId);
    
    // Navigate to child view
    router.replace('/(app)/child');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🔄</Text>
          </View>
          <Text style={styles.title}>Switch to Child Mode</Text>
          <Text style={styles.subtitle}>
            Select which child you want to view as
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            In child mode, you'll see their chores and can complete tasks on their behalf. You can switch back to parent mode anytime.
          </Text>
        </View>

        <View style={styles.childList}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              onPress={() => handleSelectChild(child.id)}
              style={styles.childCard}
            >
              <View style={styles.childCardContent}>
                <View style={styles.childIcon}>
                  <Text style={styles.childEmoji}>{child.emoji || '👶'}</Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.display_name}</Text>
                  <Text style={styles.childPoints}>{child.points} points</Text>
                </View>
              </View>
              <View style={styles.chevron}>
                <Text style={styles.chevronText}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#BFDBFE',
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
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
  },
  childList: {
    marginBottom: 24,
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  childCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  childEmoji: {
    fontSize: 24,
  },
  childInfo: {
    justifyContent: 'center',
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  childPoints: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
});
