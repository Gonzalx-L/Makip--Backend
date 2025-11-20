# 📋 INSTRUCCIONES DE ACTUALIZACIÓN - BASE DE DATOS MAKIP v1.6

## 🎯 Objetivo
Sincronizar tu base de datos local con las últimas modificaciones realizadas en el sistema Makip.

---

## ⚠️ IMPORTANTE - LEER ANTES DE EJECUTAR

**Esta actualización es OBLIGATORIA para que el backend funcione correctamente.**

Sin esta actualización:
- ❌ El sistema no podrá cambiar órdenes al estado COMPLETADO
- ❌ Los correos de notificación no se enviarán correctamente
- ❌ El frontend mostrará errores de validación de estados

---

## 📦 ¿Qué se actualiza?

### 1. **Estado COMPLETADO agregado**
   - Se añade el estado `COMPLETADO` al flujo de órdenes
   - Flujo completo: NO_PAGADO → PAGO_EN_VERIFICACION → PENDIENTE → EN_EJECUCION → TERMINADO → **COMPLETADO**

### 2. **Validaciones automáticas**
   - El script verifica que todos los 7 estados requeridos estén presentes
   - Verifica las columnas necesarias en la tabla `orders`
   - Muestra estadísticas de tus órdenes actuales

---

## 🚀 PASOS PARA ACTUALIZAR

### Opción 1: Usando pgAdmin (Recomendado para Windows)

1. **Abre pgAdmin 4**

2. **Conéctate a tu base de datos:**
   - Servidor: `localhost`
   - Base de datos: `DBmakip`
   - Usuario: `postgres`
   - Contraseña: `zalo123`

3. **Ejecuta el script:**
   - Clic derecho en la base de datos `DBmakip`
   - Selecciona `Query Tool`
   - Abre el archivo `ACTUALIZACION_BD_FINAL.sql` o copia su contenido
   - Presiona **F5** o el botón ▶️ **Execute**

4. **Verifica los mensajes:**
   - Deberías ver: `✅ Estado COMPLETADO agregado exitosamente`
   - Y al final: Un resumen con todos los estados disponibles

---

### Opción 2: Usando la terminal (PowerShell)

```powershell
# Navegar a la carpeta del backend
cd C:\Users\Usuario\Desktop\Makip\backend\Makip--Backend

# Ejecutar el script
$env:PGPASSWORD='zalo123'
psql -U postgres -d DBmakip -f ACTUALIZACION_BD_FINAL.sql
```

---

### Opción 3: Usando VSCode con extensión PostgreSQL

1. Abre VSCode
2. Instala la extensión "PostgreSQL" si no la tienes
3. Conecta a la base de datos `DBmakip`
4. Abre el archivo `ACTUALIZACION_BD_FINAL.sql`
5. Ejecuta el script completo

---

## ✅ VERIFICACIÓN POST-ACTUALIZACIÓN

Después de ejecutar el script, deberías ver algo como esto:

```
NOTICE:  ✅ Estado COMPLETADO agregado exitosamente
NOTICE:  ✅ Todos los estados requeridos están presentes
NOTICE:  ✅ La columna delivery_type existe
NOTICE:  ✅ La columna pickup_code existe
NOTICE:  ✅ La columna invoice_pdf_url existe

📊 RESUMEN DE ESTADOS DISPONIBLES
─────────────────────────────────────────────────────────
NO_PAGADO, PAGO_EN_VERIFICACION, PENDIENTE, EN_EJECUCION, 
TERMINADO, COMPLETADO, CANCELADO
```

---

## 🔍 CONSULTAS ÚTILES PARA VERIFICAR

### Ver todos los estados disponibles:
```sql
SELECT e.enumlabel as estado
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;
```

### Ver todas las órdenes y sus estados:
```sql
SELECT order_id, status, client_id, total_price, created_at
FROM orders
ORDER BY created_at DESC;
```

### Contar órdenes por estado:
```sql
SELECT status, COUNT(*) as cantidad
FROM orders
GROUP BY status
ORDER BY cantidad DESC;
```

---

## ❓ PROBLEMAS COMUNES

### Error: "role postgres does not exist"
**Solución:** Usa tu usuario de PostgreSQL en lugar de `postgres`

### Error: "database DBmakip does not exist"
**Solución:** Verifica el nombre de tu base de datos, podría ser `makip` o `dbmakip`

### Error: "password authentication failed"
**Solución:** Verifica tu contraseña de PostgreSQL

### Mensaje: "Estado COMPLETADO ya existe"
**¡Perfecto!** Tu base de datos ya está actualizada.

---

## 🆘 SOPORTE

Si tienes algún problema:

1. **Copia el mensaje de error completo**
2. **Verifica la versión de PostgreSQL:** `psql --version`
3. **Contacta al equipo:**
   - Gonzalo (Backend Lead)
   - Revisa los logs del backend para más detalles

---

## 📝 NOTAS ADICIONALES

- ⏱️ **Tiempo estimado:** 10-30 segundos
- 💾 **Backup automático:** No, pero el script es seguro (solo agrega, no elimina)
- 🔄 **¿Puedo ejecutarlo varias veces?** Sí, el script detecta si ya está actualizado
- 🌐 **Compatibilidad:** PostgreSQL 12, 13, 14, 15, 16, 17, 18

---

## ✨ DESPUÉS DE LA ACTUALIZACIÓN

Ya puedes:
- ✅ Cambiar órdenes al estado COMPLETADO desde el frontend
- ✅ Recibir correos de notificación cuando las órdenes cambien de estado
- ✅ Ver el flujo completo de estados en el dashboard
- ✅ Sincronizar tu trabajo con el resto del equipo

---

**¡Actualización completada!** 🎉

Si todo salió bien, tu base de datos está lista para trabajar con la última versión del sistema Makip.
