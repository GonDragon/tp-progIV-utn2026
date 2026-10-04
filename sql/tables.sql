-- 1. USUARIOS Y PERFILES
CREATE TABLE perfiles (
                        id UUID PRIMARY KEY, -- Obligatorio para linkear 1:1 con auth.users de Supabase
                        email VARCHAR(255) NOT NULL,
                        nombre VARCHAR(100) NOT NULL,
                        apellido VARCHAR(100) NOT NULL,
                        fecha_nacimiento DATE,
                        tipo_sangre VARCHAR(10),
                        color_ojos VARCHAR(50),
                        dias_vacaciones INT,
                        rol VARCHAR(50) DEFAULT 'cliente',
                        puntos_fidelidad INT DEFAULT 0,
                        saldo_favor DECIMAL(10, 2) DEFAULT 0.00,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. CATÁLOGO DE CINE
CREATE TABLE peliculas (
                         id SERIAL PRIMARY KEY,
                         nombre VARCHAR(255) NOT NULL,
                         sinopsis TEXT,
                         duracion_minutos INT NOT NULL,
                         imagen_url VARCHAR(255),
                         restriccion_edad VARCHAR(50) -- Ej: 'Ninguna', '+13', '+18'
);

CREATE TABLE generos (
                       id SERIAL PRIMARY KEY,
                       nombre VARCHAR(100) NOT NULL
);

CREATE TABLE peliculas_generos (
                                 pelicula_id INT REFERENCES peliculas(id) ON DELETE CASCADE,
                                 genero_id INT REFERENCES generos(id) ON DELETE CASCADE,
                                 PRIMARY KEY (pelicula_id, genero_id)
);

CREATE TABLE resenas (
                       id SERIAL PRIMARY KEY,
                       pelicula_id INT REFERENCES peliculas(id) ON DELETE CASCADE,
                       perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
                       calificacion INT CHECK (calificacion >= 1 AND calificacion <= 5),
                       comentario TEXT,
                       fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO generos (nombre) VALUES
                               ('Acción'),
                               ('Animación'),
                               ('Aventura'),
                               ('Ciencia Ficción'),
                               ('Comedia'),
                               ('Crimen'),
                               ('Documental'),
                               ('Drama'),
                               ('Fantasía'),
                               ('Misterio'),
                               ('Musical'),
                               ('Romance'),
                               ('Suspenso'),
                               ('Terror');

-- 3. INFRAESTRUCTURA DE SALAS
CREATE TABLE salas (
                     id SERIAL PRIMARY KEY,
                     nombre VARCHAR(100) NOT NULL
);

CREATE TABLE butacas (
                       id SERIAL PRIMARY KEY,
                       sala_id INT REFERENCES salas(id) ON DELETE CASCADE,
                       fila CHAR(1) NOT NULL, -- A hasta T
                       columna INT NOT NULL,  -- Numeración 1 al 20
                       tipo VARCHAR(50) DEFAULT 'Normal' -- 'Normal', 'Discapacidad', 'VIP'
);

-- 4. MOTOR DE RESERVAS
CREATE TABLE funciones (
                         id SERIAL PRIMARY KEY,
                         pelicula_id INT REFERENCES peliculas(id) ON DELETE CASCADE,
                         sala_id INT REFERENCES salas(id) ON DELETE CASCADE,
                         fecha_hora_inicio TIMESTAMP NOT NULL,
                         formato VARCHAR(50) NOT NULL, -- '2D', '3D', '4D', '5D'
                         idioma VARCHAR(50) NOT NULL, -- 'Castellano', 'Subtitulada'
                         precio_base DECIMAL(10, 2) NOT NULL,
                         en_preventa BOOLEAN DEFAULT FALSE
);

-- 5. CANDY BAR Y PROMOCIONES
CREATE TABLE productos_candy (
                               id SERIAL PRIMARY KEY,
                               nombre VARCHAR(100) NOT NULL,
                               categoria VARCHAR(100) NOT NULL,
                               precio DECIMAL(10, 2) NOT NULL,
                               costo_puntos INT DEFAULT 0
);

CREATE TABLE combos (
                      id SERIAL PRIMARY KEY,
                      nombre VARCHAR(100) NOT NULL,
                      precio_fijo DECIMAL(10, 2) NOT NULL
);

CREATE TABLE cupones (
                       id SERIAL PRIMARY KEY,
                       codigo VARCHAR(50) UNIQUE NOT NULL,
                       porcentaje_descuento DECIMAL(5, 2) NOT NULL,
                       tipo_restriccion VARCHAR(100) DEFAULT 'Ninguna' -- 'Primera Compra', 'Mayores 50'
);

-- 6. COMERCIO Y TRANSACCIONES
CREATE TABLE transacciones (
                             id SERIAL PRIMARY KEY,
                             perfil_id UUID REFERENCES perfiles(id) ON DELETE SET NULL, -- Acepta nulo para compras anónimas
                             monto_total DECIMAL(10, 2) NOT NULL,
                             fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                             estado VARCHAR(50) DEFAULT 'Completada', -- 'Completada', 'Cancelada'
                             cupon_id INT REFERENCES cupones(id) ON DELETE SET NULL
);

CREATE TABLE entradas_tickets (
                                id SERIAL PRIMARY KEY,
                                transaccion_id INT REFERENCES transacciones(id) ON DELETE CASCADE NOT NULL,
                                funcion_id INT REFERENCES funciones(id) ON DELETE CASCADE NOT NULL,
                                butaca_id INT REFERENCES butacas(id) ON DELETE CASCADE NOT NULL,
                                codigo_qr VARCHAR(255) UNIQUE NOT NULL,
                                estado_qr VARCHAR(50) DEFAULT 'Activo' -- 'Activo', 'Invalidado'
);

CREATE TABLE transacciones_candy (
                                   id SERIAL PRIMARY KEY,
                                   transaccion_id INT REFERENCES transacciones(id) ON DELETE CASCADE NOT NULL,
                                   producto_id INT REFERENCES productos_candy(id) ON DELETE CASCADE,
                                   combo_id INT REFERENCES combos(id) ON DELETE CASCADE,
                                   cantidad INT NOT NULL DEFAULT 1
);

-- 7. AUDITORÍA Y REPORTES
CREATE TABLE log_actividad (
                             id SERIAL PRIMARY KEY,
                             perfil_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
                             accion TEXT NOT NULL,
                             fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

