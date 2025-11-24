-- Create a function to remove a parent from family
-- This function runs with SECURITY DEFINER but checks permissions explicitly

CREATE OR REPLACE FUNCTION remove_parent_from_family(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  -- Check if caller is the family owner
  IF NOT EXISTS (
    SELECT 1 FROM families f
    INNER JOIN users u ON u.id = target_user_id
    WHERE f.id = u.family_id
    AND f.parent_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only family owner can remove parents';
  END IF;

  -- Prevent owner from removing themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself, use leave family instead';
  END IF;

  -- Update the user's family_id to null
  UPDATE users
  SET family_id = NULL
  WHERE id = target_user_id
  RETURNING json_build_object('id', id, 'display_name', display_name) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION remove_parent_from_family(uuid) TO authenticated;
