-- Simplified test - just check if both clauses pass
WITH policy_test AS (
  SELECT 
    'ab4850af-bb1a-44c2-a7dc-05c69c0b232c'::uuid as auth_user_id,
    'f65423b8-852c-45fd-8530-c4bbfd3da539'::uuid as target_user_id
)
SELECT
  (
    auth_user_id = target_user_id
    OR 
    EXISTS (
      SELECT 1 FROM families f
      INNER JOIN users u ON u.id = target_user_id
      WHERE f.id = u.family_id
      AND f.parent_id = auth_user_id
    )
  ) as using_clause_passes,
  
  (
    auth_user_id = target_user_id
    OR
    EXISTS (
      SELECT 1 FROM families
      WHERE parent_id = auth_user_id
    )
  ) as with_check_clause_passes
FROM policy_test;
