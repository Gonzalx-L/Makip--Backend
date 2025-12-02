-- ===================================================================
-- AGREGAR COLUMNAS DE BOLETA DE ENVÍO A LA TABLA ORDERS
-- Ejecuta este SQL en tu base de datos PostgreSQL
-- ===================================================================

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_receipt_url TEXT,
ADD COLUMN IF NOT EXISTS shipping_tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_company VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_date DATE,
ADD COLUMN IF NOT EXISTS shipping_sender_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS shipping_sender_dni VARCHAR(20),
ADD COLUMN IF NOT EXISTS shipping_sender_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS shipping_recipient_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS shipping_recipient_dni VARCHAR(20),
ADD COLUMN IF NOT EXISTS shipping_recipient_phone VARCHAR(20);

-- Comentarios:
-- shipping_receipt_url: URL de la imagen de la boleta en Google Cloud Storage
-- shipping_tracking_number: Número de tracking/orden del courier (ej: 62898389, 0004-00000323)
-- shipping_company: Nombre de la empresa de envío (Shalom, InstaCargo, Olva, etc.)
-- shipping_date: Fecha de envío
-- shipping_sender_name: Nombre del remitente
-- shipping_sender_dni: DNI/RUC del remitente
-- shipping_sender_phone: Teléfono del remitente
-- shipping_recipient_name: Nombre del destinatario
-- shipping_recipient_dni: DNI/RUC del destinatario
-- shipping_recipient_phone: Teléfono del destinatario

-- Para verificar que se agregaron correctamente:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name LIKE 'shipping_%'
ORDER BY column_name;
