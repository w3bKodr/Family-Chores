-- Verify the exact query in the WITH CHECK clause
-- Replace 'ab4850af-bb1a-44c2-a7dc-05c69c0b232c' with your actual user ID

-- This simulates what happens in the WITH CHECK
SELECT 
  'Does family exist where you are parent_id?' as question,
  EXISTS (
    SELECT 1 FROM families 
    WHERE parent_id = 'ab4850af-bb1a-44c2-a7dc-05c69c0b232c'
  ) as result;

-- Let's also see the actual families table
SELECT * FROM families;

-- And let's manually test the exact WITH CHECK condition
SELECT 
  'WITH CHECK evaluation:' as test,
  (
    'ab4850af-bb1a-44c2-a7dc-05c69c0b232c' = 'f65423b8-852c-45fd-8530-c4bbfd3da539'
    OR EXISTS (
      SELECT 1 FROM families 
      WHERE parent_id = 'ab4850af-bb1a-44c2-a7dc-05c69c0b232c'
    )
  ) as should_pass;
