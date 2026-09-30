# Handoff backend — Detalle de zona (espacios por cámara + historial)

**Fecha:** 2026-09-30 · **Servicio:** Vision / Occupancy · **Pantalla:** `/dashboard/zones/:id` (app de usuario)

El frontend ya está implementado y **degrada bien** mientras esto no exista: sin el endpoint de vistas
muestra los espacios en un solo bloque sin foto; el historial se agrega en el cliente.

---

## 1. NUEVO — `GET /api/v1/occupancy/zones/{zoneId}/views`

Lo que ve cada cámara de la zona: su última foto y los espacios que cubre (con ROI), para que el
usuario ubique su espacio en la imagen.

- **Auth:** JWT, **cualquier rol autenticado** (USER incluido). Hoy todo lo de cámaras, ROI y
  screenshot es ADMIN · OPERATOR, por eso hace falta un endpoint nuevo en vez de reutilizar esos.
- **Path params:** `zoneId` (int64)
- **No exponer** `code`, `name`, `location` ni `nodeId` de la cámara: al usuario no le importa qué
  cámara es. `viewId` es opaco (puede ser el `cameraId`); el front solo lo usa como clave.

**Respuesta `200`** — array de `ZoneViewResource`, orden estable (p. ej. por `cameraId`):

| Campo | Tipo | Nota |
|---|---|---|
| `viewId` | int64 | Identificador estable de la vista (id de cámara). |
| `imageUrl` | string \| null | URL presignada de la última foto (la misma que da `/cameras/{id}/screenshot`). `null` si la cámara aún no subió fotos. |
| `capturedAt` | date-time \| null | Cuándo se tomó esa foto. El front avisa si tiene más de 15 min. |
| `rotation` | int (0 · 90 · 180 · 270) | Grados en sentido horario para ver la foto derecha. |
| `expiresInSeconds` | int \| null | Vigencia de `imageUrl`. |
| `spaces` | `Array<{ parkingSpaceId: int64, roi: Point[] }>` | Espacios monitoreados por esa cámara. `roi` en coordenadas normalizadas 0–1 de la foto **ya girada** según `rotation` (igual que `MonitoredSpaceResource` y el Fog): se gira la foto y el polígono se dibuja encima sin transformarlo. *(Corregido el 2026-09-30; la primera versión de este documento decía "sin girar", que era incorrecto.)* |

```json
[
  {
    "viewId": 1,
    "imageUrl": "https://…r2…/cam-1/latest.jpg?X-Amz-…",
    "capturedAt": "2026-09-30T18:09:30Z",
    "rotation": 0,
    "expiresInSeconds": 900,
    "spaces": [
      { "parkingSpaceId": 11, "roi": [{ "x": 0.12, "y": 0.26 }, { "x": 0.32, "y": 0.26 }, { "x": 0.32, "y": 0.68 }, { "x": 0.12, "y": 0.68 }] }
    ]
  }
]
```

**Reglas**
- Solo cámaras **activas** de la zona que cubran al menos un espacio monitoreado.
- Zona sin cámaras → `[]` (no 404). Zona inexistente → `404`.
- El estado libre/ocupado **no** va aquí: el front lo sigue leyendo de `/zones/{id}/availability`
  (se refresca cada 30 s). El front también pide `/views` cada 30 s y reutiliza la imagen ya cargada si
  `capturedAt` no cambió, así que una URL nueva por respuesta está bien.
- Espacios del catálogo que ninguna cámara cubre simplemente no aparecen; el front los agrupa aparte.

**⚠️ A decidir (privacidad):** esto expone fotos del estacionamiento a cualquier usuario registrado.
Valorar servir una versión reducida y/o con placas difuminadas antes de abrirlo a USER.

---

## 2. CAMBIO — `GET /api/v1/occupancy/zones/{zoneId}/occupancy/history`

### 2.1 Abrir a USER (bloqueante)
Hoy está documentado como **ADMIN · OPERATOR**, pero lo consume la pantalla de usuario (gráfico de
historial y la comparación del pronóstico). Con rol USER responde 403 y la sección muestra error.
→ Permitir **cualquier JWT**.

### 2.2 Ventana de datos
El front ofrece *Últimas 12 h*, *Hoy* y *Últimos 7 días*, y el pronóstico compara días de hasta
**30 días atrás**. Hoy llama **sin** `from`/`to`.
→ Confirmar que sin parámetros se devuelven los últimos 30 días (o documentar el default real), y que
`from` / `to` (ISO-8601) filtran correctamente.

### 2.3 Consistencia de cada punto (confirmar)
Con varias cámaras por zona: ¿cada punto es el estado **de toda la zona** en ese instante, o el de los
espacios de una sola cámara? Si es lo segundo, `occupiedSpots` / `totalSpots` salen parciales y el
gráfico oscila. Cada punto debe representar la zona completa.

### 2.4 Recomendado — agregación en el servidor
Las cámaras reportan cada ~5 min: 30 días ≈ **8 640 puntos** por zona, que el front descarga enteros
para dibujar como mucho ~56 intervalos. Propuesta de parámetro opcional:

`GET …/occupancy/history?from=…&to=…&bucket=15m|30m|3h`

Con `bucket`, devolver un punto por intervalo (alineado a la hora local de Lima, UTC−5) **solo para
intervalos con datos**:

| Campo | Tipo |
|---|---|
| `bucketStart` | date-time |
| `bucketEnd` | date-time |
| `avgOccupied` | number (double) |
| `minOccupied` | int |
| `maxOccupied` | int |
| `totalSpots` | int (máximo del intervalo) |
| `frames` | int (nº de frames agregados) |

Sin `bucket`, se mantiene la respuesta actual (compatibilidad con el pronóstico). El front hoy hace
exactamente esta agregación en `src/app/parking/presentation/occupancy-history.ts`; cuando el backend
la ofrezca, basta con cambiar la fuente de datos.

---

## 3. Documentación

`API-Frontend.md` no lista `GET /api/v1/occupancy/cameras/{cameraId}/screenshot`, que el panel admin
ya usa (`CameraScreenshotResource`). Añadirlo junto con el endpoint nuevo.

---

## Resumen de prioridades

| # | Qué | Prioridad |
|---|---|---|
| 1 | `GET /occupancy/zones/{id}/views` (JWT cualquiera, sin datos de cámara) | Alta — habilita la nueva vista de espacios |
| 2.1 | Historial accesible para USER | Alta — hoy falla para usuarios |
| 2.2 / 2.3 | Confirmar ventana por defecto y que cada punto sea la zona completa | Media |
| 2.4 | Parámetro `bucket` | Media — rendimiento |
| 3 | Documentar screenshot + endpoint nuevo | Baja |
