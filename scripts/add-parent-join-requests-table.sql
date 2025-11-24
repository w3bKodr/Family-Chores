-- Add parent_join_requests table
-- This tracks pending parent join requests that need approval from the family owner

CREATE TABLE IF NOT EXISTS public.parent_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL,
  user_id UUID NOT NULL,
  display_name TEXT,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_parent_request UNIQUE (family_id, user_id)
);

GRANT SELECT ON public.parent_join_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_join_requests TO authenticated;

-- Enable realtime
ALTER TABLE public.parent_join_requests REPLICA IDENTITY FULL;

-- RLS Policies
ALTER TABLE public.parent_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own parent join requests" ON public.parent_join_requests
  FOR SELECT USING (
    user_id = auth.uid()
    OR family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Users can insert own parent join requests" ON public.parent_join_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Family owners can update parent join requests" ON public.parent_join_requests
  FOR UPDATE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

CREATE POLICY "Family owners can delete parent join requests" ON public.parent_join_requests
  FOR DELETE USING (
    family_id IN (SELECT id FROM public.families WHERE parent_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_parent_join_requests_family_id ON public.parent_join_requests(family_id);
CREATE INDEX idx_parent_join_requests_user_id ON public.parent_join_requests(user_id);
CREATE INDEX idx_parent_join_requests_status ON public.parent_join_requests(status);
