-- Allow parents to rejoin by cleaning up old requests
-- This function is called when approving or cancelling parent requests

-- Function to create or update parent join request (idempotent)
CREATE OR REPLACE FUNCTION public.create_or_update_parent_join_request(
  p_family_id uuid,
  p_user_id uuid,
  p_display_name text,
  p_user_email text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request parent_join_requests;
  result json;
BEGIN
  -- Try to get existing request
  SELECT * INTO request
  FROM parent_join_requests
  WHERE family_id = p_family_id AND user_id = p_user_id;

  IF request IS NULL THEN
    -- Create new request
    INSERT INTO parent_join_requests (family_id, user_id, display_name, user_email, status)
    VALUES (p_family_id, p_user_id, p_display_name, p_user_email, 'pending')
    RETURNING * INTO request;
  ELSE
    -- Update existing request to pending (allows re-requesting)
    UPDATE parent_join_requests
    SET status = 'pending', display_name = p_display_name, user_email = p_user_email
    WHERE family_id = p_family_id AND user_id = p_user_id
    RETURNING * INTO request;
  END IF;

  RETURN json_build_object(
    'id', request.id,
    'family_id', request.family_id,
    'user_id', request.user_id,
    'status', request.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_update_parent_join_request(uuid, uuid, text, text) TO authenticated;

-- Update remove_parent_from_family to delete old join requests
CREATE OR REPLACE FUNCTION public.remove_parent_from_family(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  family_uuid uuid;
  result json;
BEGIN
  -- Check if caller is the family owner and get family_id
  SELECT f.id INTO family_uuid
  FROM families f
  INNER JOIN users u ON u.id = target_user_id
  WHERE f.id = u.family_id
  AND f.parent_id = auth.uid();

  IF family_uuid IS NULL THEN
    RAISE EXCEPTION 'Only family owner can remove parents';
  END IF;

  -- Prevent owner from removing themselves
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself, use leave family instead';
  END IF;

  -- Delete any old parent join requests for this user so they can rejoin
  DELETE FROM parent_join_requests
  WHERE family_id = family_uuid AND user_id = target_user_id;

  -- Update the user's family_id to null
  UPDATE users
  SET family_id = NULL
  WHERE id = target_user_id
  RETURNING json_build_object('id', id, 'display_name', display_name) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_parent_from_family(uuid) TO authenticated;
