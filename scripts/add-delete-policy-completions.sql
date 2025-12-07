-- Add DELETE policy for chore_completions to allow parents to reject/delete completions
-- This allows parents to delete chore completions when rejecting work

CREATE POLICY "Parents can delete completions" ON public.chore_completions
  FOR DELETE USING (
    chore_id IN (
      SELECT id FROM public.chores 
      WHERE family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
    )
  );

-- Verify the policy was created
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'chore_completions' 
ORDER BY policyname;
