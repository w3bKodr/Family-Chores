-- Check for any pending or orphaned completions for Kaylee on Sunday
SELECT 
  cc.*,
  c.title,
  ch.display_name
FROM chore_completions cc
JOIN chores c ON cc.chore_id = c.id
JOIN children ch ON cc.completed_by = ch.id
WHERE ch.display_name = 'Kaylee'
  AND cc.completed_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY cc.completed_date DESC;

-- If you need to delete any problematic completions, uncomment and run:
-- DELETE FROM chore_completions
-- WHERE id IN (
--   SELECT cc.id
--   FROM chore_completions cc
--   JOIN children ch ON cc.completed_by = ch.id
--   WHERE ch.display_name = 'Kaylee'
--     AND cc.status = 'pending'
-- );
