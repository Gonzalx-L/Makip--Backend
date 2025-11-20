# 📋 **API Administrador - Sistema de Entrega Híbrido**

## 🔄 **APIs Actualizadas para Administrador**

### **1. Ver Todos los Pedidos (Ambos Tipos)**

```
GET /api/v1/admin/orders
```

**Respuesta actualizada:**

```json
[
  {
    "order_id": 1,
    "client_id": 123,
    "client_name": "Juan Pérez",
    "client_email": "juan@email.com",
    "status": "PENDIENTE",
    "total_price": "150.00",
    "delivery_type": "PICKUP", // ← NUEVO
    "pickup_code": "REC-A1B2", // ← NUEVO
    "payment_proof_url": null, // ← NUEVO
    "created_at": "2025-11-19T10:00:00Z",
    "updated_at": "2025-11-19T10:00:00Z"
  },
  {
    "order_id": 2,
    "client_name": "María García",
    "status": "PAGO_EN_VERIFICACION",
    "delivery_type": "DELIVERY", // ← Pedido tradicional
    "pickup_code": null, // ← Sin código
    "payment_proof_url": "https://..." // ← Con comprobante
    // ...más campos
  }
]
```

### **2. Filtrar Pedidos por Tipo de Entrega**

```
GET /api/v1/admin/orders/delivery/PICKUP    // Solo recojo en tienda
GET /api/v1/admin/orders/delivery/DELIVERY  // Solo delivery tradicional
```

### **3. Buscar Pedido por Código de Recojo**

```
GET /api/v1/admin/orders/pickup-code/REC-A1B2
```

**Respuesta:**

```json
{
  "message": "Pedido encontrado por código de recojo",
  "order": {
    "order_id": 1,
    "client_name": "Juan Pérez",
    "pickup_code": "REC-A1B2",
    "status": "TERMINADO",
    "delivery_type": "PICKUP",
    "items": [
      /* productos del pedido */
    ]
  }
}
```

### **4. Estadísticas de Pedidos**

```
GET /api/v1/admin/orders/stats
```

**Respuesta:**

```json
{
  "message": "Estadísticas de pedidos",
  "deliveryTypeStats": [
    {
      "delivery_type": "PICKUP",
      "count": "15",
      "total_revenue": "2250.00"
    },
    {
      "delivery_type": "DELIVERY",
      "count": "32",
      "total_revenue": "4800.00"
    }
  ],
  "statusStats": [
    {
      "status": "PENDIENTE",
      "delivery_type": "PICKUP",
      "count": "5"
    }
  ],
  "pendingPickupOrders": 8
}
```

## 🎯 **Diferencias Entre Tipos de Pedido**

### **DELIVERY (Tradicional)**

- ✅ Estado inicial: `NO_PAGADO`
- ✅ Requiere comprobante de pago
- ✅ OCR valida el pago automáticamente
- ✅ Se envía a domicilio
- ❌ Sin código de recojo

### **PICKUP (Recojo en Tienda)**

- ✅ Estado inicial: `PENDIENTE` (¡Directo!)
- ❌ NO requiere pago anticipado
- ✅ Genera código único (ej: `REC-A1B2`)
- ✅ Cliente recoge en tienda
- ✅ Pago contra entrega

## 💻 **Código Frontend para Admin**

```javascript
class AdminOrderService {
  constructor(token) {
    this.baseURL = "/api/v1/admin/orders";
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  // Ver todos los pedidos (ambos tipos)
  async getAllOrders() {
    const response = await fetch(this.baseURL, { headers: this.headers });
    return await response.json();
  }

  // Filtrar por tipo de entrega
  async getOrdersByType(type) {
    const response = await fetch(`${this.baseURL}/delivery/${type}`, {
      headers: this.headers,
    });
    return await response.json();
  }

  // Buscar por código de recojo
  async findByPickupCode(code) {
    const response = await fetch(`${this.baseURL}/pickup-code/${code}`, {
      headers: this.headers,
    });
    return await response.json();
  }

  // Ver estadísticas
  async getStats() {
    const response = await fetch(`${this.baseURL}/stats`, {
      headers: this.headers,
    });
    return await response.json();
  }

  // Actualizar estado de pedido
  async updateStatus(orderId, status) {
    const response = await fetch(`${this.baseURL}/${orderId}/status`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ status }),
    });
    return await response.json();
  }
}

// Uso en el frontend del admin
const adminService = new AdminOrderService(adminToken);

// Ver pedidos de recojo pendientes
const pickupOrders = await adminService.getOrdersByType("PICKUP");

// Buscar pedido específico por código
const order = await adminService.findByPickupCode("REC-A1B2");

// Ver estadísticas del día
const stats = await adminService.getStats();
```

## 🏪 **Flujo de Recojo en Tienda**

### **Para el Cliente:**

1. Selecciona "Recojo en tienda" al hacer pedido
2. Recibe código único (ej: `REC-A1B2`)
3. Va a la tienda con el código
4. Paga y recoge el producto

### **Para el Admin/Tienda:**

1. Ve el pedido con estado `PENDIENTE`
2. Busca por código cuando llega el cliente
3. Verifica el pedido y cobra
4. Cambia estado a `TERMINADO` o `COMPLETADO`
5. Entrega el producto

## 🔍 **Estados Actualizados**

- `NO_PAGADO` - Solo para DELIVERY, esperando pago
- `PAGO_EN_VERIFICACION` - Solo para DELIVERY, validando comprobante
- `PENDIENTE` - Ambos tipos, listo para procesar
- `EN_EJECUCION` - Ambos tipos, en producción
- `TERMINADO` - Ambos tipos, listo para entrega/recojo
- `COMPLETADO` - Ambos tipos, proceso finalizado
- `CANCELADO` - Ambos tipos, pedido cancelado

## 🎨 **Sugerencias de UI**

### **Dashboard Admin:**

```html
<div class="order-filters">
  <button onclick="loadOrders('ALL')">Todos</button>
  <button onclick="loadOrders('DELIVERY')">🚚 Delivery</button>
  <button onclick="loadOrders('PICKUP')">🏪 Recojo</button>
</div>

<div class="search-pickup">
  <input type="text" placeholder="Buscar por código (REC-XXXX)" />
  <button onclick="searchByCode()">Buscar</button>
</div>

<div class="orders-list">
  <!-- Lista de pedidos con badges según tipo -->
</div>
```

### **Badge para Tipo de Pedido:**

```html
<span class="badge delivery">🚚 DELIVERY</span>
<span class="badge pickup">🏪 RECOJO: REC-A1B2</span>
```

## ✅ **Respuesta a tu Pregunta**

**¡SÍ! El admin puede ver AMBOS tipos de pedidos:**

1. **Pedidos DELIVERY** - Con pago anticipado y comprobante
2. **Pedidos PICKUP** - Con código de recojo para la tienda

**Las consultas SQL actualizadas muestran:**

- Tipo de entrega (`delivery_type`)
- Código de recojo (`pickup_code`) cuando aplique
- Estado de pago (`payment_proof_url`)
- Toda la información necesaria para gestionar ambos flujos

**El admin puede:**

- Ver todos los pedidos juntos
- Filtrar por tipo específico
- Buscar pedidos por código de recojo
- Ver estadísticas separadas por tipo
- Gestionar el estado de ambos tipos
