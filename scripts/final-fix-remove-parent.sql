-- FINAL FIX for removing parents from family

-- The issue: When you have multiple UPDATE policies, BOTH must pass
-- "Users can update own profile" requires auth.uid() = id (the target user)
-- But you're trying to update ANOTHER parent's row, so that fails!

-- Solution: Make the self-update policy NOT conflict with family owner policy

-- Drop ALL update policies on users table
DROP POLICY IF EXISTS "Family owner can update family members" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Recreate COMBINED policy that handles both cases
CREATE POLICY "Users can update profiles" ON public.users
  FOR UPDATE USING (
    -- Can update if it's your own profile OR if they're in a family you own
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.families
      WHERE id = users.family_id
      AND parent_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Can set to anything if it's your own profile
    -- OR can set to NULL/your-family if you're a family owner
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.families WHERE parent_id = auth.uid())
  );

-- Verify the policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'UPDATE'
ORDER BY policyname;
