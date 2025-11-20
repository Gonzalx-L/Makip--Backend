# 🔄 Migración de Base de Datos v1.5 → v1.6

## 📋 Resumen de Cambios

Este script **SOLO agrega el estado COMPLETADO** al flujo de pedidos. No elimina ni modifica ningún dato existente.

### ¿Qué hace este script?
✅ Agrega el estado `COMPLETADO` al ENUM `order_status`  
✅ Verifica que no se duplique el estado  
✅ Muestra el flujo completo de estados  
✅ Confirma que ninguna orden fue modificada  

### ¿Qué NO hace este script?
❌ No elimina datos  
❌ No modifica órdenes existentes  
❌ No recrea tablas  
❌ No afecta la estructura de la base de datos  

---

## 🚀 Cómo Ejecutar

### Opción 1: pgAdmin (Más fácil)

1. Abre **pgAdmin 4**
2. Conéctate a tu base de datos **DBmakip**
3. Clic derecho en DBmakip → **Query Tool**
4. Abre el archivo `MIGRACION_v1.5_a_v1.6.sql`
5. Presiona **F5** o clic en ▶️ **Execute**

### Opción 2: Terminal (PowerShell)

```powershell
cd C:\Users\Usuario\Desktop\Makip\backend\Makip--Backend
$env:PGPASSWORD='zalo123'
psql -U postgres -d DBmakip -f MIGRACION_v1.5_a_v1.6.sql
```

---

## ✅ Resultado Esperado

Deberías ver algo como esto:

```
NOTICE:  ✅ Estado COMPLETADO agregado exitosamente

NOTICE:  
NOTICE:  📊 FLUJO COMPLETO DE ESTADOS:
NOTICE:  NO_PAGADO → PAGO_EN_VERIFICACION → PENDIENTE → EN_EJECUCION → TERMINADO → COMPLETADO → CANCELADO
NOTICE:  

NOTICE:  📦 Total de órdenes en la base de datos: 15
NOTICE:  ✅ Ninguna orden fue modificada o eliminada
NOTICE:  

COMMIT
```

---

## 🔍 Verificación

### Consulta para ver el nuevo estado:

```sql
SELECT e.enumlabel AS estado, e.enumsortorder AS orden
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'order_status'
ORDER BY e.enumsortorder;
```

**Resultado esperado:**
```
   estado           | orden
--------------------+-------
 NO_PAGADO          |   1
 PAGO_EN_VERIFICACION |   2
 PENDIENTE          |   3
 EN_EJECUCION       |   4
 TERMINADO          |   5
 COMPLETADO         |   6  ← ¡NUEVO!
 CANCELADO          |   7
```

---

## 🎯 Después de la Migración

### 1. Reinicia el backend
```powershell
cd Makip--Backend
npm run dev
```

### 2. Prueba el flujo completo
- Cambia una orden de TERMINADO → COMPLETADO
- Verifica que llegue el correo de notificación

### 3. Verifica los logs del backend
Deberías ver:
```
[EMAIL] 📤 Intentando enviar correo de pedido completado...
[EMAIL] ✅ Correo de completado enviado exitosamente
```

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo ejecutar este script varias veces?**  
R: Sí, el script detecta si COMPLETADO ya existe y no lo duplica.

**P: ¿Se perderán mis datos?**  
R: No, este script solo AGREGA un estado. No modifica ni elimina nada.

**P: ¿Qué pasa con las órdenes existentes?**  
R: Mantienen sus estados actuales. Solo podrás usar COMPLETADO en nuevas transiciones.

**P: ¿Necesito hacer backup antes?**  
R: Aunque no es estrictamente necesario (el script es seguro), siempre es buena práctica.

---

## 🆘 Problemas Comunes

### "type order_status already has a value 'COMPLETADO'"
**Solución:** Tu base de datos ya está actualizada. ¡Perfecto! No necesitas hacer nada.

### "syntax error at or near 'BEFORE'"
**Solución:** Tu versión de PostgreSQL no soporta `ADD VALUE BEFORE`. Usa este comando alternativo:

```sql
ALTER TYPE order_status ADD VALUE 'COMPLETADO';
```

Esto agregará COMPLETADO al final, pero funcionará igual.

---

## 📊 Comparación de Versiones

| Aspecto | v1.5 | v1.6 |
|---------|------|------|
| Estados de pedidos | 6 estados | **7 estados** |
| Estado final | TERMINADO | **COMPLETADO** |
| Notificaciones por email | Solo EN_EJECUCION | **3 estados** |
| Flujo completo | ❌ | ✅ |

---

## 🎉 Listo!

Una vez ejecutado el script, tu base de datos estará sincronizada con la versión 1.6 del sistema Makip.

**Tiempo de ejecución:** < 1 segundo  
**Downtime:** 0 segundos  
**Riesgo:** Muy bajo (solo agrega, no modifica)
