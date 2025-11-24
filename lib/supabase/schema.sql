-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Function to generate a short family code
CREATE OR REPLACE FUNCTION generate_family_code() RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  done BOOL;
BEGIN
  done := false;
  WHILE NOT done LOOP
    -- Generate a 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    -- Check if it already exists
    done := NOT EXISTS(SELECT 1 FROM families WHERE family_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  family_id UUID,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT SELECT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Family table (create before adding FK to users)
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  family_code TEXT NOT NULL UNIQUE DEFAULT generate_family_code(),
  parent_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);

GRANT SELECT ON public.families TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.families TO authenticated;

-- Add FK constraint to users table after families exists
ALTER TABLE public.users ADD CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;

-- Join requests table (for children to request to join family)
CREATE TABLE IF NOT EXISTS public.join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_request UNIQUE (family_id, user_id)
);

GRANT SELECT ON public.join_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_requests TO authenticated;

-- Parent join requests table (for parents to request to join family - requires owner approval)
CREATE TABLE IF NOT EXISTS public.parent_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_parent_request UNIQUE (family_id, user_id)
);

GRANT SELECT ON public.parent_join_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_join_requests TO authenticated;

-- Children table
-- Supports up to 15 children per family, can be guest children without user accounts (user_id NULL)
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  user_id UUID,
  display_name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '👶',
  points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Only enforce uniqueness on user_id when it's not null (allows multiple guest children)
CREATE UNIQUE INDEX IF NOT EXISTS unique_child_user ON public.children (family_id, user_id) 
WHERE user_id IS NOT NULL;

GRANT SELECT ON public.children TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.children TO authenticated;

-- Chores table
CREATE TABLE IF NOT EXISTS public.chores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  assigned_to UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '✓',
  repeating_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT fk_assigned_to FOREIGN KEY (assigned_to) REFERENCES children(id) ON DELETE CASCADE
);

GRANT SELECT ON public.chores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chores TO authenticated;

-- Chore completions table
CREATE TABLE IF NOT EXISTS public.chore_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chore_id UUID NOT NULL,
  completed_by UUID NOT NULL,
  completed_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_chore FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE,
  CONSTRAINT fk_completed_by FOREIGN KEY (completed_by) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT unique_completion UNIQUE (chore_id, completed_date, completed_by)
);

GRANT SELECT ON public.chore_completions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chore_completions TO authenticated;

-- Rewards table
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  title TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🎁',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

GRANT SELECT ON public.rewards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO authenticated;

-- Reward claims table
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reward_id UUID NOT NULL,
  child_id UUID NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_reward FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
  CONSTRAINT fk_child FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  CONSTRAINT unique_claim UNIQUE (reward_id, child_id)
);

GRANT SELECT ON public.reward_claims TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_claims TO authenticated;

-- Enable realtime
ALTER TABLE public.chores REPLICA IDENTITY FULL;
ALTER TABLE public.chore_completions REPLICA IDENTITY FULL;
ALTER TABLE public.children REPLICA IDENTITY FULL;
ALTER TABLE public.rewards REPLICA IDENTITY FULL;
ALTER TABLE public.reward_claims REPLICA IDENTITY FULL;
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.parent_join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.families REPLICA IDENTITY FULL;

-- RLS Policies

-- Users table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper to read current user's family without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.current_user_family_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Function to remove a parent from family (bypasses RLS issues)
CREATE OR REPLACE FUNCTION public.remove_parent_from_family(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if caller is the family owner
  IF NOT EXISTS (
    SELECT 1 FROM families f
    INNER JOIN users u ON u.id = target_user_id
    WHERE f.id = u.family_id
    AND f.parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only family owner can remove parents';
  END IF;

  -- Prevent owner from removing themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself, use leave family instead';
  END IF;

  -- Update the user's family_id to null
  UPDATE users
  SET family_id = NULL
  WHERE id = target_user_id
  RETURNING json_build_object('id', id, 'display_name', display_name) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_parent_from_family(uuid) TO authenticated;

CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Family owner can update family members" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.families
      WHERE id = users.family_id
      AND parent_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Allow if actor owns a family AND (setting to NULL OR setting to their family)
    users.family_id IS NULL AND EXISTS (
      SELECT 1 FROM public.families WHERE parent_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.families
      WHERE parent_id = auth.uid() AND id = users.family_id
    )
  );

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read family members" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR family_id = public.current_user_family_id()
  );

