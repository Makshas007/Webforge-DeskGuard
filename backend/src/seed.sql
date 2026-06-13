-- Seed 24 desks: 3 zones × 8 desks (2 rows × 4 cols each)

-- Zone A: rows 1-2, cols 1-4
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-1', 'A', 1, 1);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-2', 'A', 1, 2);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-3', 'A', 1, 3);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-4', 'A', 1, 4);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-5', 'A', 2, 1);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-6', 'A', 2, 2);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-7', 'A', 2, 3);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('A-8', 'A', 2, 4);

-- Zone B: rows 3-4, cols 1-4
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-1', 'B', 3, 1);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-2', 'B', 3, 2);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-3', 'B', 3, 3);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-4', 'B', 3, 4);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-5', 'B', 4, 1);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-6', 'B', 4, 2);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-7', 'B', 4, 3);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('B-8', 'B', 4, 4);

-- Zone C: rows 5-6, cols 1-4
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-1', 'C', 5, 1);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-2', 'C', 5, 2);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-3', 'C', 5, 3);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-4', 'C', 5, 4);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-5', 'C', 6, 1);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-6', 'C', 6, 2);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-7', 'C', 6, 3);
INSERT OR IGNORE INTO desks (label, zone, row_num, col_num) VALUES ('C-8', 'C', 6, 4);
