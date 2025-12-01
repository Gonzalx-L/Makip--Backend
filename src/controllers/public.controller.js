import { query } from "../config/db.js";

// --- OBTENER TODAS LAS CATEGORÍAS ACTIVAS ---
export const getPublicCategories = async (req, res) => {
  try {
    const result = await query(
      "SELECT category_id, name FROM categories WHERE is_active = true ORDER BY name"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener categorías públicas:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- OBTENER TODOS LOS PRODUCTOS ACTIVOS ---
export const getPublicProducts = async (req, res) => {
  try {
    // Hacemos un JOIN para incluir el nombre de la categoría
    const result = await query(`
      SELECT p.product_id, p.name, p.description, p.base_price, p.min_order_quantity, p.base_image_url, p.variants, p.personalization_metadata, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = true AND c.is_active = true
      ORDER BY p.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener productos públicos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- OBTENER UN SOLO PRODUCTO PÚBLICO POR ID ---
export const getPublicProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `
      SELECT p.product_id, p.name, p.description, p.base_price, p.min_order_quantity, p.base_image_url, p.variants, p.personalization_metadata, c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = true AND c.is_active = true AND p.product_id = $1
    `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// --- OBTENER TRACKING PÚBLICO DE PEDIDO ---
export const getOrderTrackingPublic = async (req, res) => {
  const { orderId } = req.params;
  
  try {
    // Buscar la orden con datos básicos (sin información sensible del cliente)
    const orderResult = await query(
      `SELECT 
         o.order_id,
         o.status,
         o.created_at,
         o.updated_at,
         o.delivery_type,
         o.pickup_code,
         o.total_price
       FROM orders o
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: "Pedido no encontrado" });
    }

    const order = orderResult.rows[0];

    // Obtener items del pedido (sin información sensible)
    const itemsResult = await query(
      `SELECT 
         oi.quantity,
         oi.item_price,
         oi.personalization_data,
         p.name as product_name,
         p.base_image_url as product_image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    // Mapear el estado actual a formato de tracking
    const trackingData = mapOrderStatusToTrackingPublic(order, itemsResult.rows);
    
    res.json(trackingData);
  } catch (error) {
    console.error("Error al obtener tracking público del pedido:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};

// Función auxiliar para mapear el estado de la orden al formato de tracking público
const mapOrderStatusToTrackingPublic = (order, items) => {
  const updates = [];
  const status = order.status;
  
  // Paso 1: Pedido Confirmado
  if (status !== 'NO_PAGADO' && status !== 'PAGO_EN_VERIFICACION') {
    updates.push({
      status: 'Confirmado',
      description: 'Pedido confirmado y pago aprobado',
      date: new Date(order.created_at).toLocaleString('es-ES'),
      isComplete: true
    });
  }

  // Paso 2: En Producción
  if (status === 'EN_EJECUCION' || status === 'TERMINADO' || status === 'COMPLETADO') {
    updates.push({
      status: 'En Producción',
      description: 'Tu pedido está siendo producido',
      date: new Date(order.updated_at).toLocaleString('es-ES'),
      isComplete: true
    });
  }

  // Paso 3: Producción Terminada
  if (status === 'TERMINADO' || status === 'COMPLETADO') {
    updates.push({
      status: 'Producción Finalizada',
      description: 'Tu pedido ha sido completado y empaquetado',
      date: new Date(order.updated_at).toLocaleString('es-ES'),
      isComplete: true
    });
  }

  // Paso 4: Entregado/Listo para Recojo
  if (status === 'COMPLETADO') {
    if (order.delivery_type === 'PICKUP') {
      updates.push({
        status: 'Listo para Recojo',
        description: `Tu pedido está listo. Código: ${order.pickup_code || 'N/A'}`,
        date: new Date(order.updated_at).toLocaleString('es-ES'),
        isComplete: true
      });
    } else {
      updates.push({
        status: 'Entregado',
        description: 'Pedido entregado exitosamente',
        date: new Date(order.updated_at).toLocaleString('es-ES'),
        isComplete: true
      });
    }
  }

  // Determinar el estado del banner principal
  let statusBanner = '';
  switch (status) {
    case 'NO_PAGADO':
      statusBanner = 'Esperando Pago';
      break;
    case 'PAGO_EN_VERIFICACION':
      statusBanner = 'Verificando Pago';
      break;
    case 'PENDIENTE':
      statusBanner = 'Pedido Confirmado';
      break;
    case 'EN_EJECUCION':
      statusBanner = 'En Producción';
      break;
    case 'TERMINADO':
      statusBanner = 'Producción Finalizada';
      break;
    case 'COMPLETADO':
      if (order.delivery_type === 'PICKUP') {
        statusBanner = `Listo para Recojo - Código: ${order.pickup_code}`;
      } else {
        statusBanner = 'Entregado';
      }
      break;
    case 'CANCELADO':
      statusBanner = 'Pedido Cancelado';
      break;
    default:
      statusBanner = 'En Proceso';
  }

  return {
    id: order.order_id.toString(),
    statusBanner,
    carrier: 'Makip Express',
    carrierTrackingId: `MKP${order.order_id.toString().padStart(6, '0')}`,
    updates,
    productName: items[0]?.product_name || 'Producto Personalizado',
    productImage: items[0]?.product_image || items[0]?.personalization_data?.image_url,
    delivery_type: order.delivery_type,
    pickup_code: order.pickup_code,
    currentStatus: status,
    lastUpdated: order.updated_at
  };
};
