# API iteración 2 — Slice C: mapa, cercanía y estado en vivo

HU-06, 07, 08 (Cloud + FE), 10, 12, 13, 29 y 32. Rama `iter2/C` en `cloud-service` y `frontend-app`.
Para integrar en `API-Frontend.md` en la fase 3. Rutas relativas a `/api/v1`.

## 1. Resumen

| Método y ruta | Rol | Cambio |
|---|---|---|
| `GET /occupancy/zones/availability` | autenticado | **Cambia**: `classification` suma `SIN_DATOS`, umbrales 40/80, campos `lastUpdatedAt` y `stale`; lista también las zonas del catálogo sin espacios monitoreados |
| `GET /occupancy/zones/{zoneId}/availability` | autenticado | Igual que arriba |
| `GET /parking/zones/nearby?lat&lng&radiusKm` | ADMIN, OPERATOR, USER | **Nuevo** (HU-07/10) |
| `GET /prediction/recommendations?lat&lng&radiusKm&limit` | ADMIN, OPERATOR, USER | **Nuevo** (HU-13) |

Sin migraciones: la V25 reservada no se usó.

## 2. Disponibilidad (contrato fijo con las slices D y E)

```json
{
  "zoneId": 7, "total": 12, "occupied": 10, "available": 2,
  "occupancyPercentage": 83.3,
  "classification": "OCUPADO",
  "lastUpdatedAt": "2026-11-04T15:07:12Z",
  "stale": false,
  "spaces": [{ "parkingSpaceId": 41, "spaceNumber": "A1", "occupied": true }]
}
```

| Campo | Regla |
|---|---|
| `classification` | `LIBRE` < 40 % · `MODERADO` 40 %–80 % (ambos incluidos) · `OCUPADO` > 80 % · `SIN_DATOS` si la zona no tiene espacios monitoreados, nunca recibió una lectura o la última tiene más de 30 min (`AVAILABILITY_NO_DATA_AFTER_MINUTES`) |
| `lastUpdatedAt` | ISO-8601 o `null`. La detección más reciente de la zona: la mayor `statusOccurredAt` de sus espacios (cada foto procesada la actualiza aunque el estado no cambie) o, si no hay, la última fila de `zone_occupancy_log` |
| `stale` | `true` si `lastUpdatedAt` tiene **más** de 90 s (`AVAILABILITY_STALE_AFTER_SECONDS`). Con `stale = true` los conteos son el último estado conocido. Con `lastUpdatedAt = null`, `stale = false` (y la zona es `SIN_DATOS`) |

- Entre 90 s y 30 min la zona conserva su color y lleva `stale = true` (HU-08 E2: último estado
  conocido + aviso). Pasados 30 min pasa a gris `SIN_DATOS` (HU-12 E2).
- El listado ahora incluye **todas** las zonas del catálogo (ordenadas por id). Una zona sin espacios
  sale con `classification = SIN_DATOS`, `occupied = 0`, `spaces = []`.

## 3. `GET /parking/zones/nearby`

| Param | Tipo | Default | Regla |
|---|---|---|---|
| `lat` | number | — | [-90, 90] |
| `lng` | number | — | [-180, 180] |
| `radiusKm` | number | `2` | (0, 50] |

Respuesta `200`: zonas **activas** con coordenadas dentro del radio, de la más cercana a la más lejana
(haversine, línea recta). `[]` si no hay ninguna → el FE sugiere ampliar el radio.

```json
[{ "zone": { /* ZoneResource completo */ }, "distanceMeters": 812 }]
```

El estado libre/ocupado no viaja aquí: el FE lo cruza con la disponibilidad (sección 2).

## 4. `GET /prediction/recommendations`

| Param | Tipo | Default | Regla |
|---|---|---|---|
| `lat`, `lng` | number | — | como en `nearby` |
| `radiusKm` | number | `5` | (0, 50] |
| `limit` | int | `3` | 1–10 |

