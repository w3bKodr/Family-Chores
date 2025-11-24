-- Drop existing update policies (if any)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Family owner can remove parents from family" ON public.users;
DROP POLICY IF EXISTS "Users can update profiles" ON public.users;
DROP POLICY IF EXISTS "Family owner can update family members" ON public.users;

-- Split into two policies: one for self-updates, one for family owner removals
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
