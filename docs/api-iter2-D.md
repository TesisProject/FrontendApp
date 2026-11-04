# API iteración 2 — Slice D: analítica y exportación (HU-19, 20 y 21)

Rama `iter2/D` de `cloud-service` y `frontend-app`. Rutas relativas a la base URL
(`http://localhost:8080`). Para integrar en `API-Frontend.md` en la fase 3.

## 1. Resumen de endpoints

| Método y ruta | Rol | Respuesta | HU |
|---|---|---|---|
| `GET /api/v1/occupancy/zones/{zoneId}/statistics` | ADMIN | `200` `ZoneOccupancyStatistics` | HU-21 |
| `GET /api/v1/occupancy/analytics/peaks` | ADMIN | `200` `DemandPeaks` | HU-19 |
| `GET /api/v1/occupancy/analytics/peaks/export.csv` | ADMIN | `200` `text/csv` adjunto | HU-19 |
| `GET /api/v1/occupancy/zones/availability/export.csv` | ADMIN | `200` `text/csv` adjunto | HU-20 |

Etiqueta OpenAPI nueva: `Occupancy analytics` (documento `/v3/api-docs/occupancy`).

Todos agregan `zone_occupancy_log` en PostgreSQL, en hora de Lima (`prediction.timezone`). El
porcentaje de cada snapshot es `occupied_spots / total_spots` del propio snapshot; los snapshots con
`total_spots = 0` no cuentan. Los porcentajes salen redondeados a **un decimal**, iguales en el JSON
y en el CSV.

## 2. `GET /occupancy/zones/{zoneId}/statistics` (HU-21)

| Query param | Tipo | Default | Notas |
|---|---|---|---|
| `period` | `week` \| `month` \| `year` | `week` | Sin distinguir mayúsculas |
| `from` | ISO-8601 instant | ver abajo | Se alinea al inicio de su intervalo local |
| `to` | ISO-8601 instant | ahora | Exclusivo |

| `period` | Un punto por (`granularity`) | Rango por defecto |
|---|---|---|
| `week` | `day` (00:00 Lima) | últimos 7 días, incluido hoy |
| `month` | `week` (lunes 00:00 Lima) | últimas 5 semanas, incluida la actual |
| `year` | `month` (día 1, 00:00 Lima) | últimos 12 meses, incluido el actual |

```json
{
  "zoneId": 1,
  "zoneName": "Avenida Miguel Grau 12",
  "period": "month",
  "granularity": "week",
  "from": "2026-09-07T05:00:00Z",
  "to": "2026-10-20T00:00:00Z",
  "points": [
    { "bucketStart": "2026-09-07T05:00:00Z", "bucketEnd": "2026-09-14T05:00:00Z",
      "avgOccupancyPercentage": null, "maxOccupancyPercentage": null,
      "avgOccupied": null, "maxOccupied": null, "totalSpots": null, "samples": 0 },
    { "bucketStart": "2026-09-14T05:00:00Z", "bucketEnd": "2026-09-21T05:00:00Z",
      "avgOccupancyPercentage": 70.7, "maxOccupancyPercentage": 100.0,
      "avgOccupied": 4.2, "maxOccupied": 6, "totalSpots": 6, "samples": 1255 }
  ],
  "summary": { "avgOccupancyPercentage": 51.0, "maxOccupancyPercentage": 100.0,
               "busiestBucketStart": "2026-10-12T05:00:00Z", "samples": 9002 }
}
```

- Hay **un punto por intervalo del rango**, con o sin datos. Sin datos: `samples: 0` y los valores
  en `null` → el gráfico deja el hueco.
- `summary` es `null` si el rango no tiene ningún dato → mensaje "No hay datos para este período"
  (HU-21 E2). `summary.avgOccupancyPercentage` pondera cada intervalo por sus `samples`.
- Tiempos medidos con un año de una zona (1 060 203 snapshots, uno cada 30 s): `year` 1,4 s,
  `month` 0,13 s, `week` 0,04 s.

## 3. `GET /occupancy/analytics/peaks` (HU-19)

| Query param | Tipo | Default | Notas |
|---|---|---|---|
| `groupBy` | `hour` \| `day` | `hour` | `hour` = hora del día 0–23; `day` = día ISO 1–7 (lunes = 1) |
| `from` | ISO-8601 instant | `to` − 30 días | Inclusivo |
| `to` | ISO-8601 instant | ahora | Exclusivo. Rango máximo: 366 días |
| `zoneId` | number | — | Solo esa zona; sin él, todas |

**Regla de pico:** una franja (zona × hora o zona × día) es pico si su ocupación promedio es
**≥ 80 %** (`peakReason: "THRESHOLD"`) o si es **≥ el percentil 90** de todas las franjas del
resultado y mayor que 0 (`"PERCENTILE"`, método nearest-rank). Con el percentil siempre se resalta lo
más demandado, aunque ninguna zona llegue al 80 %.

```json
{
  "groupBy": "day",
  "from": "2026-09-01T00:00:00Z",
  "to": "2026-11-05T00:00:00Z",
  "thresholdPercentage": 80.0,
  "percentile90": 69.0,
  "zones": [
    {
      "zoneId": 1, "zoneName": "Avenida Miguel Grau 12", "peakZone": true, "peakSlots": 1,
      "busiestSlot": { "slot": 7, "label": "Domingo", "avgOccupancyPercentage": 69.0,
                       "maxOccupancyPercentage": 100.0, "samples": 1733, "peak": true,
                       "peakReason": "PERCENTILE" },
      "slots": [
        { "slot": 1, "label": "Lunes", "avgOccupancyPercentage": 37.6, "maxOccupancyPercentage": 100.0,
          "samples": 1330, "peak": false, "peakReason": null }
      ]
    }
  ]
}
```

