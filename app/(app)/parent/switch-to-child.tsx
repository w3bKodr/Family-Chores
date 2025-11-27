import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return <View style={style}>{children}</View>;
};

export default function SwitchToChild() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { children } = useFamilyStore();

  const handleSelectChild = async (childId: string) => {
    // Store selected child ID in AsyncStorage
    await AsyncStorage.setItem('active_child_id', childId);
    
    // Navigate to child dashboard
    router.replace('/(app)/child-dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Header */}
      <View style={styles.premiumHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Child Mode</Text>
            <Text style={styles.headerSubtitle}>Select a child to continue as</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="information-circle" size={24} color="#0EA5E9" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>What is Child Mode?</Text>
            <Text style={styles.infoText}>
              Hand your device to your child so they can view their chores, mark them complete, and redeem rewards.
            </Text>
          </View>
        </View>

        {/* Children List */}
        <Text style={styles.sectionTitle}>Choose a Child</Text>
        
        <View style={styles.childList}>
          {children.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>👶</Text>
              <Text style={styles.emptyText}>No children added yet</Text>
              <Text style={styles.emptySubtext}>Add children from the Family tab first</Text>
            </View>
          ) : (
            children.map((child, index) => (
              <PremiumCard
                key={child.id}
                onPress={() => handleSelectChild(child.id)}
                style={styles.childCard}
              >
                <View style={styles.childCardInner}>
                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={['#38BDF8', '#0EA5E9']}
                      style={styles.avatarGradient}
                    >
                      <Text style={styles.childEmoji}>{child.emoji || '👶'}</Text>
                    </LinearGradient>
                  </View>
                  
                  {/* Info */}
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.display_name}</Text>
                    <View style={styles.pointsBadge}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.pointsText}>{child.points} points</Text>
                    </View>
                  </View>
                  
                  {/* Arrow */}
                  <View style={styles.arrowContainer}>
                    <Ionicons name="arrow-forward-circle" size={32} color="#0EA5E9" />
                  </View>
                </View>
              </PremiumCard>
            ))
          )}
        </View>

        {/* Bottom Cancel Button */}
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F3',
  },
  premiumHeader: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#0EA5E9',
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    padding: 18,
    borderRadius: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#0C4A6E',
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  childList: {
    gap: 14,
  },
  childCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  childCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  childEmoji: {
    fontSize: 32,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8F92A1',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#8F92A1',
    fontWeight: '600',
  },
});
