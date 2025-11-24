-- Debug why the update is failing

-- 1. Check your user ID
SELECT 'Your user ID:' as info, auth.uid() as user_id;

-- 2. Check YOUR family membership
SELECT 'Your family membership:' as info, id, display_name, family_id, role
FROM public.users
WHERE id = auth.uid();

-- 3. Check the family details and who owns it
SELECT 'Family details:' as info, f.id, f.name, f.parent_id as owner_id, u.display_name as owner_name
FROM public.families f
LEFT JOIN public.users u ON u.id = f.parent_id
WHERE f.id IN (SELECT family_id FROM public.users WHERE id = auth.uid());

-- 4. Check all parents in this family
SELECT 'All parents in family:' as info, id, display_name, family_id, role,
  CASE WHEN id = auth.uid() THEN 'YOU' ELSE '' END as is_you
FROM public.users
WHERE family_id = (SELECT family_id FROM public.users WHERE id = auth.uid())
AND role = 'parent';
