-- Fix existing logs to use uppercase status values
-- This ensures all logs display correctly in the UI

UPDATE logs 
SET status = UPPER(status) 
WHERE status IN ('sent', 'replied', 'received', 'failed');

-- Verify the update
SELECT status, COUNT(*) as count 
FROM logs 
GROUP BY status 
ORDER BY status;
