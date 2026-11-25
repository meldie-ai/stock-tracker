-- Lets an admin permanently delete a deactivated staff account. Shift,
-- audit log, and login-attempt rows already pointed at User with
-- ON DELETE SET NULL plus a usernameSnapshot/productNameSnapshot-style
-- column, so they survive deletion unchanged. Shift.startedByUserId was
-- the one holdout (required, ON DELETE RESTRICT) — this adds the matching
-- snapshot and relaxes it the same way.

ALTER TABLE "Shift" ADD COLUMN "startedByUsernameSnapshot" TEXT;
ALTER TABLE "Shift" ADD COLUMN "endedByUsernameSnapshot" TEXT;

UPDATE "Shift" s
SET "startedByUsernameSnapshot" = u.username
FROM "User" u
WHERE u.id = s."startedByUserId";

UPDATE "Shift" s
SET "endedByUsernameSnapshot" = u.username
FROM "User" u
WHERE u.id = s."endedByUserId";

-- Every existing row has a startedByUserId today, so this is just a safety
-- net before the NOT NULL below, not an expected case.
UPDATE "Shift" SET "startedByUsernameSnapshot" = 'Unknown' WHERE "startedByUsernameSnapshot" IS NULL;

ALTER TABLE "Shift" ALTER COLUMN "startedByUsernameSnapshot" SET NOT NULL;

ALTER TABLE "Shift" ALTER COLUMN "startedByUserId" DROP NOT NULL;

ALTER TABLE "Shift" DROP CONSTRAINT "Shift_startedByUserId_fkey";
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_startedByUserId_fkey"
  FOREIGN KEY ("startedByUserId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
