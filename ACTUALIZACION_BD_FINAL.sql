-- =====================================================
-- SCRIPT DE ACTUALIZACIÓN FINAL - BASE DE DATOS MAKIP
-- =====================================================
-- Fecha: 20 de Noviembre 2025
-- Versión: 1.6 FINAL
-- Descripción: Script completo para sincronizar la base de datos
--              con todas las modificaciones realizadas
-- =====================================================

-- PASO 1: Agregar el estado COMPLETADO al ENUM order_status
-- ------------------------------------------------------------
DO $$ 
BEGIN
    -- Verificar si el valor 'COMPLETADO' ya existe en el ENUM
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status' 
        AND e.enumlabel = 'COMPLETADO'
    ) THEN
        -- Agregar el nuevo valor al ENUM
        ALTER TYPE order_status ADD VALUE 'COMPLETADO';
        RAISE NOTICE '✅ Estado COMPLETADO agregado exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️ Estado COMPLETADO ya existe, no se realizaron cambios';
    END IF;
END $$;

-- PASO 2: Verificar que existan todos los estados requeridos
-- ------------------------------------------------------------
DO $$ 
DECLARE
    estados_faltantes TEXT[];
    estado TEXT;
BEGIN
    -- Lista de estados que DEBEN existir
    estados_faltantes := ARRAY(
        SELECT unnest(ARRAY[
            'NO_PAGADO',
            'PAGO_EN_VERIFICACION',
            'PENDIENTE',
            'EN_EJECUCION',
            'TERMINADO',
            'COMPLETADO',
            'CANCELADO'
        ])
        EXCEPT
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status'
    );
    
    IF array_length(estados_faltantes, 1) > 0 THEN
        RAISE WARNING '⚠️ ATENCIÓN: Faltan los siguientes estados: %', array_to_string(estados_faltantes, ', ');
        RAISE EXCEPTION 'La base de datos no tiene todos los estados requeridos. Por favor, contacta al administrador del sistema.';
    ELSE
        RAISE NOTICE '✅ Todos los estados requeridos están presentes en la base de datos';
    END IF;
END $$;

-- PASO 3: Verificar columnas de la tabla orders
-- ------------------------------------------------------------
DO $$ 
BEGIN
    -- Verificar que exista la columna delivery_type
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'delivery_type'
    ) THEN
        RAISE WARNING '⚠️ La columna delivery_type no existe en la tabla orders';
        RAISE NOTICE 'ℹ️ Si necesitas esta columna, ejecuta: ALTER TABLE orders ADD COLUMN delivery_type delivery_method DEFAULT ''DELIVERY'';';
    ELSE
        RAISE NOTICE '✅ La columna delivery_type existe';
    END IF;
    
    -- Verificar que exista la columna pickup_code
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'pickup_code'
    ) THEN
        RAISE WARNING '⚠️ La columna pickup_code no existe en la tabla orders';
        RAISE NOTICE 'ℹ️ Si necesitas esta columna, ejecuta: ALTER TABLE orders ADD COLUMN pickup_code VARCHAR(20) UNIQUE;';
    ELSE
        RAISE NOTICE '✅ La columna pickup_code existe';
    END IF;
    
    -- Verificar que exista la columna invoice_pdf_url
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'invoice_pdf_url'
    ) THEN
        RAISE WARNING '⚠️ La columna invoice_pdf_url no existe en la tabla orders';
        RAISE NOTICE 'ℹ️ Si necesitas esta columna, ejecuta: ALTER TABLE orders ADD COLUMN invoice_pdf_url TEXT;';
    ELSE
        RAISE NOTICE '✅ La columna invoice_pdf_url existe';
    END IF;
END $$;

-- PASO 4: Mostrar resumen de estados disponibles
-- ------------------------------------------------------------
SELECT 
    '📊 RESUMEN DE ESTADOS DISPONIBLES' AS titulo,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS estados_actuales
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status';

-- PASO 5: Mostrar estadísticas de órdenes por estado
-- ------------------------------------------------------------
SELECT 
    '📈 ESTADÍSTICAS DE ÓRDENES POR ESTADO' AS titulo,
    status AS estado,
    COUNT(*) AS cantidad
FROM orders
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'NO_PAGADO' THEN 1
        WHEN 'PAGO_EN_VERIFICACION' THEN 2
        WHEN 'PENDIENTE' THEN 3
        WHEN 'EN_EJECUCION' THEN 4
        WHEN 'TERMINADO' THEN 5
        WHEN 'COMPLETADO' THEN 6
        WHEN 'CANCELADO' THEN 7
    END;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- ✅ Si todas las validaciones pasaron, la base de datos
--    está sincronizada correctamente.
-- 
-- ⚠️ Si aparecieron advertencias, revisa los mensajes
--    y ejecuta los comandos sugeridos si es necesario.
-- =====================================================
