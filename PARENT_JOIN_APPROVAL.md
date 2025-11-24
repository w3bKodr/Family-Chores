# Parent Join Approval Feature

## Overview
Parents who join a family using a family code now require approval from the family owner before they can access the family data.

## Changes Made

### 1. Database Changes
- **New Table**: `parent_join_requests`
  - Tracks pending parent join requests
  - Fields: `id`, `family_id`, `user_id`, `status`, `created_at`, `updated_at`
  - Status values: `pending`, `approved`, `rejected`
  - RLS policies to ensure only family owners can approve/reject

**To apply**: Run the SQL in `scripts/add-parent-join-requests-table.sql` in your Supabase SQL Editor.

### 2. Type Updates
- Added `ParentJoinRequest` interface to `lib/types/index.ts`

### 3. Join Flow Updates (`app/(app)/parent/join-family.tsx`)
- **Before**: Parents directly joined the family when entering a valid family code
- **After**: Parents create a join request that shows as "pending" until approved
- Children still join directly without approval (existing behavior)

### 4. Family Store Updates (`lib/store/familyStore.ts`)
- Added `parentJoinRequests` state
- Added `getParentJoinRequests()` - Fetches pending parent requests
- Added `approveParentJoinRequest()` - Approves and adds parent to family
- Added `rejectParentJoinRequest()` - Rejects the request

### 5. UI Updates (`app/(app)/family/manage.tsx`)
- New section: "👔 Pending Parents" appears when there are pending requests
- Shows parent's name and email
- Approve (✓) and Reject (✗) buttons for each request
- Badge shows count of pending parent requests
- Automatically refreshes parent list after approval

## User Flow

### For Parents Joining:
1. Enter family code on "Join Family" screen
2. See success message: "Your request to join [Family Name] has been sent! Wait for the family owner to approve."
3. Request shows as pending in the database
4. Wait for family owner to approve

### For Family Owners:
1. Navigate to Family > Manage
2. See "👔 Pending Parents" section (only if requests exist)
3. Review parent's name and email
4. Tap ✓ to approve or ✗ to reject
5. Approved parents are immediately added to the family
6. Rejected requests are removed from the list

## Technical Details

### Security
- Only family owners can see and approve parent join requests
- RLS policies prevent unauthorized access
- Users can only create join requests for themselves
- All database operations go through secured endpoints

### Data Flow
1. Parent enters family code → Creates `parent_join_requests` record with status='pending'
2. Family owner sees request → Calls `approveParentJoinRequest()`
3. Approval updates user's `family_id` and marks request as 'approved'
4. Parent gains immediate access to family data

### Edge Cases Handled
- Duplicate requests prevented (unique constraint on family_id + user_id)
- Already a member check before creating request
- Owner cannot remove themselves
- Proper error messages for all scenarios
