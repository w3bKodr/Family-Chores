import { create } from 'zustand';
import { supabase } from '@lib/supabase/client';
import { useAuthStore } from '@lib/store/authStore';
import { Family, Child, Chore, ChoreCompletion, Reward, RewardClaim, JoinRequest, ParentJoinRequest } from '@lib/types';

interface FamilyState {
  family: Family | null;
  children: Child[];
  parents: any[];
  chores: Chore[];
  choreCompletions: ChoreCompletion[];
  rewards: Reward[];
  rewardClaims: RewardClaim[];
  joinRequests: JoinRequest[];
  parentJoinRequests: ParentJoinRequest[];
  loading: boolean;
  error: string | null;
  
  // Family actions
  createFamily: (name: string, userId: string) => Promise<Family>;
  getFamily: (familyId: string) => Promise<void>;
  generateFamilyCode: () => Promise<string>;
  
  // Child actions
  getChildren: (familyId: string) => Promise<void>;
  getParents: (familyId: string) => Promise<void>;
  addChild: (familyId: string, displayName: string, userId?: string | null, emoji?: string) => Promise<void>;
  updateChild: (childId: string, updates: Partial<Child>) => Promise<void>;
  approveChild: (childId: string) => Promise<void>;
  rejectChild: (childId: string) => Promise<void>;
  
