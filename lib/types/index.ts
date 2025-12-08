export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  family_id: string | null;
  created_at: string;
  display_name: string;
  emoji?: string;
}

export interface Family {
  id: string;
  name: string;
  family_code: string;
  parent_id: string;
  created_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  emoji: string;
  points: number;
  status: 'pending' | 'approved' | 'rejected';
  joined_at: string;
  order?: number; // For sorting children in UI
}

export interface Chore {
  id: string;
  family_id: string;
  assigned_to: string;
  title: string;
  description: string | null;
  points: number;
  emoji: string;
  repeating_days: string[];
  created_at: string;
  updated_at: string;
}

export interface ChoreCompletion {
  id: string;
  chore_id: string;
  completed_by: string;
  completed_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
}

export interface Reward {
  id: string;
  family_id: string;
  title: string;
  points_required: number;
  emoji: string;
  image_url: string | null;
  created_at: string;
}

export interface RewardClaim {
  id: string;
  reward_id: string;
  child_id: string;
  claimed_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
}

export interface JoinRequest {
  id: string;
  family_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_email: string;
}

export interface ParentJoinRequest {
  id: string;
  family_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  display_name?: string | null;
  user_email?: string | null;
}
