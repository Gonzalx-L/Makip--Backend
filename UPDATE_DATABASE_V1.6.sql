-- =========================================================
-- SCRIPT DE ACTUALIZACIÓN BASE DE DATOS MAKIP v1.6
-- =========================================================
-- Fecha: 20 de noviembre de 2025
-- Descripción: Agrega el estado "COMPLETADO" al ENUM order_status
-- Ejecutar en: PostgreSQL
-- Base de datos: DBmakip
-- =========================================================

-- ----------------------------------------------------------------
-- IMPORTANTE: Ejecuta este script solo una vez en tu base de datos local
-- ----------------------------------------------------------------

-- 1. Agregar el nuevo estado 'COMPLETADO' al ENUM order_status
-- Este estado representa pedidos que ya fueron entregados o recogidos por el cliente
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'COMPLETADO';

-- 2. Verificar que todos los estados estén presentes (Opcional - solo para verificación)
-- Debería mostrar: NO_PAGADO, PAGO_EN_VERIFICACION, PENDIENTE, EN_EJECUCION, TERMINADO, CANCELADO, COMPLETADO
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'order_status'::regtype 
ORDER BY enumsortorder;

-- =========================================================
-- ESTADOS FINALES DEL SISTEMA (después de este script):
-- =========================================================
-- 1. NO_PAGADO           - Pedido creado, sin comprobante
-- 2. PAGO_EN_VERIFICACION - Comprobante subido, en revisión
-- 3. PENDIENTE           - Pago aprobado, listo para producción
-- 4. EN_EJECUCION        - En producción/taller
-- 5. TERMINADO           - Producción completada
-- 6. CANCELADO           - Pedido cancelado
-- 7. COMPLETADO          - Entregado o recogido (NUEVO)
-- =========================================================

-- FLUJO NORMAL DE ESTADOS:
-- NO_PAGADO → PAGO_EN_VERIFICACION → PENDIENTE → EN_EJECUCION → TERMINADO → COMPLETADO

-- =========================================================
-- FIN DEL SCRIPT
-- =========================================================
