-- Run this in SQL Editor to see family structure (bypasses RLS)

SELECT 
  f.id as family_id,
  f.name as family_name,
  f.parent_id as owner_user_id,
  owner.display_name as owner_name,
  owner.email as owner_email
FROM families f
LEFT JOIN users owner ON owner.id = f.parent_id;

-- Show all parents in each family
SELECT 
  u.id as user_id,
  u.display_name,
  u.email,
  u.family_id,
  f.name as family_name,
  f.parent_id as family_owner_id,
  CASE WHEN u.id = f.parent_id THEN '👑 OWNER' ELSE 'member' END as status
FROM users u
LEFT JOIN families f ON f.id = u.family_id
WHERE u.role = 'parent'
ORDER BY f.name, status DESC;
