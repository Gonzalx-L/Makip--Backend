# ✅ SISTEMA DE MOCKUPS - IMPLEMENTACIÓN COMPLETA

## 📅 Fecha: 29 de Noviembre 2025

---

## 🎯 OBJETIVO
Sistema completo para que productos personalizables permitan a los clientes subir sus logos, y el backend genere automáticamente mockups cuando el pedido entre en producción.

---

## ✅ CAMBIOS IMPLEMENTADOS EN BACKEND

### 1️⃣ **Base de Datos**
```sql
-- Campo agregado a tabla products
is_personalizable BOOLEAN DEFAULT false NOT NULL

-- Actualización automática de productos existentes con metadata
UPDATE products SET is_personalizable = true 
WHERE personalization_metadata IS NOT NULL
```

**Estado:** ✅ MIGRADO (3 productos actualizados)

---

### 2️⃣ **API - Controladores de Productos**

**Archivo:** `src/controllers/product.controller.js`

**Cambios:**
- ✅ `createProduct()` ahora acepta `is_personalizable`
- ✅ `updateProduct()` ahora acepta `is_personalizable`
- ✅ `getProducts()` devuelve `is_personalizable` en la respuesta

**Ejemplo de uso:**
```javascript
POST /api/products
{
  "name": "Polo publicitario",
  "price": 15.00,
  "is_personalizable": true,
  "personalization_metadata": {
    "coords_x": 100,
    "coords_y": 150,
    "max_width": 200
  }
}
```

---

### 3️⃣ **API - Upload de Logos**

**Archivo:** `src/controllers/upload.controller.js`

**Nueva función:** `uploadLogo()`
- ✅ Valida que el archivo sea PNG
- ✅ Sube a Google Cloud Storage carpeta `logos/`
- ✅ Genera nombre único con UUID
- ✅ Retorna URL pública
- ✅ Logs detallados para debugging

**Endpoint:**
```
POST /api/upload/logos
Content-Type: multipart/form-data
Campo: file

Respuesta:
{
  "message": "Logo subido con éxito",
  "publicUrl": "https://storage.googleapis.com/makip-archivos-2025/logos/uuid.png"
}
```

**Estado:** ✅ PÚBLICO (no requiere autenticación)

---

### 4️⃣ **Rutas**

**Archivo:** `src/routes/upload.routes.js`

```javascript
router.post("/logos", upload.single("file"), uploadLogo);
```

**Archivo:** `src/app.js`

```javascript
// Ruta pública para logos de clientes
app.use("/api/upload", uploadRoutes);
```

**Estado:** ✅ CONFIGURADO

---

### 5️⃣ **Generación Automática de Mockups**

**Archivo:** `src/controllers/admin.order.controller.js`

**Función:** `updateOrderStatus()`

**Lógica implementada:**
```javascript
if (newStatus === "EN_EJECUCION") {
  // 1. Busca items personalizables del pedido
  // 2. Si tiene logo del cliente (personalization_data.image_url)
  // 3. Genera mockup automáticamente
  // 4. Envía notificación WhatsApp con mockup
}
```

**Proceso del mockup:**
1. Descarga imagen base del producto (base_image_url)
2. Descarga logo del cliente (personalization_data.image_url)
3. Redimensiona logo según max_width
4. Compone logo sobre imagen base en coordenadas (coords_x, coords_y)
5. Sube mockup a GCS carpeta `mockups/`
6. Envía URL por WhatsApp

**Estado:** ✅ ACTIVADO

---

### 6️⃣ **Servicio de Mockups**

**Archivo:** `src/services/mockup.service.js`

**Función principal:** `generateMockup(orderItem)`

**Tecnología:** Sharp (procesamiento de imágenes)

**Validaciones:**
- ✅ Verifica que el producto tenga base_image_url
- ✅ Verifica que el item tenga logo del cliente
- ✅ Valida metadata (coords_x, coords_y, max_width)
- ✅ Maneja errores sin romper el flujo del pedido

**Estado:** ✅ FUNCIONAL

---

## 📋 ESTRUCTURA DE DATOS

### Tabla: `products`
```json
{
  "product_id": 2,
  "name": "Polo publicitario",
  "base_image_url": "https://storage.googleapis.com/.../polo.png",
  "is_personalizable": true,
  "personalization_metadata": {
    "coords_x": 100,
    "coords_y": 150,
    "max_width": 200
  }
}
```

### Tabla: `order_items`
```json
{
  "order_item_id": 123,
  "product_id": 2,
  "personalization_data": {
    "image_url": "https://storage.googleapis.com/.../logos/cliente-logo.png"
  }
}
```

---

## 🔄 FLUJO COMPLETO