  // Chore actions
  getChores: (familyId: string) => Promise<void>;
  createChore: (chore: Omit<Chore, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateChore: (choreId: string, updates: Partial<Chore>) => Promise<void>;
  deleteChore: (choreId: string) => Promise<void>;
  
  // Chore completion actions
  getChoreCompletions: (familyId: string) => Promise<void>;
  completeChore: (choreId: string, childId: string, date: string) => Promise<void>;
  approveCompletion: (completionId: string, userId: string) => Promise<void>;
  rejectCompletion: (completionId: string) => Promise<void>;
  
  // Reward actions
  getRewards: (familyId: string) => Promise<void>;
  createReward: (reward: Omit<Reward, 'id' | 'created_at'>) => Promise<void>;
  updateReward: (rewardId: string, updates: Partial<Reward>) => Promise<void>;
  deleteReward: (rewardId: string) => Promise<void>;
  
  // Reward claim actions
  claimReward: (rewardId: string, childId: string) => Promise<void>;
  getRewardClaims: (familyId: string) => Promise<void>;
  approveRewardClaim: (claimId: string, approverId: string) => Promise<void>;
  rejectRewardClaim: (claimId: string, approverId: string) => Promise<void>;
  
  // Join requests
  getJoinRequests: (familyId: string) => Promise<void>;
  createJoinRequest: (familyId: string, userId: string) => Promise<void>;
  approveJoinRequest: (requestId: string, userId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  
  // Parent join requests
  getParentJoinRequests: (familyId: string) => Promise<void>;
  approveParentJoinRequest: (requestId: string) => Promise<void>;
  rejectParentJoinRequest: (requestId: string) => Promise<void>;
  cancelParentJoinRequest: (requestId: string) => Promise<void>;
  
  // Parent PIN for child mode
  setParentPin: (familyId: string, pin: string) => Promise<void>;
  verifyParentPin: (familyId: string, pin: string) => Promise<boolean>;
  hasParentPin: (familyId: string) => Promise<boolean>;
  
  setFamily: (family: Family | null) => void;
  setError: (error: string | null) => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  family: null,
  children: [],
  parents: [],
  chores: [],
  choreCompletions: [],
  rewards: [],
  rewardClaims: [],
  joinRequests: [],
  parentJoinRequests: [],
  loading: false,
  error: null,

  createFamily: async (name: string, userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('families')
        .insert({ name, parent_id: userId })
        .select()
        .single();

      if (error) throw error;

      const { error: linkError } = await supabase
        .from('users')
        .update({ family_id: data.id })
        .eq('id', userId);

      if (linkError) throw linkError;

      const { user, setUser } = useAuthStore.getState();
      if (user?.id === userId) {
        setUser({ ...user, family_id: data.id });
      }

      set({ family: data });
      return data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getFamily: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyId)
        .single();

      if (error) throw error;
      set({ family: data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  generateFamilyCode: async () => {
    const { family } = get();
    if (!family) throw new Error('No family selected');

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const { data, error } = await supabase
      .from('families')
      .update({ family_code: code })
      .eq('id', family.id)
      .select()
      .single();

    if (error) throw error;
    set({ family: data });
    return code;
  },

  getChildren: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved');

      if (error) throw error;
      set({ children: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  getParents: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('family_id', familyId)
        .eq('role', 'parent');

      if (error) throw error;
      set({ parents: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  addChild: async (familyId: string, displayName: string, userId: string | null = null, emoji: string = '👶') => {
    set({ loading: true, error: null });
    try {
      // Check current number of children
      const { children } = get();
      if (children.length >= 15) {
        throw new Error('Maximum of 15 children per family');
      }

      const { error } = await supabase
        .from('children')
        .insert({ 
          family_id: familyId, 
          user_id: userId, // Will be null for guest children
          display_name: displayName,
          emoji: emoji,
        });

      if (error) throw error;
      await get().getChildren(familyId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateChild: async (childId: string, updates: Partial<Child>) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', childId);

      if (error) throw error;

      const { children } = get();
      const updated = children.map(c => c.id === childId ? { ...c, ...updates } : c);
      set({ children: updated });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  approveChild: async (childId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('children')
        .update({ status: 'approved' })
        .eq('id', childId);

      if (error) throw error;

      const { children } = get();
      const updated = children.map(c => c.id === childId ? { ...c, status: 'approved' as const } : c);
      set({ children: updated });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  rejectChild: async (childId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('children')
        .update({ status: 'rejected' })
        .eq('id', childId);

      if (error) throw error;

      const { children } = get();
      const updated = children.filter(c => c.id !== childId);
      set({ children: updated });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getChores: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('family_id', familyId);

      if (error) throw error;
      set({ chores: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createChore: async (chore) => {
    set({ error: null });
    try {
      const { data, error } = await supabase
        .from('chores')
        .insert(chore)
        .select()
        .single();

      if (error) throw error;
      const { chores } = get();
      set({ chores: [...chores, data] });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateChore: async (choreId: string, updates) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('chores')
        .update(updates)
        .eq('id', choreId);

      if (error) throw error;

      const { chores } = get();
      const updated = chores.map(c => c.id === choreId ? { ...c, ...updates } : c);
      set({ chores: updated });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteChore: async (choreId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', choreId);

      if (error) throw error;

      const { chores } = get();
      set({ chores: chores.filter(c => c.id !== choreId) });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getChoreCompletions: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('chore_completions')
        .select('*')
        .in('chore_id', (
          await supabase
            .from('chores')
            .select('id')
            .eq('family_id', familyId)
        ).data?.map(c => c.id) || []);

      if (error) throw error;
      set({ choreCompletions: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  completeChore: async (choreId: string, childId: string, date: string) => {
    set({ error: null });
    try {
      const { data, error } = await supabase
        .from('chore_completions')
        .insert({ chore_id: choreId, completed_by: childId, completed_date: date })
        .select()
        .single();

      if (error) throw error;

      const { choreCompletions } = get();
      set({ choreCompletions: [...choreCompletions, data] });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  approveCompletion: async (completionId: string, userId: string) => {
    set({ error: null });
    try {
      const { error: updateError } = await supabase
        .from('chore_completions')
        .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
        .eq('id', completionId);

      if (updateError) throw updateError;

      // Update child's points
      const { choreCompletions } = get();
      const completion = choreCompletions.find(c => c.id === completionId);
      if (completion) {
        const chore = get().chores.find(c => c.id === completion.chore_id);
        if (chore) {
          const { data: child } = await supabase
            .from('children')
            .select('points')
            .eq('id', completion.completed_by)
            .single();

          if (child) {
            await supabase
              .from('children')
              .update({ points: child.points + chore.points })
              .eq('id', completion.completed_by);
          }
        }
      }

      const updated = choreCompletions.map(c => c.id === completionId ? { ...c, status: 'approved' as const } : c);
      set({ choreCompletions: updated });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  rejectCompletion: async (completionId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('chore_completions')
        .update({ status: 'rejected' })
        .eq('id', completionId);

      if (error) throw error;

      const { choreCompletions } = get();
      const updated = choreCompletions.map(c => c.id === completionId ? { ...c, status: 'rejected' as const } : c);
      set({ choreCompletions: updated });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getRewards: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('family_id', familyId);

      if (error) throw error;
      set({ rewards: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createReward: async (reward) => {
    set({ error: null });
    try {
      const { data, error } = await supabase
        .from('rewards')
        .insert(reward)
        .select()
        .single();

      if (error) throw error;
      const { rewards } = get();
      set({ rewards: [...rewards, data] });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateReward: async (rewardId: string, updates) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('rewards')
        .update(updates)
        .eq('id', rewardId);

      if (error) throw error;

      const { rewards } = get();
      const updated = rewards.map(r => r.id === rewardId ? { ...r, ...updates } : r);
      set({ rewards: updated });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteReward: async (rewardId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('rewards')
        .delete()
        .eq('id', rewardId);

      if (error) throw error;

      const { rewards } = get();
      set({ rewards: rewards.filter(r => r.id !== rewardId) });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  claimReward: async (rewardId: string, childId: string) => {
    set({ error: null });
    try {
      // Get reward and child info
      const reward = get().rewards.find(r => r.id === rewardId);
      const child = get().children.find(c => c.id === childId);

      if (!reward || !child) throw new Error('Reward or child not found');

      if (child.points < reward.points_required) {
        throw new Error('Not enough points');
      }

      // Create claim request (points NOT deducted until approved)
      const { data, error } = await supabase
        .from('reward_claims')
        .insert({ 
          reward_id: rewardId, 
          child_id: childId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      const { rewardClaims } = get();
      set({
        rewardClaims: [...rewardClaims, data],
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getRewardClaims: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('reward_claims')
        .select('*')
        .in('child_id', (
          await supabase
            .from('children')
            .select('id')
            .eq('family_id', familyId)
        ).data?.map(c => c.id) || []);

      if (error) throw error;
      set({ rewardClaims: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  approveRewardClaim: async (claimId: string, approverId: string) => {
    set({ error: null });
    try {
      // Get the claim first
      const claim = get().rewardClaims.find(c => c.id === claimId);
      if (!claim) throw new Error('Claim not found');

      // Get reward and child
      const reward = get().rewards.find(r => r.id === claim.reward_id);
      const child = get().children.find(c => c.id === claim.child_id);
      if (!reward || !child) throw new Error('Reward or child not found');

      // Check if child still has enough points
      if (child.points < reward.points_required) {
        throw new Error('Child no longer has enough points');
      }

      // Deduct points from child
      const { error: updateError } = await supabase
        .from('children')
        .update({ points: child.points - reward.points_required })
        .eq('id', claim.child_id);

      if (updateError) throw updateError;

      // Update claim status
      const { error } = await supabase
        .from('reward_claims')
        .update({ 
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (error) throw error;

      // Update local state
      const { rewardClaims, children } = get();
      set({
        rewardClaims: rewardClaims.map(c => 
          c.id === claimId 
            ? { ...c, status: 'approved' as const, approved_by: approverId, approved_at: new Date().toISOString() }
            : c
        ),
        children: children.map(c => 
          c.id === claim.child_id 
            ? { ...c, points: child.points - reward.points_required }
            : c
        ),
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  rejectRewardClaim: async (claimId: string, approverId: string) => {
    set({ error: null });
    try {
      // Update claim status (no points deducted)
      const { error } = await supabase
        .from('reward_claims')
        .update({ 
          status: 'rejected',
          approved_by: approverId,
          approved_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (error) throw error;

      // Update local state
      const { rewardClaims } = get();
      set({
        rewardClaims: rewardClaims.map(c => 
          c.id === claimId 
            ? { ...c, status: 'rejected' as const, approved_by: approverId, approved_at: new Date().toISOString() }
            : c
        ),
      });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getJoinRequests: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending');

      if (error) throw error;
      set({ joinRequests: data || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  createJoinRequest: async (familyId: string, userId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('join_requests')
        .insert({ family_id: familyId, user_id: userId });

      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  approveJoinRequest: async (requestId: string, userId: string) => {
    set({ error: null });
    try {
      const { data: request } = await supabase
        .from('join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) throw new Error('Request not found');

      // Get user info
      const { data: userData } = await supabase
        .from('users')
        .select('display_name, role')
        .eq('id', request.user_id)
        .single();

      // Only add as child if the user is a child role
      if (userData?.role === 'child') {
        await supabase
          .from('children')
          .insert({
            family_id: request.family_id,
            user_id: request.user_id,
            display_name: userData?.display_name || 'Child',
          });
      }
      // If parent role, they just join the family without a children record

      // Update user's family
      await supabase
        .from('users')
        .update({ family_id: request.family_id })
        .eq('id', request.user_id);

      // Mark request as approved
      const { error } = await supabase
        .from('join_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (error) throw error;

      const { joinRequests } = get();
      set({ joinRequests: joinRequests.filter(r => r.id !== requestId) });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  rejectJoinRequest: async (requestId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      const { joinRequests } = get();
      set({ joinRequests: joinRequests.filter(r => r.id !== requestId) });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  getParentJoinRequests: async (familyId: string) => {
    set({ loading: true, error: null });
    try {
      console.log('Getting parent join requests for family:', familyId);
      
      // First get the requests
      const { data: requests, error: requestsError } = await supabase
        .from('parent_join_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'pending');

      if (requestsError) throw requestsError;

      // If requests include display_name/user_email (denormalized), use them directly.
      if (requests && requests.length > 0) {
        const hasDenormalized = !!requests[0].display_name || !!requests[0].user_email;

        if (hasDenormalized) {
          console.log('Parent join requests (denormalized) result:', requests);
          set({ parentJoinRequests: requests });
        } else {
          // Fallback: attempt to fetch user records (may be blocked by RLS)
          const userIds = requests.map(r => r.user_id);
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, display_name, email')
            .in('id', userIds);

          if (usersError) throw usersError;

          // Merge user data into requests
          const enrichedRequests = requests.map(request => ({
            ...request,
            users: users?.find(u => u.id === request.user_id)
          }));

          console.log('Parent join requests result:', enrichedRequests);
          set({ parentJoinRequests: enrichedRequests });
        }
      } else {
        console.log('Parent join requests result:', []);
        set({ parentJoinRequests: [] });
      }
    } catch (error: any) {
      console.error('Error getting parent join requests:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  approveParentJoinRequest: async (requestId: string) => {
    set({ error: null });
    try {
      // Use RPC function to bypass RLS restrictions
      const { data, error } = await supabase.rpc('approve_parent_join_request', { request_id: requestId });

      if (error) throw error;

      console.log('Parent join request approved via RPC:', data);

      const { parentJoinRequests } = get();
      set({ parentJoinRequests: parentJoinRequests.filter(r => r.id !== requestId) });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  rejectParentJoinRequest: async (requestId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('parent_join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      const { parentJoinRequests } = get();
      set({ parentJoinRequests: parentJoinRequests.filter(r => r.id !== requestId) });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  cancelParentJoinRequest: async (requestId: string) => {
    set({ error: null });
    try {
      console.log('Cancelling parent join request via RPC:', requestId);
      const { data, error } = await supabase.rpc('cancel_parent_join_request', { request_id: requestId });

      if (error) throw error;

      // Remove from local cache if present
      const { parentJoinRequests } = get();
      if (parentJoinRequests && parentJoinRequests.length > 0) {
        set({ parentJoinRequests: parentJoinRequests.filter(r => r.id !== requestId) });
      }

      console.log('Cancelled parent join request via RPC, result:', data);
      return data;
    } catch (error: any) {
      console.error('Error cancelling parent join request:', error);
      set({ error: error.message });
      throw error;
    }
  },

  setParentPin: async (familyId: string, pin: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('families')
        .update({ parent_pin: pin })
        .eq('id', familyId);

      if (error) throw error;

      // Update local family state
      const { family } = get();
      if (family && family.id === familyId) {
        set({ family: { ...family, parent_pin: pin } });
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  verifyParentPin: async (familyId: string, pin: string) => {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('parent_pin')
        .eq('id', familyId)
        .single();

      if (error) throw error;

      return data?.parent_pin === pin;
    } catch (error: any) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  },

  hasParentPin: async (familyId: string) => {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('parent_pin')
        .eq('id', familyId)
        .single();

      if (error) throw error;

      return !!data?.parent_pin;
    } catch (error: any) {
      console.error('Error checking PIN:', error);
      return false;
    }
  },

  setFamily: (family) => set({ family }),
  setError: (error) => set({ error }),
}));
