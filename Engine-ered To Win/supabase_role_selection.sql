-- ============================================================
-- AeroTwin | Role Selection RPC Function
-- ============================================================
-- Allows first-time users to set their operational role.
-- Only works if the current role is 'viewer' (the default) or 'unset'.
-- After setting, the protect_role_column trigger in
-- supabase_profiles_setup.sql prevents further client-side changes.
--
-- Run this in Supabase SQL Editor AFTER supabase_profiles_setup.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_initial_role(new_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only allow setting role if it's currently 'viewer' (default) or 'unset'
  UPDATE public.profiles
  SET role = new_role,
      updated_at = now()
  WHERE id = auth.uid()
    AND (role = 'viewer' OR role = 'unset' OR role IS NULL)
    AND new_role IN ('gcs_operator', 'propulsion_engineer', 'maintenance_tech');

  -- If no rows were updated, the role was already set or the new_role was invalid
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role has already been set or invalid role specified.';
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.set_initial_role(TEXT) TO authenticated;

-- ✅ DONE
-- After running this, users can call:
--   supabase.rpc('set_initial_role', { new_role: 'gcs_operator' })
-- from the frontend exactly once (when their role is still 'viewer').