### **Paso 1: Admin crea producto**
```
Panel Admin → Crear producto
✅ Marca checkbox "¿Es personalizable?"
✅ Define coordenadas (X: 100, Y: 150, max_width: 200)
✅ Backend guarda is_personalizable=true y personalization_metadata
```

### **Paso 2: Cliente ve producto**
```
Vista Producto → GET /api/products/2
✅ Frontend recibe is_personalizable=true
✅ Muestra sección "🎨 Sube tu logo"
```

### **Paso 3: Cliente sube logo**
```
Cliente selecciona PNG → POST /api/upload/logos
✅ Backend valida PNG
✅ Sube a GCS carpeta logos/
✅ Retorna URL pública
✅ Frontend guarda URL para el pedido
```

### **Paso 4: Cliente crea pedido**
```
Checkout → POST /api/orders
{
  "items": [{
    "product_id": 2,
    "personalization_data": {
      "image_url": "https://storage.googleapis.com/.../logos/abc.png"
    }
  }]
}
```

### **Paso 5: Admin cambia estado a EN_EJECUCION**
```
Panel Admin → PUT /api/admin/orders/123
{ "newStatus": "EN_EJECUCION" }

✅ Backend detecta producto personalizable
✅ Genera mockup automáticamente
✅ Compone logo sobre imagen base
✅ Sube mockup a GCS carpeta mockups/
✅ Envía WhatsApp con mockup
✅ Envía email de confirmación
```

---

## 🚀 ENDPOINTS DISPONIBLES

### Productos
```
GET    /api/products              - Lista productos (incluye is_personalizable)
POST   /api/products              - Crear producto (admin, con is_personalizable)
PUT    /api/products/:id          - Editar producto (admin, con is_personalizable)
```

### Upload
```
POST   /api/upload/logos          - Subir logo cliente (público, solo PNG)
POST   /api/v1/upload/product-image  - Subir imagen producto (admin)
```

### Pedidos
```
POST   /api/v1/orders             - Crear pedido (con personalization_data)
PUT    /api/admin/orders/:id      - Cambiar estado (genera mockup automático)
```

---

## 📦 DEPENDENCIAS UTILIZADAS

```json
{
  "axios": "^1.13.2",           // Descargar imágenes
  "sharp": "^0.34.4",           // Procesamiento de imágenes
  "uuid": "^13.0.0",            // Nombres únicos
  "@google-cloud/storage": "^7.17.3",  // Google Cloud Storage
  "multer": "^2.0.2"            // Upload de archivos
}
```

---

## ✅ VALIDACIONES IMPLEMENTADAS

### Backend valida:
- ✅ Archivo existe
- ✅ Formato es PNG
- ✅ Producto tiene base_image_url
- ✅ Item tiene personalization_data.image_url
- ✅ Metadata tiene coords_x, coords_y, max_width
- ✅ Errores no rompen flujo del pedido

### Logs implementados:
```
[UPLOAD] 📤 Recibiendo logo del cliente...
[UPLOAD] ✅ Archivo válido: logo.png
[UPLOAD] 📏 Tamaño: 245.32 KB
[UPLOAD] 🔗 URL pública: https://...
[MOCKUP] 🎨 Iniciando generación de mockup...
[MOCKUP] ✅ Mockup generado exitosamente
[WHATSAPP] 📱 Enviando notificación con mockup...
```

---

## 🎯 PRÓXIMOS PASOS (FRONTEND)

### 1. Panel Admin - Formulario de Productos
- [ ] Agregar checkbox "¿Es personalizable?"
- [ ] Mostrar inputs condicionales (coords_x, coords_y, max_width)
- [ ] Enviar is_personalizable al backend

### 2. Vista Cliente - Detalle de Producto
- [ ] Verificar if product.is_personalizable === true
- [ ] Mostrar sección "Sube tu logo" solo si es true
- [ ] Implementar upload a /api/upload/logos
- [ ] Guardar URL del logo para el pedido

### 3. Checkout
- [ ] Incluir personalization_data.image_url en items
- [ ] Validar que productos personalizables tengan logo

---

## 📞 CONTACTO TÉCNICO

**Desarrollador Backend:** GitHub Copilot
**Fecha implementación:** 29 Noviembre 2025
**Versión:** v1.6 (Sistema de Mockups)

---

## 🔒 NOTAS DE SEGURIDAD

- ✅ Endpoint de logos es público (clientes necesitan acceso)
- ✅ Validación de tipo de archivo (solo PNG)
- ✅ UUID previene colisión de nombres
- ✅ GCS hace archivos públicos automáticamente
- ✅ Errores en mockup no afectan estado del pedido

---

**FIN DEL DOCUMENTO**
