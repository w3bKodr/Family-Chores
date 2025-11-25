-- Add emoji column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '👤';

-- Migrate existing emoji data from display_name to emoji column
UPDATE public.users
SET emoji = substring(display_name, 1, 1),
    display_name = trim(substring(display_name, 2))
WHERE display_name ~ '^[^\w\s]';

-- Create updated function to update user profile
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_display_name text DEFAULT NULL,
  p_emoji text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_display_name text;
  v_emoji text;
BEGIN
  -- Get current values
  SELECT display_name, emoji INTO v_display_name, v_emoji
  FROM users
  WHERE id = auth.uid();

  -- Use provided values or keep existing
  v_display_name := COALESCE(p_display_name, v_display_name);
  v_emoji := COALESCE(p_emoji, v_emoji);

  -- Update the user
  UPDATE users
  SET display_name = v_display_name,
      emoji = v_emoji
  WHERE id = auth.uid()
  RETURNING json_build_object(
    'id', id, 
    'display_name', display_name,
    'emoji', emoji
  ) INTO result;

  IF result IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(text, text) TO authenticated;
