# Database Migration: Fix Children Constraint

## Problem
The `children` table has a unique constraint that prevents adding multiple children without separate user accounts.

## Solution
Run the SQL migration to:
1. Remove the problematic unique constraint
2. Make `user_id` nullable for guest children
3. Add a new constraint that allows multiple null `user_id` values
4. Update RLS policies

## How to Run the Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `scripts/fix-children-constraint.sql`
4. Paste it into the SQL Editor
5. Click "Run" to execute the migration

### Option 2: Via Supabase CLI
```bash
# Make sure you're in the project directory
cd /Users/shawn/Dev/chores

# Run the migration
supabase db execute -f scripts/fix-children-constraint.sql
```

### Option 3: Via psql (if you have direct database access)
```bash
psql YOUR_DATABASE_CONNECTION_STRING < scripts/fix-children-constraint.sql
```

## After Migration
After running the migration, you'll be able to:
- ✅ Add up to 15 children per family
- ✅ Children won't need separate user accounts
- ✅ Each child will have their own record with a null `user_id`
- ✅ Parents can switch between child views to manage chores

## Verification
After the migration, test by:
1. Adding a new child through the app
2. Adding a second child
3. Both should work without errors
