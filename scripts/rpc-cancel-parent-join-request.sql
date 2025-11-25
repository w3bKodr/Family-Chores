-- RPC to cancel a parent join request
-- Allows the request creator or the family owner to delete the request

CREATE OR REPLACE FUNCTION public.cancel_parent_join_request(request_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted json;
BEGIN
  -- Check if the caller is the request owner
  IF EXISTS (SELECT 1 FROM public.parent_join_requests WHERE id = request_id AND user_id = auth.uid()) THEN
    DELETE FROM public.parent_join_requests WHERE id = request_id RETURNING row_to_json(parent_join_requests.*) INTO deleted;
    RETURN deleted;
  END IF;

  -- Or check if caller is the family owner for the request's family
  IF EXISTS (
    SELECT 1 FROM public.parent_join_requests p
    JOIN public.families f ON f.id = p.family_id
    WHERE p.id = request_id AND f.parent_id = auth.uid()
  ) THEN
    DELETE FROM public.parent_join_requests WHERE id = request_id RETURNING row_to_json(parent_join_requests.*) INTO deleted;
    RETURN deleted;
  END IF;

  RAISE EXCEPTION 'Not authorized to cancel this parent join request';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_parent_join_request(uuid) TO authenticated;
