# 🧪 PRUEBA DE ACTUALIZACIÓN DE ESTADO CON CORREOS

## Instrucciones para probar el envío de correos:

### Paso 1: Obtener el token de admin

Usa Postman o tu frontend para hacer login como admin:

**POST** `http://localhost:4000/api/v1/admin/login`

Body:
```json
{
  "email": "admin@makip.com",
  "password": "tu_contraseña"
}
```

Guarda el `token` que te devuelve.

---

### Paso 2: Actualizar estado de una orden

**PATCH** `http://localhost:4000/api/v1/admin/orders/15/status`

Headers:
```
Authorization: Bearer {tu_token_aqui}
Content-Type: application/json
```

Body:
```json
{
  "newStatus": "EN_EJECUCION"
}
```

---

### Paso 3: Revisar los logs en la terminal

Después de hacer la petición, deberías ver en la terminal algo como:

```
[NOTIFICACIONES] ✅ Orden #15 actualizada de PENDIENTE a: EN_EJECUCION
[NOTIFICACIONES] 📧 Datos del cliente: Juan Pérez (juan@email.com)
[EMAIL] 📤 Intentando enviar correo de producción a juan@email.com...
[EMAIL] ✅ Correo de producción enviado exitosamente
```

---

### Paso 4: Verificar el correo

Revisa la bandeja de entrada del correo del cliente (el que aparece en la orden).

---

## 🚨 Si NO se envían los correos, verás estos logs:

```
[EMAIL] ❌ ERROR al enviar correo: [descripción del error]
[EMAIL] ❌ Detalles del error: [mensaje de error]
```

**Posibles causas:**
1. ❌ API Key de SendGrid inválida o expirada
2. ❌ EMAIL_FROM no verificado en SendGrid
3. ❌ Límite de envío alcanzado (plan gratuito)
4. ❌ Correo del cliente inválido

---

## 📋 Comandos útiles para probar

### Crear un pedido de prueba (desde cliente):
```bash
# Primero haz login como cliente y guarda el token
POST http://localhost:4000/api/v1/orders
Authorization: Bearer {token_cliente}

Body:
{
  "items": [
    {
      "product_id": 1,
      "quantity": 1,
      "item_price": 25.00,
      "personalization_data": {}
    }
  ],
  "delivery_type": "DELIVERY"
}
```

### Cambiar estado a PENDIENTE (para poder probarlo):
```bash
PATCH http://localhost:4000/api/v1/admin/orders/{id}/status
Authorization: Bearer {token_admin}

Body: { "newStatus": "PENDIENTE" }
```

### Luego cambiar a EN_EJECUCION (debería enviar correo):
```bash
PATCH http://localhost:4000/api/v1/admin/orders/{id}/status
Authorization: Bearer {token_admin}

Body: { "newStatus": "EN_EJECUCION" }
```

---

## ✅ Estados que envían correos:

| Estado | Correo que envía |
|--------|------------------|
| `EN_EJECUCION` | "Tu pedido está en producción 🚀" |
| `TERMINADO` | "Tu pedido está terminado 🎉" + PDF |
| `COMPLETADO` | "Tu pedido está completado 🎉" + PDF |

Los demás estados (`NO_PAGADO`, `PAGO_EN_VERIFICACION`, `PENDIENTE`, `CANCELADO`) NO envían correos automáticos.
