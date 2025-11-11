import * as msal from '@azure/msal-node';
import fetch from 'node-fetch'; // (Asegúrate de tenerlo: npm install node-fetch)

// --- Configuración de MSAL (Autenticación de Azure) ---
const msalConfig = {
  auth: {
    clientId: process.env.PBI_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.PBI_TENANT_ID}`,
    clientSecret: process.env.PBI_CLIENT_SECRET,
  },
};

const cca = new msal.ConfidentialClientApplication(msalConfig);
const PBI_API_RESOURCE = 'https://analysis.windows.net/powerbi/api';

/**
 * Obtiene un Access Token de Azure AD (el "token maestro")
 */
async function getAzureADToken() {
  const authRequest = {
    scopes: [`${PBI_API_RESOURCE}/.default`],
  };
  
  try {
    const response = await cca.acquireTokenByClientCredential(authRequest);
    if (!response || !response.accessToken) {
      throw new Error('No se pudo adquirir el token de Azure AD.');
    }
    return response.accessToken;
  } catch (error) {
    console.error('Error al adquirir token de Azure AD:', error);
    throw error;
  }
}

/**
 * Usa el token maestro para pedir un "Embed Token" específico para un reporte
 */
export async function getPowerBIEmbedToken() {
  const azureADToken = await getAzureADToken();

  const workspaceId = process.env.PBI_WORKSPACE_ID;
  const reportId = process.env.PBI_REPORT_ID;

  // La URL de la API de Power BI para generar el token
  const embedTokenUrl = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;

  const response = await fetch(embedTokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${azureADToken}`,
    },
    body: JSON.stringify({
      accessLevel: 'View', // Solo permiso de "Ver"
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Error al generar el Embed Token:', response.status, errorBody);
    throw new Error('Falló la generación del Embed Token de Power BI');
  }

  const embedTokenData = await response.json();
  
  // También necesitamos la URL de incrustación del reporte
  const reportUrl = `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`;

  return {
    accessToken: embedTokenData.token,
    embedUrl: reportUrl,
    reportId: reportId,
  };
}