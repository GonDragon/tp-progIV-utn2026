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
                       activo BOOLEAN DEFAULT TRUE NOT NULL,
                       usado BOOLEAN DEFAULT FALSE NOT NULL
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


-- 8. HOT-FIXES

ALTER TABLE funciones
ADD COLUMN precio_preventa DECIMAL(10, 2);

-- 9. RESERVA DE BUTACAS
CREATE TABLE reservas_temporales (
                                   id SERIAL PRIMARY KEY,
                                   funcion_id INT REFERENCES funciones(id) ON DELETE CASCADE,
                                   butaca_id INT REFERENCES butacas(id) ON DELETE CASCADE,
                                   session_id UUID NOT NULL, -- session_id para anónimos o id de perfil si está autenticado
                                   expira_en TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
                                   UNIQUE(funcion_id, butaca_id) -- Evita que dos personas reserven la misma butaca en la misma función
);

-- 10. Configuraciones
CREATE TABLE configuraciones (
                               id SERIAL PRIMARY KEY,
                               nombre VARCHAR(100) UNIQUE NOT NULL,
                               valor DOUBLE PRECISION NOT NULL
);

INSERT INTO configuraciones (nombre, valor)
VALUES
  ('cuenta_nueva', 20.0),
  ('mayores_50', 10.0);


CREATE TABLE IF NOT EXISTS public.sugerencia_pelicula (
                                                        id SERIAL PRIMARY KEY,
                                                        perfil_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  explicacion_cine TEXT NOT NULL,
  revisado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- 11. PUSH NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id SERIAL PRIMARY KEY,
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. CANCELACIÓN ATÓMICA DE FUNCIONES
CREATE OR REPLACE FUNCTION public.cancelar_funcion(p_funcion_id INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pelicula_id INT;
    v_pelicula_nombre VARCHAR(255);
    v_fecha_hora TIMESTAMP;
    v_afectados JSONB := '[]'::JSONB;
    v_rec RECORD;
    v_total_reembolsado DECIMAL(10,2) := 0.00;
    v_total_usuarios INT := 0;
BEGIN
    -- 1. Verificar existencia de la función y obtener datos de la película
    SELECT f.pelicula_id, f.fecha_hora_inicio, p.nombre
    INTO v_pelicula_id, v_fecha_hora, v_pelicula_nombre
    FROM funciones f
    JOIN peliculas p ON p.id = f.pelicula_id
    WHERE f.id = p_funcion_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La función con ID % no existe.', p_funcion_id;
    END IF;

    -- 2. Procesar y acreditar a cada transacción no cancelada asociada a la función
    FOR v_rec IN (
        SELECT DISTINCT
            t.id AS transaccion_id,
            t.perfil_id,
            t.monto_total,
            p.nombre AS perfil_nombre,
            p.apellido AS perfil_apellido
        FROM entradas_tickets et
        JOIN transacciones t ON t.id = et.transaccion_id
        LEFT JOIN perfiles p ON p.id = t.perfil_id
        WHERE et.funcion_id = p_funcion_id
          AND t.estado <> 'Cancelada'
    ) LOOP
        -- Invalidar todos los tickets de la transacción
        UPDATE entradas_tickets
        SET estado_qr = 'Invalidado'
        WHERE transaccion_id = v_rec.transaccion_id;

        -- Marcar la transacción como cancelada
        UPDATE transacciones
        SET estado = 'Cancelada'
        WHERE id = v_rec.transaccion_id;

        -- Acreditar saldo a favor si la transacción tiene perfil asociado
        IF v_rec.perfil_id IS NOT NULL THEN
            UPDATE perfiles
            SET saldo_favor = COALESCE(saldo_favor, 0.00) + v_rec.monto_total
            WHERE id = v_rec.perfil_id;

            -- Registrar en el log de actividad
            INSERT INTO log_actividad (perfil_id, accion, fecha_hora)
            VALUES (
                v_rec.perfil_id,
                'Reembolso automático de crédito por $' || v_rec.monto_total || ' por cancelación de la función de "' || v_pelicula_nombre || '" (ID: ' || p_funcion_id || ').',
                CURRENT_TIMESTAMP
            );

            -- Acumular usuario afectado para el resultado
            v_afectados := v_afectados || jsonb_build_object(
                'perfil_id', v_rec.perfil_id,
                'transaccion_id', v_rec.transaccion_id,
                'monto', v_rec.monto_total,
                'nombre', COALESCE(v_rec.perfil_nombre || ' ' || v_rec.perfil_apellido, 'Usuario')
            );

            v_total_usuarios := v_total_usuarios + 1;
            v_total_reembolsado := v_total_reembolsado + v_rec.monto_total;
        END IF;
    END LOOP;

    -- 3. Limpiar reservas temporales si las hubiera
    DELETE FROM reservas_temporales
    WHERE funcion_id = p_funcion_id;

    -- 4. Eliminar la función cancelada
    DELETE FROM funciones
    WHERE id = p_funcion_id;

    -- 5. Retornar resumen completo de la operación atómica
    RETURN jsonb_build_object(
        'success', TRUE,
        'funcion_id', p_funcion_id,
        'pelicula_id', v_pelicula_id,
        'pelicula_nombre', v_pelicula_nombre,
        'fecha_hora_inicio', v_fecha_hora,
        'usuarios_afectados_count', v_total_usuarios,
        'total_reembolsado', v_total_reembolsado,
        'afectados', v_afectados
    );
END;
$$;
