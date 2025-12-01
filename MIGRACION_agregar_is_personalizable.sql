-- =====================================================
-- MIGRACIÓN: Agregar campo is_personalizable
-- =====================================================
-- Fecha: 29 de Noviembre 2025
-- Descripción: Agrega un campo booleano para indicar
--              si un producto permite personalización
-- =====================================================

BEGIN;

-- Agregar columna is_personalizable a la tabla products
ALTER TABLE products 
ADD COLUMN is_personalizable BOOLEAN DEFAULT false NOT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN products.is_personalizable IS 
'Indica si este producto permite que el cliente suba un logo para personalización';

-- Actualizar productos existentes que YA tienen personalization_metadata
-- (asumimos que si tienen metadata, son personalizables)
UPDATE products 
SET is_personalizable = true 
WHERE personalization_metadata IS NOT NULL 
  AND personalization_metadata::text != 'null';

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Ver productos y su configuración de personalización
SELECT 
    product_id,
    name,
    is_personalizable,
    CASE 
        WHEN personalization_metadata IS NOT NULL 
        THEN 'Tiene metadata'
        ELSE 'Sin metadata'
    END as metadata_status
FROM products
ORDER BY product_id;

-- =====================================================
-- EJEMPLO DE DATOS
-- =====================================================

-- Estructura recomendada para personalization_metadata:
-- {
--   "coords_x": 100,        -- Coordenada X donde va el logo
--   "coords_y": 150,        -- Coordenada Y donde va el logo
--   "max_width": 200,       -- Ancho máximo del logo en píxeles
--   "max_height": 200       -- Opcional: Alto máximo del logo
-- }

-- Estructura para personalization_data en order_items:
-- {
--   "image_url": "https://storage.googleapis.com/makip-archivos-2025/logos/cliente-logo.png"
-- }

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
