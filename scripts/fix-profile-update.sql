-- Create a SECURITY DEFINER function to update user profile (bypasses RLS)
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_display_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  UPDATE users
  SET display_name = p_display_name
  WHERE id = auth.uid()
  RETURNING json_build_object('id', id, 'display_name', display_name) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(text) TO authenticated;
