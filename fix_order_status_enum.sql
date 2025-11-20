-- ========================================
-- SCRIPT PARA AGREGAR ESTADO "COMPLETADO"
-- ========================================

-- Agregar el nuevo valor 'COMPLETADO' al ENUM order_status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'COMPLETADO';

-- Verificar los valores del ENUM
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'order_status'::regtype 
ORDER BY enumsortorder;

-- ========================================
-- FIN DEL SCRIPT
-- ========================================
