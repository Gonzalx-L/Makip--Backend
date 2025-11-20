import moment from "moment";

// Ajusta estos valores a tu caso real
const YAPE_NOMBRE_OFICIAL = "GONZALO LOZANO"; // Más flexible, sin "SANTOS"
const YAPE_NUMERO_OFICIAL = "981266608"; // Puede estar ofuscado en el voucher, solo valida los últimos dígitos

/**
 * Valida un comprobante de pago de Yape o Plin (texto OCR)
 * @param {string} ocrText - Texto extraído con OCR de la imagen del comprobante.
 * @param {number} monto - Monto que se debería validar.
 * @returns {object} - { valid: boolean, errors: string[], info: object }
 */
export function validateYapeReceipt(ocrText, monto) {
  const errores = [];
  let valid = true;

  if (!ocrText) {
    errores.push("No se detectó texto en el comprobante.");
    return { valid: false, errors: errores, info: {} };
  }

  const texto = ocrText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  console.log("[OCR DEBUG] Texto detectado:", texto);
  
  // Detectar si es Plin o Yape
  const esPlin = texto.includes("PLIN") || texto.includes("ENVIO A CONTACTOS");
  const esYape = texto.includes("YAPE") || texto.includes("YAPEO") || texto.includes("YAPEASTE");
  
  console.log(`[OCR DEBUG] Es Plin: ${esPlin}, Es Yape: ${esYape}`);

  // 1. Valida que sea Yape o Plin
  if (!esPlin && !esYape) {
    valid = false;
    errores.push('No se detectó que sea un comprobante de Yape o Plin.');
  }

  // 2. Valida nombre destino (más flexible para Plin que usa minúsculas)
  const nombreFlexible = texto.includes(YAPE_NOMBRE_OFICIAL) || 
                          texto.includes("GONZALO") || 
                          texto.includes("LOZANO");
  if (!nombreFlexible) {
    errores.push("El nombre del destinatario no coincide claramente.");
  }

  // 3. Valida fecha (acepta varios formatos: DD/MM/YYYY, DD MMM YYYY, etc.)
  const hoy = moment();
  let fechaValida = false;
  let fechaDetectada = null;
  
  // Buscar fecha en formato DD/MM/YYYY
  const fechaMatch1 = texto.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
  if (fechaMatch1) {
    const fechaVoucher = moment(fechaMatch1[1], ["DD/MM/YYYY", "DD-MM-YYYY", "DD.MM.YYYY"]);
    if (fechaVoucher.isSame(hoy, 'day')) {
      fechaValida = true;
      fechaDetectada = fechaMatch1[1];
    }
  }
  
  // Buscar fecha en formato "DD NOV YYYY" o "DD NOVIEMBRE YYYY" (Plin)
  const fechaMatch2 = texto.match(/(\d{1,2})\s*(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\.?\s*(\d{4})/);
  if (fechaMatch2) {
    const meses = {
      ENE:0,FEB:1,MAR:2,ABR:3,MAY:4,JUN:5,JUL:6,AGO:7,SEP:8,OCT:9,NOV:10,DIC:11,
      ENERO:0,FEBRERO:1,MARZO:2,ABRIL:3,MAYO:4,JUNIO:5,JULIO:6,AGOSTO:7,SEPTIEMBRE:8,OCTUBRE:9,NOVIEMBRE:10,DICIEMBRE:11
    };
    const dia = parseInt(fechaMatch2[1]);
    const mes = meses[fechaMatch2[2]];
    const año = parseInt(fechaMatch2[3]);
    const fechaVoucher = moment({year: año, month: mes, day: dia});
    if (fechaVoucher.isSame(hoy, 'day')) {
      fechaValida = true;
      fechaDetectada = fechaMatch2[0];
    }
  }
  
  if (!fechaValida) {
    errores.push("No se pudo validar la fecha del comprobante o no es de hoy.");
  }

  // 4. Valida monto (más flexible para Yape y Plin)
  const variantesMonto = [
    monto.toFixed(2),
    monto.toFixed(1),
    String(parseInt(monto)),
    `S/${monto.toFixed(2)}`,
    `S/ ${monto.toFixed(2)}`,
    `S/${monto.toFixed(1)}`,
    `S/ ${monto.toFixed(1)}`,
    `S/${parseInt(monto)}`,
    `S/ ${parseInt(monto)}`,
    `${monto.toFixed(2)}`, // Para detectar "23.00" o "30.00"
    `${parseInt(monto)}.00`,
  ];
  const montoEncontrado = variantesMonto.some(variant =>
    texto.replace(/[\s,]/g, "").includes(variant.replace(/[\s,]/g, ""))
  );
  if (!montoEncontrado) {
    valid = false;
    errores.push(`El monto no coincide. Se esperaba S/ ${monto.toFixed(2)}`);
  }

  // 5. Valida que haya operación exitosa
  const operacionExitosa = texto.includes("OPERACION EXITOSA") || texto.includes("EXITOSA") || texto.includes("YAPEASTE");
  if (!operacionExitosa) {
    errores.push("No se detectó que la operación fue exitosa.");
  }

  // 6. Valida código de operación (alfanumérico para Plin, numérico para Yape)
  let codigoMatch = texto.match(/[A-F0-9]{10,}/); // Plin usa alfanumérico
  if (!codigoMatch) {
    codigoMatch = texto.match(/\b\d{8,}\b/); // Yape usa numérico
  }
  if (!codigoMatch) {
    errores.push("No se detectó código de operación válido.");
  }

  // 7. Valida número de cuenta (últimos 3 dígitos visibles) - solo para Yape
  // Para Plin, busca los números ofuscados como "2307" o "0958"
  if (esYape) {
    const ultimos3 = YAPE_NUMERO_OFICIAL.slice(-3);
    if (!texto.includes(ultimos3)) {
      errores.push("No se detectan los últimos 3 dígitos del número de destino.");
    }
  } else if (esPlin) {
    // Plin muestra números ofuscados, buscamos cualquier patrón de 4 dígitos
    const numerosOfuscados = texto.match(/\d{4}/g);
    if (!numerosOfuscados || numerosOfuscados.length === 0) {
      errores.push("No se detectaron números de cuenta en el comprobante Plin.");
    }
  }

  // Si solo hay errores menores (no críticos como nombre o dígitos), aprobar de todos modos
  const erroresCriticos = errores.filter(e => 
    e.includes("monto") || 
    e.includes("Yape o Plin") || 
    e.includes("fecha")
  );
  
  if (erroresCriticos.length === 0 && errores.length > 0) {
    console.log("[OCR] Errores menores detectados, pero aprobando comprobante:", errores);
    valid = true;
  }

  // Extras útiles para auditoría
  const info = {
    tipo: esPlin ? "Plin" : (esYape ? "Yape" : "Desconocido"),
    fecha: fechaDetectada,
    codigoOperacion: codigoMatch ? codigoMatch[0] : null,
  };

  return { valid, errors: errores, info };
}