Para cada zona activa del radio:
- `currentAvailabilityPct` = libres/total × 100 ahora (`null` si la zona está `SIN_DATOS`).
- `nextWindowAvailabilityPct` = probabilidad publicada por el modelo para la **ventana siguiente** a la
  vigente (hora de Lima; si hay ventanas de 15 y 30 min, gana la de 15). `null` sin pronóstico.
- `estimatedAvailabilityPct` = 0,6 × actual + 0,4 × siguiente; con un solo dato, ese.
- Se descartan las zonas sin ningún dato o con estimación < 1 %. Orden: estimación − 5 puntos por km.

```json
{
  "generatedAt": "2026-11-04T15:07:30Z",
  "radiusKm": 5.0,
  "items": [{
    "zoneId": 7, "zoneName": "Zona Grau", "latitude": -12.05, "longitude": -77.03,
    "distanceMeters": 640, "estimatedAvailabilityPct": 70,
    "currentAvailabilityPct": 50, "nextWindowAvailabilityPct": 100,
    "available": 6, "total": 12, "classification": "MODERADO", "stale": false,
    "nextWindowStart": "2026-11-04T15:15:00Z"
  }]
}
```

`items: []` = "no hay sugerencias disponibles por el momento" (HU-13 E3).

## 5. Errores nuevos

| Status | `error` | Cuándo |
|---|---|---|
| `400` | `INVALID_NEARBY_QUERY` | `nearby`: coordenada fuera de rango o `radiusKm` fuera de (0, 50] |
| `400` | `INVALID_RECOMMENDATION_QUERY` | `recommendations`: coordenada, radio o `limit` inválidos |
| `400` | `INVALID_PARAMETER` | `lat`/`lng` no numéricos (de fundaciones) |

## 6. Frontend

| Pieza | Dónde |
|---|---|
| Colores: moderado amarillo `#d69e2e`, sin datos gris `#a0aec0` (token `--zone-sin-datos`), leyenda del mapa | `parking/domain/zone-classification.ts`, `MapLegend.vue`, `style.css` |
| Badge "Datos no actualizados · HH:mm" en lista, popup del mapa y detalle | `StaleBadge.vue`, `domain/availability-freshness.ts` |
| Refresco de 30 s silencioso (ya no parpadea "Cargando") | `zone.store.ts` `fetchZones({ silent })` |
| Marcadores con click/tap (popup fijo con "Ver detalle") | `useGoogleMap.ts` `onMarkerClick` |
| Avisos no bloqueantes sin conexión / GPS | `ConnectivityNotice.vue`, `shared/presentation/composables/useNetworkStatus.ts` |
| "Cerca de mí" + filtro 500 m / 1 / 2 / 5 km, "Ampliar a…", "Limpiar filtro", círculo del radio en el mapa | `ZonesView.vue`, `zone.store.ts` `fetchNearby` (respaldo en el navegador con `geo.ts` si el BE falla) |
| Recomendaciones (ruta `/dashboard/recommendations`, menú "Recomendaciones"), refresco 30 s o al moverse > 100 m | `predictions/presentation/views/RecommendationsView.vue`, `recommendation.store.ts` |
| "Cómo llegar": distancia y tiempo (Google Directions), Waze y Google Maps | `ZoneDirections.vue`, `infrastructure/route-estimate.ts`, `domain/navigation-links.ts` |
| PWA: `sw.js` + `manifest.webmanifest`; la Ayuda funciona sin conexión | `vite.config.ts` (`parkvisionPwa`), `pwa/service-worker.js`, `main.ts` |
| FAQ corregida (40/80, YOLO, 30 s, contacto genérico `VITE_SUPPORT_EMAIL`, por defecto `soporte@parkvision.pe`), búsqueda sin tildes, "sin coincidencias → Contactar a soporte" | `faq/domain/faq-content.ts`, `faq-search.ts`, `FaqView.vue` |

Variable de entorno nueva (opcional): `VITE_SUPPORT_EMAIL`. La estimación de ruta usa el servicio
`DirectionsService` de la API de Maps: la key debe tener habilitada la Directions API; si no, la
pantalla muestra "El servicio de rutas no está disponible temporalmente" y los enlaces siguen.
