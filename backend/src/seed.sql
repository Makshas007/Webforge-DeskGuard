-- Seed a small library layout so the SVG map renders out of the box.
INSERT INTO desks (code, label, x, y) VALUES
  ('DESK-A1', 'A1',  60,  60),
  ('DESK-A2', 'A2', 180,  60),
  ('DESK-A3', 'A3', 300,  60),
  ('DESK-A4', 'A4', 420,  60),
  ('DESK-B1', 'B1',  60, 200),
  ('DESK-B2', 'B2', 180, 200),
  ('DESK-B3', 'B3', 300, 200),
  ('DESK-B4', 'B4', 420, 200),
  ('DESK-C1', 'C1',  60, 340),
  ('DESK-C2', 'C2', 180, 340),
  ('DESK-C3', 'C3', 300, 340),
  ('DESK-C4', 'C4', 420, 340)
ON CONFLICT (code) DO NOTHING;
