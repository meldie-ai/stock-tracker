-- The account-creation route used to force every username to lowercase, so the casing
-- typed at creation ("Minsel@kp") was discarded before it ever reached the database.
-- Login/creation are now case-insensitive instead of relying on both sides being
-- pre-lowercased, so this restores the one existing account's intended casing.
UPDATE "User" SET username = 'Minsel@kp' WHERE username = 'minsel@kp';
