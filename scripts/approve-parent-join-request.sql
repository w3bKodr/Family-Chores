-- RPC function to approve parent join requests (bypasses RLS)
CREATE OR REPLACE FUNCTION public.approve_parent_join_request(request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request parent_join_requests;
  result json;
BEGIN
  -- Fetch the request and validate caller is the family owner
  SELECT * INTO request
  FROM parent_join_requests
  WHERE id = request_id
  AND family_id IN (SELECT id FROM families WHERE parent_id = auth.uid());

  IF request IS NULL THEN
    RAISE EXCEPTION 'Request not found or you do not have permission to approve it';
  END IF;

  -- Update the requesting user's family_id
  UPDATE users
  SET family_id = request.family_id
  WHERE id = request.user_id
  RETURNING json_build_object('id', id, 'family_id', family_id, 'display_name', display_name) INTO result;

  -- Mark the request as approved
  UPDATE parent_join_requests
  SET status = 'approved'
  WHERE id = request_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_parent_join_request(uuid) TO authenticated;
