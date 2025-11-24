    -- Test by simulating the exact RLS check
-- This will tell us if the policy logic is correct

WITH policy_test AS (
  SELECT 
    'ab4850af-bb1a-44c2-a7dc-05c69c0b232c'::uuid as auth_user_id,
    'f65423b8-852c-45fd-8530-c4bbfd3da539'::uuid as target_user_id,
    NULL::uuid as new_family_id
)
SELECT
  'USING clause test (can read the row to update):' as test,
  (
    -- auth.uid() = id
    auth_user_id = target_user_id
    OR 
    -- OR EXISTS (families where id = users.family_id AND parent_id = auth.uid())
    EXISTS (
      SELECT 1 FROM families f
      INNER JOIN users u ON u.id = target_user_id
      WHERE f.id = u.family_id
      AND f.parent_id = auth_user_id
    )
  ) as using_passes,
  
  'WITH CHECK clause test (new row is valid):' as test2,
  (
    -- auth.uid() = id (the target user being updated)
    auth_user_id = target_user_id
    OR
    -- OR EXISTS (families where parent_id = auth.uid())
    EXISTS (
      SELECT 1 FROM families
      WHERE parent_id = auth_user_id
    )
  ) as with_check_passes
FROM policy_test;

-- Also show what the UPDATE would actually see
SELECT 
  'Current state of target user:' as info,
  id, display_name, family_id
FROM users 
WHERE id = 'f65423b8-852c-45fd-8530-c4bbfd3da539'::uuid;
