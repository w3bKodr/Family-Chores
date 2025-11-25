import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFamilyStore } from '@lib/store/familyStore';
import { useAuthStore } from '@lib/store/authStore';
import { Button } from '@components/Button';
import { AlertModal } from '@components/AlertModal';

export default function PendingRequestsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    family,
    joinRequests,
    parentJoinRequests,
    getJoinRequests,
    getParentJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    approveParentJoinRequest,
    rejectParentJoinRequest,
    getParents,
  } = useFamilyStore();

  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  useEffect(() => {
    if (user?.family_id) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.family_id) return;
    try {
      await Promise.all([
        getJoinRequests(user.family_id),
        getParentJoinRequests(user.family_id),
      ]);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load requests', 'error');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApproveChild = async (id: string) => {
    try {
      await approveJoinRequest(id, user?.id || '');
      showAlert('Success', 'Child approved', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleRejectChild = async (id: string) => {
    try {
      await rejectJoinRequest(id);
      showAlert('Success', 'Request rejected', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleApproveParent = async (id: string) => {
    try {
      await approveParentJoinRequest(id);
      // Refresh parent requests and parents list so UI updates immediately
      if (family?.id) {
        await getParentJoinRequests(family.id);
        await getParents(family.id);
      }
      showAlert('Success', 'Family join request approved (Parent)', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  const handleRejectParent = async (id: string) => {
    try {
      await rejectParentJoinRequest(id);
      showAlert('Success', 'Request rejected', 'success');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed', 'error');
    }
  };

  if (!user?.family_id) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
          <Text style={styles.title}>Pending Requests</Text>
          <Text style={styles.subtitle}>You don't have a family yet or there are no pending requests.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        <Text style={styles.pageTitle}>Pending Requests</Text>

        {parentJoinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Family Join Requests — Parent</Text>
            {parentJoinRequests.map((r: any) => (
              <View key={r.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{r.display_name || r.users?.display_name || 'Unknown'}</Text>
                  <Text style={styles.requestMeta}>{r.user_email || r.users?.email || 'No email'}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity onPress={() => handleApproveParent(r.id)} style={styles.approveButton}><Text style={styles.approveText}>✓</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRejectParent(r.id)} style={styles.rejectButton}><Text style={styles.rejectText}>✗</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {joinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Child Requests</Text>
            {joinRequests.map((r: any) => (
              <View key={r.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{r.user_email || r.users?.display_name || r.user_id}</Text>
                  <Text style={styles.requestMeta}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity onPress={() => handleApproveChild(r.id)} style={styles.approveButton}><Text style={styles.approveText}>✓</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRejectChild(r.id)} style={styles.rejectButton}><Text style={styles.rejectText}>✗</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      <AlertModal visible={alertVisible} title={alertTitle} message={alertMessage} type={alertType} onClose={() => setAlertVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  emptyContent: { padding: 24 },
  pageTitle: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#6B7280' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  requestCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, borderWidth:1, borderColor:'#F3F4F6' },
  requestInfo: {},
  requestName: { fontSize: 16, fontWeight: '700' },
  requestMeta: { fontSize: 12, color: '#6B7280' },
  requestActions: { flexDirection: 'row', gap: 8 },
  approveButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  approveText: { color: '#FFFFFF', fontWeight: '700' },
  rejectButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: '#FFFFFF', fontWeight: '700' },
});
