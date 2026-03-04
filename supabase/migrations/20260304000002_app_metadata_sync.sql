-- Migration: Sync role + tenant_id to auth.users app_metadata
-- This allows middleware to read role from JWT without any DB query

-- Function: sync app_metadata when a user is inserted or updated in public.users
CREATE OR REPLACE FUNCTION sync_user_app_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
    'role', NEW.role,
    'tenant_id', NEW.tenant_id
  )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after INSERT or UPDATE of role/tenant_id
DROP TRIGGER IF EXISTS on_user_upsert_sync_metadata ON public.users;
CREATE TRIGGER on_user_upsert_sync_metadata
  AFTER INSERT OR UPDATE OF role, tenant_id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_app_metadata();

-- Backfill app_metadata for all existing users
UPDATE auth.users au
SET raw_app_meta_data = au.raw_app_meta_data || jsonb_build_object(
  'role', pu.role,
  'tenant_id', pu.tenant_id
)
FROM public.users pu
WHERE au.id = pu.id;
