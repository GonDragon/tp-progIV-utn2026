-- 1. Insertar salas de ejemplo
INSERT INTO salas (nombre) VALUES
                             ('Sala 1'),
                             ('Sala 2'),
                             ('Sala 3');

-- 2. Poblar butacas normales (Filas A-I, L-Q)
-- 28 butacas por fila en total (esquema 4-20-4)
INSERT INTO butacas (sala_id, fila, columna, tipo)
SELECT s.id, f, c, 'Normal'
FROM salas s
       CROSS JOIN unnest(ARRAY['A','B','C','D','E','F','G','H','I','L','M','N','O','P','Q']) AS f
       CROSS JOIN generate_series(1, 28) AS c;

-- 3. Poblar butacas VIP (Filas R, S, T)
-- 28 butacas por fila en total (esquema 4-20-4)
INSERT INTO butacas (sala_id, fila, columna, tipo)
SELECT s.id, f, c, 'VIP'
FROM salas s
       CROSS JOIN unnest(ARRAY['R','S','T']) AS f
       CROSS JOIN generate_series(1, 28) AS c;

-- 4. Poblar butacas para personas con discapacidad (Filas J, K)
-- 14 butacas por fila en total (esquema 2-10-2)
INSERT INTO butacas (sala_id, fila, columna, tipo)
SELECT s.id, f, c, 'Discapacidad'
FROM salas s
       CROSS JOIN unnest(ARRAY['J','K']) AS f
       CROSS JOIN generate_series(1, 14) AS c;
