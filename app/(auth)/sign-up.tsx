import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { AlertModal } from '@components/AlertModal';

export default function SignUp() {
  const router = useRouter();
  const { signUp, loading } = useAuthStore();
  const { createFamily, createJoinRequest } = useFamilyStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isParent, setIsParent] = useState<boolean | null>(null);
  const [familyCode, setFamilyCode] = useState('');
  const [step, setStep] = useState<'role' | 'signup'>('role');
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

  const handleSignUp = async () => {
    console.log('handleSignUp called', { email, password, displayName, isParent });
    
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      console.log('Showing alert: Please fill in all fields');
      showAlert('Error', 'Please fill in all fields', 'error');
      return;
    }

    if (password.length < 6) {
      console.log('Showing alert: Password too short');
      showAlert('Error', 'Password must be at least 6 characters', 'error');
      return;
    }

    try {
      console.log('Calling signUp...');
      const newUser = await signUp(email, password, displayName, isParent ? 'parent' : 'child');
      console.log('SignUp successful, user:', newUser);

      if (isParent) {
        console.log('Parent signup successful - redirecting to dashboard');
        showAlert('Success', 'Account created! You can now create or join a family.', 'success');
        setTimeout(() => {
          router.replace('/(app)/parent');
        }, 1500);
        return;
      }

      if (familyCode.trim()) {
        console.log('Looking up family by code...');
        const { data: family, error: familyError } = await supabase
          .from('families')
          .select('id')
          .eq('family_code', familyCode.trim())
          .single();

        if (familyError || !family) {
          console.error('Invalid family code', familyError);
          showAlert('Error', 'Could not find a family with that code.', 'error');
          return;
        }

        await createJoinRequest(family.id, newUser.id);
        showAlert('Success', 'Your join request has been sent to the parent for approval.', 'success');
      }

      console.log('Navigating to app...');
      setTimeout(() => {
        router.replace('/(app)/child');
      }, 1500);
    } catch (error: any) {
      console.error('SignUp error caught:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.log('Showing error alert...');
      
      let errorMessage = error.message || 'An unexpected error occurred';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead or use a different email.';
      }
      
      showAlert('Sign Up Error', errorMessage, 'error');
      console.log('Alert shown');
    }
  };

  if (step === 'role' && isParent === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.roleHeader}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Welcome!</Text>
            <Text style={styles.subtitle}>
              Let's get started. Are you a parent or a child?
            </Text>
          </View>

          <View style={styles.roleCards}>
            <TouchableOpacity
              onPress={() => {
                setIsParent(true);
                setStep('signup');
              }}
              style={styles.roleCard}
              activeOpacity={0.7}
            >
              <Text style={styles.roleEmoji}>👨‍👩‍👧</Text>
              <Text style={styles.roleTitle}>I'm a Parent</Text>
              <Text style={styles.roleDescription}>
                Create chores and manage the family
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsParent(false);
                setStep('signup');
              }}
              style={styles.roleCard}
              activeOpacity={0.7}
            >
              <Text style={styles.roleEmoji}>👶</Text>
              <Text style={styles.roleTitle}>I'm a Child</Text>
              <Text style={styles.roleDescription}>
                Complete chores and earn rewards
              </Text>
            </TouchableOpacity>
          </View>

          <Button
            title="Back to Sign In"
            onPress={() => router.back()}
            variant="ghost"
            size="lg"
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.icon}>{isParent ? '👨‍👩‍👧' : '👶'}</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {isParent ? 'Set up your parent account' : 'Set up your child account'}
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Display Name"
              placeholder={isParent ? 'Your name' : 'Your child name'}
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {!isParent && (
              <Input
                label="Family Code (from parent)"
                placeholder="Enter family code"
                value={familyCode}
                onChangeText={setFamilyCode}
              />
            )}

            <Button
              title={loading ? 'Creating account...' : 'Create Account'}
              onPress={handleSignUp}
              disabled={loading}
              variant="primary"
              size="lg"
            />

            <Button
              title="Back"
              onPress={() => {
                setIsParent(null);
                setStep('role');
              }}
              variant="outline"
              size="lg"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  roleHeader: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
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
  roleCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

