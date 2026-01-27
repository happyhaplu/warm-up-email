-- Migration: Normalize Log Status Values
-- Fix inconsistencies between 'sent'/'SENT', 'replied'/'REPLIED', 'failed'/'FAILED'
-- All status values should be uppercase for consistency

BEGIN;

-- Update all lowercase status values to uppercase
UPDATE logs SET status = 'SENT' WHERE LOWER(status) = 'sent';
UPDATE logs SET status = 'REPLIED' WHERE LOWER(status) = 'replied';
UPDATE logs SET status = 'FAILED' WHERE LOWER(status) = 'failed';

-- Add a check constraint to enforce uppercase status values (optional but recommended)
-- Note: This will prevent lowercase values from being inserted in the future
ALTER TABLE logs DROP CONSTRAINT IF EXISTS logs_status_check;
ALTER TABLE logs ADD CONSTRAINT logs_status_check 
  CHECK (status IN ('SENT', 'REPLIED', 'FAILED'));

COMMIT;

-- Verify the migration
SELECT status, COUNT(*) as count 
FROM logs 
GROUP BY status 
ORDER BY status;