- `zones` va de mayor a menor demanda (promedio de su franja más alta). `peakZone: true` = la zona
  se resalta en el panel.
- `slots` solo trae las franjas con datos, en orden. `label`: `"18:00–19:00"` o `"Lunes"`.
- Sin datos: `zones: []`, `percentile90: null`.

### 3.1 `GET /occupancy/analytics/peaks/export.csv`

Mismos parámetros y **mismos valores** que 3 (una fila por zona y franja). Formato de
`CsvResponse` (UTF-8 con BOM, `,`, CRLF). `Content-Disposition: attachment;
filename="picos-demanda-{hour|day}.csv"`.

Columnas: `zona_id,zona,franja,etiqueta,ocupacion_promedio_pct,ocupacion_maxima_pct,muestras,pico,motivo_pico,desde,hasta`
(`pico` = `si`/`no`; `motivo_pico` = `THRESHOLD`, `PERCENTILE` o vacío).

El PDF no tiene endpoint: lo genera el FE con la vista imprimible de "Demanda" (`window.print`).

## 4. `GET /occupancy/zones/availability/export.csv` (HU-20)

Sin parámetros. Una fila por zona del **catálogo** (activas o no), ordenadas por nombre, y una fila
final `TOTAL`. `Content-Disposition: attachment; filename="ocupacion-por-zona.csv"`.

Columnas: `zona_id,zona,activa,capacidad,ocupados,libres,ocupacion_pct,clasificacion,ultima_lectura,generado_en`

Ejemplo:

```
zona_id,zona,activa,capacidad,ocupados,libres,ocupacion_pct,clasificacion,ultima_lectura,generado_en
1,Avenida Miguel Grau 12,si,6,4,2,66.7,MODERADO,2026-11-04T08:42:30Z,2026-11-04T08:43:11Z
2,Zona sin datos,si,20,,,,SIN_DATOS,,2026-11-04T08:43:11Z
,TOTAL,,6,4,2,66.7,,,2026-11-04T08:43:11Z
```

- Zona sin espacios monitoreados (o con `classification = SIN_DATOS` cuando lo emita la slice C):
  `clasificacion = SIN_DATOS` y conteos vacíos.
- `TOTAL.ocupacion_pct` = ocupados / capacidad **sumando solo las zonas con datos** (ponderada por
  capacidad, no el promedio simple de porcentajes). Vacía si ninguna zona tiene datos.
- `ultima_lectura` = último snapshot de `zone_occupancy_log` de la zona.

## 5. Errores

| Status | `error` | Cuándo |
|---|---|---|
| `400` | `INVALID_STATISTICS_PERIOD` | `period` no es `week`, `month` ni `year` |
| `400` | `INVALID_PEAK_GROUPING` | `groupBy` no es `hour` ni `day` |
| `400` | `INVALID_ANALYTICS_RANGE` | `from` ≥ `to`; estadísticas con más de 400 puntos; picos con más de 366 días |
| `400` | `INVALID_PARAMETER` | Fecha que no es ISO-8601 o `zoneId` no numérico |
| `404` | `ZONE_NOT_FOUND` | Estadísticas de una zona que no existe |
| `401` | — (cuerpo vacío) | Sin token |
| `403` | `ACCESS_DENIED` | Usuario sin rol ADMIN |

## 6. Frontend

| Vista | Ruta | Qué hace |
|---|---|---|
| Estadísticas | `/admin/statistics` | Zona + período (Semana/Mes/Año) → barras SVG de promedio con marca del máximo y línea del 80 %, resumen y tabla. Sin datos: mensaje sin romper la vista. Muestra el tiempo de carga |
| Demanda | `/admin/demand` | Por hora / por día, rango 7/30/90 días, zona o todas → tarjetas de zonas con picos y mapa de calor zona × franja con los picos en rojo. "Exportar CSV" (backend) y "Exportar PDF" (vista imprimible A4 horizontal) |
| Dashboard | `/admin/dashboard` | "Ocupación global" ponderada por capacidad; sección "Ocupación por zona" con barra o etiqueta gris "Sin datos"; botón "Exportar CSV"; refresco cada 30 s (ya existía) |

- Módulo nuevo `src/app/analytics/` (domain / application / infrastructure / presentation).
- `SIN_DATOS` se mapea localmente (`analytics/domain/occupancy-level.ts`: etiqueta "Sin datos",
  `#a0aec0`) sin tocar `zone-classification.ts`.
- `admin-assembler.ts`: una zona sin disponibilidad viva queda con `classification: 'SIN_DATOS'`
  (antes `'LIBRE'`), así no cuenta como libre en el dashboard.
- La descarga de CSV (`analytics/infrastructure/csv-download.ts`) pide el blob con axios y el header
  `Authorization`, porque `httpClient` solo devuelve JSON.

## 7. Migración

| Versión | Contenido |
|---|---|
| `V26__indice_historial_ocupacion_zona.sql` | Índice `idx_zone_occupancy_log_zone_occurred_at` en `zone_occupancy_log (zone_id, occurred_at)` |