-- Families table policies
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own family" ON public.families
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Family members can read own family" ON public.families
  FOR SELECT USING (
    parent_id = auth.uid()
    OR id = public.current_user_family_id()
  );

CREATE POLICY "Anyone can read families by family_code for joining" ON public.families
  FOR SELECT USING (true);

CREATE POLICY "Parents can insert family" ON public.families
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update own family" ON public.families
  FOR UPDATE USING (parent_id = auth.uid());

-- Children table policies
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read children" ON public.children
  FOR SELECT USING (
    family_id = public.current_user_family_id()
  );

CREATE POLICY "Parents can insert children" ON public.children
  FOR INSERT WITH CHECK (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can update children" ON public.children
  FOR UPDATE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can delete children" ON public.children
  FOR DELETE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

-- Join requests table policies
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own join requests" ON public.join_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Users can insert join requests" ON public.join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Parents can update join requests" ON public.join_requests
  FOR UPDATE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

-- Parent join requests table policies
ALTER TABLE public.parent_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own parent join requests" ON public.parent_join_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Users can insert own parent join requests" ON public.parent_join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Family owners can update parent join requests" ON public.parent_join_requests
  FOR UPDATE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Family owners can delete parent join requests" ON public.parent_join_requests
  FOR DELETE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

-- Chores table policies
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read chores" ON public.chores
  FOR SELECT USING (
    family_id = public.current_user_family_id()
  );

CREATE POLICY "Parents can insert chores" ON public.chores
  FOR INSERT WITH CHECK (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can update chores" ON public.chores
  FOR UPDATE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can delete chores" ON public.chores
  FOR DELETE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

-- Chore completions table policies
ALTER TABLE public.chore_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read completions" ON public.chore_completions
  FOR SELECT USING (
    chore_id IN (
      SELECT id FROM public.chores 
      WHERE family_id = public.current_user_family_id()
    )
  );

CREATE POLICY "Children can insert completions" ON public.chore_completions
  FOR INSERT WITH CHECK (
    completed_by IN (
      SELECT id FROM public.children WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update completions" ON public.chore_completions
  FOR UPDATE USING (
    chore_id IN (
      SELECT id FROM public.chores 
      WHERE family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
    )
  );

-- Rewards table policies
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read rewards" ON public.rewards
  FOR SELECT USING (
    family_id = public.current_user_family_id()
  );

CREATE POLICY "Parents can insert rewards" ON public.rewards
  FOR INSERT WITH CHECK (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can update rewards" ON public.rewards
  FOR UPDATE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Parents can delete rewards" ON public.rewards
  FOR DELETE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

-- Reward claims table policies
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read claims" ON public.reward_claims
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM public.children WHERE family_id = public.current_user_family_id()
    )
  );

CREATE POLICY "Children can claim rewards" ON public.reward_claims
  FOR INSERT WITH CHECK (
    child_id IN (SELECT id FROM public.children WHERE user_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_users_family_id ON public.users(family_id);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_families_parent_id ON public.families(parent_id);
CREATE INDEX idx_families_family_code ON public.families(family_code);
CREATE INDEX idx_children_family_id ON public.children(family_id);
CREATE INDEX idx_children_user_id ON public.children(user_id);
CREATE INDEX idx_join_requests_family_id ON public.join_requests(family_id);
CREATE INDEX idx_join_requests_user_id ON public.join_requests(user_id);
CREATE INDEX idx_parent_join_requests_family_id ON public.parent_join_requests(family_id);
CREATE INDEX idx_parent_join_requests_user_id ON public.parent_join_requests(user_id);
CREATE INDEX idx_parent_join_requests_status ON public.parent_join_requests(status);
CREATE INDEX idx_chores_family_id ON public.chores(family_id);
CREATE INDEX idx_chores_assigned_to ON public.chores(assigned_to);
CREATE INDEX idx_chore_completions_chore_id ON public.chore_completions(chore_id);
CREATE INDEX idx_chore_completions_completed_by ON public.chore_completions(completed_by);
CREATE INDEX idx_chore_completions_completed_date ON public.chore_completions(completed_date);
CREATE INDEX idx_rewards_family_id ON public.rewards(family_id);
CREATE INDEX idx_reward_claims_reward_id ON public.reward_claims(reward_id);
CREATE INDEX idx_reward_claims_child_id ON public.reward_claims(child_id);
