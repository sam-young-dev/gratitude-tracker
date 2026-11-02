-- Privileges for the limited runtime role `app_user` (created by
-- scripts/create-app-role.mjs). It has no BYPASSRLS, so the row-level security
-- policies in 0002 apply to it. Skipped when the role doesn't exist yet, so a
-- fresh database can still migrate; run the script and migrate again.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
  END IF;
END
$$;
