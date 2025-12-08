# Child Reordering Feature - Database Migration

## Overview
This migration adds a `order` column to the `children` table to enable drag-and-drop reordering of children on the family management screen.

## How to Run

### Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** section
3. Click **New Query**
4. Copy the contents of this file: `scripts/add-child-order.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute

### What This Migration Does
1. **Adds `order` column** to the `children` table with a default value of 0
2. **Populates existing children** with order values based on when they were added (oldest first)
3. **Creates an index** on `(family_id, order)` for efficient sorting

## Testing the Feature

After running the migration:

1. Navigate to **Family Tab** → **Manage Family**
2. Click **"Reorder Children"** button
3. Use the ↑ and ↓ arrows on each child card to move them up or down
4. Click **"Save Order"** to persist the changes or **"Cancel"** to discard

The new child order will also be reflected on:
- **Parent Dashboard** - Children appear in the order under "Chore Tracker"
- **Any other page** showing children in a list

## Rollback (if needed)

To revert this migration:
```sql
ALTER TABLE public.children DROP COLUMN IF EXISTS "order";
DROP INDEX IF EXISTS idx_children_family_order;
```

## Notes
- The order is stored as an integer starting from 0
- Children are automatically sorted by this order value in all queries
- The migration is idempotent (safe to run multiple times)
