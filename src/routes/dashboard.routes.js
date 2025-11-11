import { Router } from 'express';
// (Asegúrate de haber creado también 'powerbi.service.js')
import { getPowerBIEmbedToken } from '../services/powerbi.service.js';

const router = Router();

// Esta es la ruta GET /api/v1/dashboard/token
// (El '/token' viene de aquí)
router.get('/token', async (req, res) => {
  try {
    // Llama a nuestro servicio para obtener toda la info
    const embedConfig = await getPowerBIEmbedToken();
    
    // Envía la configuración al frontend
    res.json(embedConfig);

  } catch (error) {
    console.error('Error en la ruta /dashboard/token:', error);
    res.status(500).json({ error: 'No se pudo obtener la configuración del dashboard' });
  }
});

export default router;