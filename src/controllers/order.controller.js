import { query } from "../config/db.js";

// --- (CLIENTE) CREAR UN NUEVO PEDIDO/COTIZACIÓN ---
export const createOrder = async (req, res) => {
  // El ID del cliente lo obtenemos del middleware 'protectClientRoute'
  const clientId = req.client.client_id;
  const { items } = req.body; // El frontend nos envía un array de 'items'

  if (!items || items.length === 0) {
    return res
      .status(400)
      .json({ message: "El pedido debe tener al menos un artículo" });
  }

  // Usamos una transacción para asegurar que todo se grabe o nada se grabe
  const client = await query("BEGIN"); // Inicia la transacción

  try {
    // --- Lógica del Flujo de Cotización ---
    // Según nuestro plan, si un item es personalizado,
    // el pedido inicia como "COTIZACION_PENDIENTE" (que podemos llamar 'NO_PAGADO')
    // y con precio 0. El admin luego lo actualiza.

    // Aquí simplificaremos: El frontend nos manda el precio calculado.
    // (Luego podemos implementar la cotización)

    // 1. Calcular el precio total (simplificado)
    // En un futuro, esta lógica debe ser más robusta en el backend
    let totalPrice = 0;
    for (const item of items) {
      // (Aquí deberíamos validar el precio contra la BD)
      totalPrice += item.item_price * item.quantity;
    }

    // 2. Crear el registro en la tabla 'orders'
    const orderResult = await query(
      `INSERT INTO orders (client_id, status, total_price) 
       VALUES ($1, 'NO_PAGADO', $2) RETURNING order_id, created_at, status, total_price`,
      [clientId, totalPrice]
    );
    const newOrder = orderResult.rows[0];

    // 3. Insertar cada artículo en 'order_items'
    for (const item of items) {
      const { product_id, quantity, item_price, personalization_data } = item;
      await query(
        `INSERT INTO order_items (order_id, product_id, quantity, item_price, personalization_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          newOrder.order_id,
          product_id,
          quantity,
          item_price,
          personalization_data,
        ] // personalization_data es JSON
      );
    }

    // 4. Si todo salió bien, confirmar la transacción
    await query("COMMIT");

    res.status(201).json(newOrder);
  } catch (error) {
    // 5. Si algo falló, deshacer todo
    await query("ROLLBACK");
    console.error("Error al crear pedido:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor al crear el pedido" });
  }
};

// --- (CLIENTE) OBTENER "MIS PEDIDOS" ---
export const getMyOrders = async (req, res) => {
  const clientId = req.client.client_id;
  try {
    const result = await query(
      "SELECT order_id, status, total_price, due_date, created_at FROM orders WHERE client_id = $1 ORDER BY created_at DESC",
      [clientId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener mis pedidos:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
