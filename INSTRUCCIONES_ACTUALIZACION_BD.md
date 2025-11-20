# 🔄 ACTUALIZACIÓN DE BASE DE DATOS MAKIP v1.6

## 📋 Cambios Realizados

Se agregó el estado **`COMPLETADO`** al ENUM `order_status` para representar pedidos que ya fueron entregados o recogidos por el cliente.

---

## 🚀 Instrucciones para Actualizar tu Base de Datos Local

### Opción 1: Desde la línea de comandos (PowerShell en Windows)

1. Abre PowerShell como administrador
2. Navega a la carpeta del proyecto:
   ```powershell
   cd C:\ruta\a\tu\proyecto\Makip--Backend
   ```
3. Ejecuta el script SQL:
   ```powershell
   $env:PGPASSWORD='zalo123'; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d DBmakip -f UPDATE_DATABASE_V1.6.sql
   ```
   
   **Nota:** Ajusta la ruta de PostgreSQL si tienes una versión diferente (ej: PostgreSQL\17, PostgreSQL\16, etc.)

### Opción 2: Desde pgAdmin

1. Abre **pgAdmin**
2. Conéctate a tu servidor PostgreSQL local
3. Selecciona la base de datos **DBmakip**
4. Haz clic derecho en **DBmakip** → **Query Tool**
5. Abre el archivo `UPDATE_DATABASE_V1.6.sql` o copia y pega su contenido
6. Haz clic en el botón **▶ Execute** (F5)

### Opción 3: Desde DBeaver / DataGrip

1. Abre tu cliente SQL favorito
2. Conéctate a la base de datos **DBmakip**
3. Abre el archivo `UPDATE_DATABASE_V1.6.sql`
4. Ejecuta el script completo

---

## ✅ Verificar que la actualización fue exitosa

Ejecuta esta consulta para verificar que el estado `COMPLETADO` fue agregado:

```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'order_status'::regtype 
ORDER BY enumsortorder;
```

**Resultado esperado:**
```
NO_PAGADO
PAGO_EN_VERIFICACION
PENDIENTE
EN_EJECUCION
TERMINADO
CANCELADO
COMPLETADO  ← Este debe aparecer
```

---

## 📊 Estados del Sistema (Actualizado)

| Estado | Descripción |
|--------|-------------|
| `NO_PAGADO` | Pedido creado, sin comprobante |
| `PAGO_EN_VERIFICACION` | Comprobante subido, en revisión |
| `PENDIENTE` | Pago aprobado, listo para producción |
| `EN_EJECUCION` | En producción/taller |
| `TERMINADO` | Producción completada |
| `COMPLETADO` | ✨ **NUEVO** - Entregado o recogido por el cliente |
| `CANCELADO` | Pedido cancelado |

---

## 🔄 Flujo Normal de Estados

```
NO_PAGADO 
  ↓
PAGO_EN_VERIFICACION 
  ↓
PENDIENTE 
  ↓
EN_EJECUCION 
  ↓
TERMINADO 
  ↓
COMPLETADO (Estado final)
```

---

## ⚠️ Problemas Comunes

### Error: "type 'order_status' already contains label 'COMPLETADO'"

**Solución:** Ya ejecutaste el script antes. No hay problema, el estado ya está agregado.

### Error: "psql: command not found" o "no se reconoce el término 'psql'"

**Solución:** PostgreSQL no está en tu PATH. Usa la ruta completa:
```powershell
"C:\Program Files\PostgreSQL\[TU_VERSION]\bin\psql.exe"
```

### Error: "FATAL: password authentication failed"

**Solución:** Verifica que la contraseña sea correcta (`zalo123`). Si no funciona, pregunta cuál es tu contraseña de PostgreSQL local.

---

## 📞 Soporte

Si tienes problemas al ejecutar el script, contacta al equipo de desarrollo.

**Fecha de actualización:** 20 de noviembre de 2025
