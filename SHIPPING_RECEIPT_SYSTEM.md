# 📦 Sistema de Boletas de Envío - Documentación

## 🎯 Descripción

Sistema automatizado para procesar boletas de envío cuando una orden está **COMPLETADA**. Extrae datos mediante OCR y envía un correo al cliente con la información del envío y la imagen de la boleta adjunta.

---

## 🚀 Flujo Completo

```
1. Admin marca orden como COMPLETADO
2. Admin sube imagen de la boleta de envío
   ↓
3. Sistema extrae datos con OCR:
   - Número de tracking/guía
   - Empresa de envío (Shalom, InstaCargo, etc.)
   - Destino
   - Fecha de envío
   ↓
4. Sistema guarda datos en la base de datos
   ↓
5. Sistema envía correo al cliente con:
   - Código de seguimiento Makip (MKP000023)
   - Datos extraídos de la boleta
   - Imagen de la boleta de envío adjunta
```

---

## 📋 Requisitos Previos

### 1. Ejecutar SQL de migración

```sql
-- Ejecuta este SQL en PostgreSQL
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_receipt_url TEXT,
ADD COLUMN IF NOT EXISTS shipping_tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_company VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_date DATE;
```

**Archivo**: `add_shipping_columns.sql`

### 2. Reiniciar el servidor

```bash
npm run dev
```

---

## 🔌 API Endpoint

### **POST** `/api/v1/admin/orders/:id/shipping-receipt`

Sube la boleta de envío y envía el correo de confirmación.

#### Headers
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

#### Body (Form Data)
```
receipt: <archivo de imagen> (JPG, PNG, JPEG)
```

#### Ejemplo con Postman

1. Selecciona **POST**
2. URL: `http://localhost:4000/api/v1/admin/orders/27/shipping-receipt`
3. Headers:
   - Authorization: `Bearer tu_token_admin`
4. Body:
   - Selecciona **form-data**
   - Key: `receipt` (tipo: **File**)
   - Value: Selecciona la imagen de la boleta

#### Ejemplo con cURL

```bash
curl -X POST http://localhost:4000/api/v1/admin/orders/27/shipping-receipt \
  -H "Authorization: Bearer tu_token_admin" \
  -F "receipt=@/ruta/a/tu/boleta.jpg"
```

#### Respuesta Exitosa (200)

```json
{
  "message": "Boleta de envío procesada y correo enviado",
  "shippingData": {
    "trackingNumber": "62898389",
    "company": "Shalom",
    "destination": "JR. HUANCAVELICA 251",
    "shippingDate": "2025-11-21"
  },
  "shippingReceiptUrl": "https://storage.googleapis.com/makip-archivos-2025/shipping-receipts/order-27-1733097123456.jpg"
}
```

#### Errores Posibles

**404 - Orden no encontrada**
```json
{
  "message": "Orden no encontrada"
}
```

**400 - Estado inválido**
```json
{
  "message": "Solo se puede subir boleta de envío para órdenes COMPLETADAS"
}
```

**400 - Sin imagen**
```json
{
  "message": "No se subió ninguna imagen"
}
```

---

## 🤖 OCR - Datos Extraídos

El sistema detecta automáticamente:

### Empresas de Envío Soportadas
- ✅ Shalom
- ✅ InstaCargo
- ✅ Olva Courier
- ✅ Serpost
- ✅ Otros couriers (detecta como "Courier")

### Patrones de Tracking Number
```regex
- NRO. ORDEN: 62898389
- ORDEN DE ENVIO 0004-00000323
- TRACKING: ABC123
- GUIA: XYZ789
- CODIGO: 12345
```

### Extracción de Destino
```regex
- AGENCIA DESTINO: PATIVILCA
- DESTINO: Jr. Huancavelica 251
- Jr. / Calle / Av. [dirección]
```

### Extracción de Fecha
```regex
- Fecha Emisión: 18/11/2025
- Fecha Traslado: 2025-11-21
- Cualquier formato DD/MM/YYYY o YYYY-MM-DD
```

> **Nota**: Si no se detecta algún dato, el sistema usa valores por defecto (fecha actual, "N/A", etc.) para no bloquear el flujo.

---

## 📧 Email Enviado al Cliente

El cliente recibirá un correo con:

### Contenido
- 🚚 Título: "¡Tu pedido MKP000027 está en camino!"
- 📍 Código de seguimiento Makip
- 📦 Número de guía del courier
- 🏢 Empresa de envío
- 📍 Destino (si se detectó)
- 📅 Fecha de envío
- 🖼️ **Imagen de la boleta adjunta (embebida en el email)**

