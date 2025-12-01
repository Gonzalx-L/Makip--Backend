-- Script para configurar datos de prueba para mockups
BEGIN;

-- 1. Actualizar producto con coordenadas válidas
UPDATE products 
SET personalization_metadata = '{"coords_x": 150, "coords_y": 200, "max_width": 250}'
WHERE product_id = 1;

-- 2. Actualizar un pedido con logo de cliente (ejemplo)
UPDATE order_items 
SET personalization_data = '{"image_url": "https://storage.googleapis.com/makip-archivos-2025/logos/test-logo.png"}'
WHERE order_item_id = 1;

COMMIT;

-- Verificar cambios
SELECT 
    p.product_id,
    p.name,
    p.is_personalizable,
    p.personalization_metadata,
    oi.order_item_id,
    oi.order_id,
    oi.personalization_data
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
WHERE p.product_id = 1
LIMIT 1;
