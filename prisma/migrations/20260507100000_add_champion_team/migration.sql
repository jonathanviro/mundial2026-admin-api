-- Drop obsolete flag columns from matches (already removed from schema)
ALTER TABLE "matches" DROP COLUMN IF EXISTS "flag_local",
                     DROP COLUMN IF EXISTS "flag_visitor";

-- Add champion_team to registrations
ALTER TABLE "registrations" ADD COLUMN "champion_team" TEXT;
