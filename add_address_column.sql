-- ===================================================================
-- AGREGAR COLUMNA ADDRESS A LA TABLA CLIENTS
-- Ejecuta este SQL en tu base de datos PostgreSQL
-- ===================================================================

ALTER TABLE public.clients 
ADD COLUMN address TEXT;

-- Comentario: Esta columna almacenará la dirección de entrega del cliente
-- Es opcional (puede ser NULL) porque no todos los clientes la necesitan

-- Para verificar que se agregó correctamente:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND column_name = 'address';
