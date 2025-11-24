-- EMERGENCY FIX: Completely remove recursive policies

-- 1. Drop ALL policies on users table
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read family members" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Family owner can update family members" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- 2. Recreate non-recursive user policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can read family members" ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR family_id = public.current_user_family_id()
  );

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
    -- Simply allow if family_id is null (removal) OR if it matches a family you own
    users.family_id IS NULL
    OR users.family_id IN (
      SELECT id FROM public.families WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
