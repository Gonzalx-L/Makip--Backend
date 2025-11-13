// src/controllers/admin.dashboard.controller.js
import { query } from "../config/db.js";

// Función auxiliar para obtener el inicio del día en la zona horaria local
const getStartOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

// Función auxiliar para obtener la fecha de hace 7 días
const getSevenDaysAgo = () => {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

export const getDashboardSummary = async (req, res) => {
  try {
    const today = getStartOfDay();
    const sevenDaysAgo = getSevenDaysAgo();

    // 1. KPI: Ingresos del Día
    const salesTodayPromise = query(
      `SELECT SUM(total_price) as total 
       FROM orders 
       WHERE created_at >= $1 
       AND status NOT IN ('NO_PAGADO', 'CANCELADO')`,
      [today]
    );

    // 2. KPI: Órdenes Pendientes
    const pendingOrdersPromise = query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE status IN ('PENDIENTE', 'PAGO_EN_VERIFICACION')`
    );

    // 3. KPI: Órdenes en Ejecución
    const processingOrdersPromise = query(
      `SELECT COUNT(*) as count 
       FROM orders 
       WHERE status = 'EN_EJECUCION'`
    );

    // 4. KPI: Nuevos Clientes Hoy
    const newClientsPromise = query(
      `SELECT COUNT(*) as count 
       FROM clients 
       WHERE created_at >= $1`,
      [today]
    );

    // 5. Gráfico: Ventas últimos 7 días
    const chartDataPromise = query(
      `SELECT 
         DATE(created_at) as date, 
         SUM(total_price) as sales 
       FROM orders 
       WHERE created_at >= $1 
       AND status NOT IN ('NO_PAGADO', 'CANCELADO') 
       GROUP BY DATE(created_at) 
       ORDER BY date ASC`,
      [sevenDaysAgo]
    );

    // 6. Tabla: Órdenes Recientes (Últimas 5)
    const recentOrdersPromise = query(
      `SELECT o.order_id, c.name as client_name, o.status, o.total_price, o.created_at 
       FROM orders o 
       JOIN clients c ON o.client_id = c.client_id 
       ORDER BY o.created_at DESC 
       LIMIT 5`
    );

    // Ejecutamos todas las consultas en paralelo
    // 💡 ¡CORREGIDO! Ahora usamos los nombres de las promesas (con 'Promise' al final)
    const [
      salesTodayResult,
      pendingOrdersResult,
      processingOrdersResult,
      newClientsResult,
      chartDataResult,
      recentOrdersResult,
    ] = await Promise.all([
      salesTodayPromise,
      pendingOrdersPromise,
      processingOrdersPromise, // <-- Arreglado
      newClientsPromise,
      chartDataPromise,
      recentOrdersPromise, // <-- Arreglado
    ]);

    // Formateamos la respuesta
    const summary = {
      kpis: {
        salesToday: parseFloat(salesTodayResult.rows[0].total) || 0,
        pendingOrders: parseInt(pendingOrdersResult.rows[0].count, 10) || 0,
        processingOrders:
          parseInt(processingOrdersResult.rows[0].count, 10) || 0,
        newClients: parseInt(newClientsResult.rows[0].count, 10) || 0,
      },
      chartData: chartDataResult.rows.map((row) => ({
        // Formatear fecha a "dd/mm"
        name: new Date(row.date).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
        }),
        sales: parseFloat(row.sales),
      })),
      recentOrders: recentOrdersResult.rows.map((order) => ({
        id: order.order_id,
        clientName: order.client_name,
        status: order.status,
        total: parseFloat(order.total_price),
        // Formatear fecha a "hace 5 min" (simplificado)
        date: new Date(order.created_at).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })),
    };

    res.json(summary);
  } catch (error) {
    console.error("Error al construir el dashboard summary:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
};
