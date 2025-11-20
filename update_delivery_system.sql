-- ========= ACTUALIZACIÓN COMPLEMENTARIA PARA BD v1.5 =========
-- Tu BD v1.5 ya tiene delivery_type y pickup_code configurados correctamente
-- Solo necesitamos agregar campos para métodos de pago
-- ============================================================

-- 1. Agregar columnas para métodos de pago (si no existen)
ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'PENDIENTE',
    ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- 2. Crear índice para métodos de pago
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- 3. Crear índice adicional para delivery_type (si no existe)
CREATE INDEX IF NOT EXISTS idx_orders_delivery_type ON orders(delivery_type);

-- ========= VERIFICACIÓN =========
-- Ejecutar para confirmar que todo está bien:

-- Ver estructura de la tabla orders
-- \d orders

-- Ver algunos pedidos de ejemplo
-- SELECT order_id, delivery_type, pickup_code, status, payment_method FROM orders LIMIT 5;

-- ========= VERIFICACIÓN =========
-- Ejecutar estas consultas para verificar que todo esté bien:

-- Ver estructura actualizada
-- \d orders

-- Ver todos los pedidos con sus tipos de entrega
-- SELECT order_id, status, delivery_type, pickup_code, total_price FROM orders;

-- ========= FIN DE ACTUALIZACIÓN =========