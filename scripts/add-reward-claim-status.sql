-- Add status field to reward_claims table for approval workflow
-- Status: pending (child requested), approved (parent approved), rejected (parent rejected)

-- Add status column with default 'pending'
ALTER TABLE public.reward_claims 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add approved_by column to track which parent approved/rejected
ALTER TABLE public.reward_claims 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Add approved_at timestamp
ALTER TABLE public.reward_claims 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Remove the unique constraint on (reward_id, child_id) so children can claim same reward multiple times
-- First drop the existing constraint if it exists
ALTER TABLE public.reward_claims DROP CONSTRAINT IF EXISTS unique_claim;

-- Update RLS policies to allow parents to update claims
DROP POLICY IF EXISTS "Parents can update claims" ON public.reward_claims;

CREATE POLICY "Parents can update claims" ON public.reward_claims
FOR UPDATE
USING (
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT id FROM families WHERE parent_id = auth.uid()
    )
  )
  OR
  child_id IN (
    SELECT id FROM children 
    WHERE family_id IN (
      SELECT family_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON public.reward_claims(status);
