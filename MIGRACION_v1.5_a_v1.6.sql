-- =====================================================
-- MIGRACIÓN DE v1.5 A v1.6 - BASE DE DATOS MAKIP
-- =====================================================
-- Fecha: 20 de Noviembre 2025
-- Descripción: Script de migración incremental que SOLO
--              agrega las modificaciones necesarias sin
--              alterar los datos existentes.
-- =====================================================

-- CAMBIOS EN ESTA VERSIÓN:
-- 1. Agregar estado 'COMPLETADO' al ENUM order_status
--
-- =====================================================

BEGIN;

-- ----------------------------------------------------------------
-- MODIFICACIÓN 1: Agregar estado COMPLETADO al ENUM order_status
-- ----------------------------------------------------------------

DO $$ 
BEGIN
    -- Verificar si el valor 'COMPLETADO' ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'order_status' 
        AND e.enumlabel = 'COMPLETADO'
    ) THEN
        -- Agregar el nuevo valor ANTES de 'CANCELADO'
        -- Para que el orden sea: ... TERMINADO → COMPLETADO → CANCELADO
        ALTER TYPE order_status ADD VALUE 'COMPLETADO' BEFORE 'CANCELADO';
        RAISE NOTICE '✅ Estado COMPLETADO agregado exitosamente';
    ELSE
        RAISE NOTICE 'ℹ️ Estado COMPLETADO ya existe en la base de datos';
    END IF;
END $$;

-- ----------------------------------------------------------------
-- VERIFICACIÓN: Mostrar el nuevo orden de estados
-- ----------------------------------------------------------------

DO $$
DECLARE
    estados TEXT;
BEGIN
    SELECT string_agg(e.enumlabel, ' → ' ORDER BY e.enumsortorder)
    INTO estados
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'order_status';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 FLUJO COMPLETO DE ESTADOS:';
    RAISE NOTICE '%', estados;
    RAISE NOTICE '';
END $$;

-- ----------------------------------------------------------------
-- VERIFICACIÓN: Contar órdenes existentes
-- ----------------------------------------------------------------

DO $$
DECLARE
    total_ordenes INT;
BEGIN
    SELECT COUNT(*) INTO total_ordenes FROM orders;
    RAISE NOTICE '📦 Total de órdenes en la base de datos: %', total_ordenes;
    RAISE NOTICE '✅ Ninguna orden fue modificada o eliminada';
    RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
-- 
-- ✅ RESUMEN DE CAMBIOS:
-- - Se agregó el estado COMPLETADO al ENUM order_status
-- - El nuevo flujo es: NO_PAGADO → PAGO_EN_VERIFICACION → 
--   PENDIENTE → EN_EJECUCION → TERMINADO → COMPLETADO → CANCELADO
-- 
-- ⚠️ NOTAS IMPORTANTES:
-- - Este script NO elimina ni modifica datos existentes
-- - Todas las órdenes actuales mantienen sus estados
-- - El script puede ejecutarse múltiples veces de forma segura
-- 
-- 🎯 PRÓXIMOS PASOS:
-- 1. Reiniciar el backend: npm run dev
-- 2. Verificar que los correos se envíen correctamente
-- 3. Probar el cambio de estados en el frontend
-- 
-- =====================================================
