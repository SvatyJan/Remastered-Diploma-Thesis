### Add full strenths legendary set to player.

INSERT INTO charcater_invetory (template_id, owner_character_id, amount, date_created)
SELECT n, 1, 1, NOW()
FROM (
    SELECT 21 AS n UNION ALL
    SELECT 22 UNION ALL
    SELECT 23 UNION ALL
    SELECT 24 UNION ALL
    SELECT 25 UNION ALL
    SELECT 26 UNION ALL
    SELECT 27 UNION ALL
    SELECT 28 UNION ALL
    SELECT 29 UNION ALL
    SELECT 30 UNION ALL
    SELECT 31 UNION ALL
    SELECT 32 UNION ALL
    SELECT 33 UNION ALL
    SELECT 34 UNION ALL
    SELECT 35
) AS t;
