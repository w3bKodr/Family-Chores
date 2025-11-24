-- Check EXACTLY what the current policy is
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'UPDATE'
ORDER BY policyname;

-- Also check if there are any other policies that might interfere
SELECT 
  policyname,
  cmd,
  permissive,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd, policyname;