### Vista del Email
```
┌─────────────────────────────────┐
│     [Logo Makip]                │
│  ¡Tu pedido está en camino! 📦  │
└─────────────────────────────────┘

🚚

¡Hola Gonzalo Lozano!

Nos complace informarte que tu pedido MKP000027
ha sido enviado y está en camino hacia ti.

┌─────────────────────────────────┐
│ 📍 Código de Seguimiento:       │
│    MKP000027                    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🚚 Empresa: Shalom              │
│ 📦 N° de Guía: 62898389         │
│ 📍 Destino: JR. HUANCAVELICA    │
│ 📅 Fecha: 2025-11-21            │
└─────────────────────────────────┘

[Imagen de la boleta de envío]

¿Tienes alguna pregunta?
WhatsApp: +51 981 266 608

Gracias por confiar en Makip 💙
```

---

## 🗄️ Base de Datos

### Nuevas Columnas en `orders`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `shipping_receipt_url` | TEXT | URL de la imagen en Google Cloud Storage |
| `shipping_tracking_number` | VARCHAR(100) | Número de guía del courier |
| `shipping_company` | VARCHAR(100) | Nombre de la empresa de envío |
| `shipping_date` | DATE | Fecha de envío |

### Ejemplo de Registro

```sql
SELECT 
  order_id,
  status,
  shipping_company,
  shipping_tracking_number,
  shipping_date,
  shipping_receipt_url
FROM orders 
WHERE order_id = 27;
```

**Resultado:**
```
order_id | status     | shipping_company | shipping_tracking_number | shipping_date | shipping_receipt_url
---------|------------|------------------|--------------------------|---------------|---------------------
27       | COMPLETADO | Shalom           | 62898389                 | 2025-11-21    | https://storage...
```

---

## 🧪 Testing

### Caso de Prueba 1: Boleta de Shalom

**Imagen**: Ticket con texto "DATOS TICKET SHALOM" y "NRO. ORDEN: 62898389"

**Resultado Esperado**:
```json
{
  "trackingNumber": "62898389",
  "company": "Shalom",
  "destination": "CERRO DE PASCO",
  "shippingDate": "2025-11-21"
}
```

### Caso de Prueba 2: Boleta de InstaCargo

**Imagen**: Boleta con "INSTACARGO" y "ORDEN DE ENVIO 0004-00000323"

**Resultado Esperado**:
```json
{
  "trackingNumber": "0004-00000323",
  "company": "InstaCargo",
  "destination": "PATIVILCA",
  "shippingDate": "2025-11-18"
}
```

---

## 🔧 Troubleshooting

### El OCR no detecta el número de tracking

**Solución**: Asegúrate de que la imagen sea clara y el texto sea legible. El OCR busca patrones como:
- "NRO. ORDEN:"
- "ORDEN DE ENVIO"
- "TRACKING:"
- "GUIA:"

### El correo no llega

**Verifica**:
1. Logs en consola: `[EMAIL SHIPPING]`
2. SendGrid API Key configurada
3. Email del cliente es válido
4. Revisa spam/promociones

### La imagen no se muestra en el correo

**Verifica**:
1. URL de la boleta es accesible públicamente
2. Google Cloud Storage configurado correctamente
3. Logs muestran: `[EMAIL SHIPPING] Boleta descargada y convertida a base64`

---

## 📝 Logs del Sistema

Cuando subes una boleta, verás estos logs:

```
[SHIPPING] Procesando boleta de envío para orden #27...
[SHIPPING] Imagen subida: https://storage.googleapis.com/...
[OCR SHIPPING] Leyendo texto de la boleta de envío...
[OCR SHIPPING] Texto detectado: [contenido completo]
[OCR SHIPPING] Datos extraídos: { trackingNumber: '62898389', ... }
[SHIPPING] Datos guardados en BD
[EMAIL SHIPPING] Enviando confirmación de envío para orden #27...
[EMAIL SHIPPING] Descargando boleta desde: https://...
[EMAIL SHIPPING] Boleta descargada y convertida a base64
[EMAIL SHIPPING] ✅ Correo de envío enviado exitosamente a: cliente@email.com
[SHIPPING] ✅ Correo enviado exitosamente
```

---

## 🎉 ¡Listo!

Ya puedes subir boletas de envío y el sistema:
1. ✅ Extrae datos automáticamente con OCR
2. ✅ Guarda todo en la base de datos
3. ✅ Envía un hermoso correo al cliente con la boleta adjunta

**Endpoint**: `POST /api/v1/admin/orders/:id/shipping-receipt`

---

**Desarrollado para Makip** 💙
