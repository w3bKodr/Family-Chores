-- Nuclear option: Drop and recreate with explicit public schema everywhere

DROP POLICY IF EXISTS "Users can update profiles" ON public.users;

CREATE POLICY "Users can update profiles" ON public.users
  FOR UPDATE 
  USING (
    auth.uid() = public.users.id
    OR EXISTS (
      SELECT 1 FROM public.families
      WHERE public.families.id = public.users.family_id
      AND public.families.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = public.users.id
    OR EXISTS (
      SELECT 1 FROM public.families 
      WHERE public.families.parent_id = auth.uid()
    )
  );

-- Verify
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users' AND cmd = 'UPDATE';
