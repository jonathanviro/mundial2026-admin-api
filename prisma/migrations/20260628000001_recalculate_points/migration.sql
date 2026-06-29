-- Recalcular total_points y correct_predictions para todas las registrations
-- basado en los points ya asignados a cada predicción
UPDATE registrations r
SET 
  total_points = (SELECT COALESCE(SUM(p.points), 0) 
                  FROM predictions p WHERE p.registration_id = r.id),
  correct_predictions = (SELECT COUNT(*) 
                         FROM predictions p 
                         WHERE p.registration_id = r.id AND p.is_correct = true),
  is_winner = (SELECT COUNT(*) 
               FROM predictions p 
               WHERE p.registration_id = r.id AND p.is_correct = true) >= COALESCE(
                 (SELECT min_correct_to_win FROM phases WHERE id = r.phase_id), 3);
