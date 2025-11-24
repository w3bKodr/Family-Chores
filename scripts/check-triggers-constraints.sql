-- Check for triggers on users table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Check for constraints
SELECT
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE nsp.nspname = 'public'
AND rel.relname = 'users';

-- Try the actual UPDATE command that's failing with service_role bypass
SET ROLE service_role;
UPDATE public.users SET family_id = NULL WHERE id = 'f65423b8-852c-45fd-8530-c4bbfd3da539';
SELECT 'Update succeeded' as result;
RESET ROLE;
