import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@lib/store/authStore';
import { supabase } from '@lib/supabase/client';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { AlertModal } from '@components/AlertModal';
import { useFamilyStore } from '@lib/store/familyStore';

export default function JoinFamily() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const { getParentJoinRequests } = useFamilyStore();
  const [familyCode, setFamilyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [alertOnCloseAction, setAlertOnCloseAction] = useState<(() => void) | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    onCloseAction: (() => void) | null = null,
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertOnCloseAction(() => onCloseAction);
    setAlertVisible(true);
  };

  const handleJoinFamily = async () => {
    if (!familyCode.trim()) {
      showAlert('Error', 'Please enter a family code', 'error');
      return;
    }

    if (!user?.id) {
      showAlert('Error', 'User not found', 'error');
      return;
    }

    setLoading(true);
    try {
      const trimmedCode = familyCode.trim();
      
      console.log('Looking for family with code:', trimmedCode);
      
      // First, let's see ALL families to debug
      const { data: allFamilies, error: allError } = await supabase
        .from('families')
        .select('*');
      
      console.log('All families in database:', allFamilies);
      
      if (allFamilies && allFamilies.length === 0) {
        showAlert('Error', 'No families exist yet. Ask the organizer to create a family first.', 'error');
        setLoading(false);
        return;
      }
      
      // Query for family_code field (try exact match first, then case-insensitive)
      const { data: families, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('family_code', trimmedCode);

      console.log('Query result:', { families, familyError });

      if (familyError) {
        console.error('Query error:', familyError);
        throw familyError;
      }

      if (!families || families.length === 0) {
        showAlert('Error', `Family code "${trimmedCode}" not found. Please check the code and try again.`, 'error');
        setLoading(false);
        return;
      }

      const family = families[0];

      // Check if user already in family
      if (user.role === 'child') {
        const { data: existingChild } = await supabase
          .from('children')
          .select('id')
          .eq('family_id', family.id)
          .eq('user_id', user.id)
          .single();

        if (existingChild) {
          showAlert('Error', 'You are already a member of this family.', 'error');
          setLoading(false);
          return;
        }
      } else if (user.role === 'parent') {
        // Check if parent already in family
        if (user.family_id === family.id) {
          showAlert('Error', 'You are already a member of this family.', 'error');
          setLoading(false);
          return;
        }
      }

      // For parents, create or update a join request (allows re-requesting)
      if (user.role === 'parent') {
        const { data, error: requestError } = await supabase.rpc('create_or_update_parent_join_request', {
          p_family_id: family.id,
          p_user_id: user.id,
          p_display_name: user.display_name,
          p_user_email: user.email,
        });

        if (requestError) {
          console.error('Parent join request error:', requestError);
          throw requestError;
        }

        // Wait for the user to dismiss the success alert; then navigate to dashboard and refresh requests
        showAlert(
          'Success',
          `Your request to join ${family.name} has been sent! Wait for the family owner to approve.`,
          'success',
          async () => {
            try {
              // Refresh parent join requests for the family so UI badge updates
              await getParentJoinRequests(family.id);
            } catch (e) {
              console.warn('Failed to refresh parent join requests after create:', e);
            }
            router.replace('/(app)/parent');
          }
        );
        return;
      }

      // For children, join directly and create child record
      // Update user's family_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ family_id: family.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Only create child record if user is a child role
      if (user.role === 'child') {
        const { error: childError } = await supabase
          .from('children')
          .insert({
            family_id: family.id,
            user_id: user.id,
            display_name: user.display_name,
          });

        if (childError) {
          console.error('Child insert error:', childError);
          throw childError;
        }
      }

      // Update local user state
      setUser({ ...user, family_id: family.id });

      // Let the user dismiss the confirmation before navigating to dashboard
      showAlert('Success', `You've joined ${family.name}!`, 'success', () => router.replace('/(app)/parent'));
    } catch (error: any) {
      console.error('Join family error:', error);
      showAlert('Error', error.message || 'Failed to join family', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>🏡</Text>
          </View>
          <Text style={styles.title}>Join a Family</Text>
          <Text style={styles.subtitle}>
            Enter the family code shared by the family organizer
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.card}>
            <Input
              label="Family Code"
              placeholder="Enter family code"
              value={familyCode}
              onChangeText={setFamilyCode}
              autoFocus
              autoCapitalize="none"
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoEmoji}>💡</Text>
              <Text style={styles.infoText}>
                Ask your family organizer to share their family code. You can find it on their dashboard.
              </Text>
            </View>
          </View>

          <Button
            title={loading ? 'Joining...' : 'Join Family'}
            onPress={handleJoinFamily}
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

      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => {
          setAlertVisible(false);
          // Call any action we stored for after the alert is dismissed
          if (alertOnCloseAction) {
            try {
              alertOnCloseAction();
            } catch (e) {
              console.error('Error in alert onClose action:', e);
            }
            setAlertOnCloseAction(null);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    backgroundColor: '#E9D5FF',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  form: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
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
});
