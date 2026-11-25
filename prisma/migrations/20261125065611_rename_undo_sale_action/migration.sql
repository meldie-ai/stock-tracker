-- Undo now covers more than just sales (stock adjustments too), so the enum
-- value is generalized from UNDO_SALE to UNDO. Existing AuditLog rows keep
-- their meaning unchanged - Postgres enum values are stored by reference, so
-- renaming the label updates every row pointing to it automatically.
ALTER TYPE "AuditAction" RENAME VALUE 'UNDO_SALE' TO 'UNDO';
