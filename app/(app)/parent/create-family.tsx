import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { AlertModal } from '@components/AlertModal';

export default function CreateFamily() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createFamily, loading } = useFamilyStore();
  const [familyName, setFamilyName] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'error') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      showAlert('Error', 'Please enter a family name', 'error');
      return;
    }

    if (!user?.id) {
      showAlert('Error', 'User not found', 'error');
      return;
    }

    try {
      await createFamily(familyName, user.id);
      showAlert('Success', 'Family created! Now you can add chores.', 'success');
      // Navigate after alert is dismissed
      setTimeout(() => {
        router.replace('/(app)/parent');
      }, 1500);
    } catch (error: any) {
      showAlert('Error', error.message, 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.emoji}>👨‍👩‍👧‍👦</Text>
            </View>
            <Text style={styles.title}>Create Family</Text>
            <Text style={styles.subtitle}>
              Give your family a name to get started
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Family Name"
              placeholder="e.g., The Smiths"
              value={familyName}
              onChangeText={setFamilyName}
            />

            <Button
              title={loading ? 'Creating...' : 'Create Family'}
              onPress={handleCreateFamily}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
    backgroundColor: '#FFFFFF',
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
});

