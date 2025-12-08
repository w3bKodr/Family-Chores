-- Add order column to children table for drag-and-drop reordering
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Populate existing children with order based on joined_at (oldest first)
-- Using CTE because window functions are not allowed directly in UPDATE
WITH ranks AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY family_id ORDER BY joined_at ASC) - 1 AS rn
  FROM public.children
)
UPDATE public.children c
SET "order" = r.rn
FROM ranks r
WHERE c.id = r.id;

-- Create index on family_id and order for efficient sorting
CREATE INDEX IF NOT EXISTS idx_children_family_order ON public.children(family_id, "order");
