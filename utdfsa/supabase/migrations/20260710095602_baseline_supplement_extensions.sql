-- supplements the 20260710095244_remote_schema.sql baseline.
--
-- `supabase db dump --schema public` does not emit CREATE EXTENSION statements
-- (extensions are installed in the "extensions" schema, not "public"), so they
-- were verified separately against the live database via mcp__supabase__list_extensions
-- and added here by hand to keep the baseline complete.
--
-- Only extensions actually installed AND owned by this application are listed:
--   - plpgsql is a core Postgres default in every database; omitted (implicit).
--   - supabase_vault lives in the platform-managed "vault" schema and is
--     auto-provisioned by Supabase on every project; omitted (not app-owned).
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
