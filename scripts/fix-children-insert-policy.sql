-- Remove the incorrectly added policy
DROP POLICY IF EXISTS "Parents can insert children via join approval" ON public.children;

-- Verify remaining policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'children';
