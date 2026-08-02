-- Reverts the one-off casing fix from the previous migration, at the account owner's
-- request (preferred not to have their name capitalized in the codebase/migration
-- history). Usernames are stored as-typed for every account going forward; this just
-- restores this one existing account to how it looked before.
UPDATE "User" SET username = 'minsel@kp' WHERE username = 'Minsel@kp';
