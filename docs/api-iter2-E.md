# API iteración 2 — Slice E: alertas de cámara, heartbeat del Fog y cámara deshabilitada

HU-17 (cámara caída), HU-23 (partes Fog y firmware) y HU-08 (reintento y heartbeat del Fog). Ramas
`iter2/E` de `cloud-service`, `frontend-app`, `fog-application` y `esp32cam`. Rutas relativas a la
base URL. Para integrar en `API-Frontend.md` en la fase 3.

## 1. Resumen de endpoints (Cloud)

| Método y ruta | Rol | Respuesta | Para qué |
|---|---|---|---|
| `GET /api/v1/notifications/camera-alerts` | ADMIN, OPERATOR | `200` `CameraAlert[]` | Todas las alertas, de la más reciente a la más antigua |
| `GET /api/v1/notifications/camera-alerts/{id}` | ADMIN, OPERATOR | `200` `CameraAlert` | Una alerta |
| `GET /api/v1/notifications/camera-alerts/mine` | ADMIN, OPERATOR | `200` `InboxItem[]` | **Nuevo.** La campana: mis avisos no leídos |
| `PATCH /api/v1/notifications/camera-alerts/mine/{notificationId}/read` | ADMIN, OPERATOR | `204` | **Nuevo.** Marcar leído uno de mis avisos |
| `PATCH /api/v1/notifications/camera-alerts/mine/read` | ADMIN, OPERATOR | `204` | **Nuevo.** Marcar leídos todos mis avisos |
| `PATCH /api/v1/notifications/camera-alerts/{id}/acknowledge` | ADMIN, OPERATOR | `204` | Reconocer (**sin cuerpo**; antes pedía `acknowledgedBy`) |
| `PATCH /api/v1/notifications/camera-alerts/{id}/resolve` | ADMIN, OPERATOR | `204` | Resolver a mano `{resolutionNote}` (obligatoria) |
| `POST /api/v1/notifications/camera-alerts`, `POST/GET .../{id}/notifications` | ADMIN, OPERATOR | sin cambios | Sin uso en el FE |
| `POST /api/v1/occupancy/nodes/{nodeId}/heartbeat` | API Key FOG del propio nodo | `204` | **Nuevo.** Heartbeat del Fog (no lo usa el FE) |

Cambio de seguridad: todo `/camera-alerts/**` exigía solo estar autenticado; ahora un USER recibe
`403 ACCESS_DENIED`.

## 2. Modelos

### 2.1 `CameraAlert`

Las horas pasan a **ISO-8601 UTC** (`...Z`); antes eran `LocalDateTime` sin zona. Campos nuevos:
`cameraCode`, `cameraName`, `zoneName`.

```json
{
  "id": 1, "cameraId": 1, "cameraCode": "CAM-001", "cameraName": "Entrada",
  "zoneId": 1, "zoneName": "Sótano A",
  "alertType": "CAMERA_OFFLINE", "severity": "CRITICAL",
  "detectedAt": "2026-11-04T08:50:55.218469Z",
  "lastFrameAt": "2026-11-04T08:46:08Z",
  "secondAlertSentAt": "2026-11-04T08:55:55.341824Z",
  "acknowledgedBy": null, "acknowledgedAt": null,
  "resolvedAt": null, "resolutionNote": null,
  "createdAt": "2026-11-04T08:50:55.229291Z"
}
```

- `lastFrameAt`: hora de la **última imagen recibida** (la que pide HU-17); solo en `CAMERA_OFFLINE`.
- `severity`: `HIGH` al abrir; `CRITICAL` tras el segundo aviso (`secondAlertSentAt` no nulo).
- `cameraCode`/`cameraName`/`zoneName` son `null` si la cámara o la zona ya no existen.
- Estado para la vista: `resolvedAt` ≠ null → Resuelta; si no, `acknowledgedAt` ≠ null → Reconocida;
  si no, Abierta.

### 2.2 `InboxItem` (`/mine`)

```json
{ "notificationId": 2, "sentAt": "2026-11-04T08:50:55.266510Z", "read": false, "alert": { ...CameraAlert } }
```

El contador de la campana es la longitud de la lista. La alerta puede estar ya resuelta (la cámara
volvió): el aviso sigue sin leer hasta que el usuario lo lea o reconozca la alerta.

## 3. Comportamiento (HU-17)

- **Última señal** de cada cámara (`camera.lastSeenAt`, nuevo en `CameraResource`): la adelantan los
  eventos del Fog (cada 30 s), las fotos (cada 5 min) y el heartbeat (cada 60 s). Nunca retrocede.
- **Vigilante** cada 60 s: una cámara **activa** con `now − lastSeenAt > max(3 × intervalSec, 90 s)`
  abre `CAMERA_OFFLINE`. Una cámara que nunca envió nada no alerta.
- **Aviso**: a cada ADMIN y OPERATOR activo, correo + un aviso en `/mine`, con nombre de la cámara,
  zona y hora de la última imagen.
- **Segundo aviso** a los 5 min si sigue caída: correo + `severity: CRITICAL`. No hay tercero. Quien
  no leyó el primero no recibe otro aviso en la campana (solo el correo).
- **Se resuelve sola** al volver a enviar (nota «Cámara de nuevo en línea: última señal …»), al
  desactivarla o al borrarla.
- **Reconocer** marca leídos mis avisos de esa alerta; no la cierra.
- **Resolver a mano** la cierra con la nota; si la cámara sigue caída no se reabre por la misma
  caída (solo cuando vuelva a enviar y caiga otra vez).
- Auditoría: `CAMERA_ALERT_OPENED` y `CAMERA_ALERT_RESOLVED` (`entityType: CAMERA_ALERT`); las
  automáticas sin actor ("Sistema"), la manual con el usuario.

## 4. Errores nuevos

| Status | `error` | Cuándo |
|---|---|---|
| `409` | `CAMERA_ALERT_ALREADY_RESOLVED` | Resolver una alerta ya resuelta (p. ej. se cerró sola) |
| `404` | `CAMERA_ALERT_NOTIFICATION_NOT_FOUND` | Marcar leído un aviso que no existe o es de otro usuario |
| `404` | `CAMERA_ALERT_NOT_FOUND` | (ya existía) |
| `403` | `ACCESS_DENIED` | USER en `/camera-alerts/**` |

Mensajes en español en `src/app/notifications/application/camera-alert-error-messages.ts`.

## 5. Campos nuevos en recursos existentes

| Recurso | Campo | Tipo | Nota |
|---|---|---|---|
| `CameraResource` (`/occupancy/cameras`) | `lastSeenAt` | ISO \| null | Última señal |
| `CameraResource` | `lastSyncError` | string \| null | Último problema del Fog al aplicar su config |
| `NodeResource` (`/occupancy/nodes`) | `lastHeartbeatAt` | ISO \| null | Último heartbeat (hora del Cloud) |
| `NodeResource` | `lastSyncError` | string \| null | Error de la última sincronización del nodo |

Se agregan al final del record: el FE actual no se rompe. Mostrarlos en las vistas de Cámaras y
Nodos queda para la integración (las tocan otras slices).

## 6. Contrato Fog → Cloud: heartbeat

```
POST /api/v1/occupancy/nodes/{nodeId}/heartbeat
X-API-Key: <key FOG del nodo>
{
  "sentAt": "2026-11-04T08:46:08Z",
  "lastSyncError": null,
  "cameras": [
    { "cameraId": 7, "lastSeenAt": "2026-11-04T08:45:40+00:00", "lastSyncError": "capture.intervalSec no valido (5)" }
  ]
}
→ 204 · 403 con la key de otro nodo · 404 NODE_NOT_FOUND · 400 VALIDATION_ERROR (cameras null, > 200)
```

`lastSeenAt` = llegada al Fog de la última foto de la cámara. Una hora futura se recorta a "ahora";
una cámara que no es del nodo se ignora.

## 7. Contrato Fog → cámara: `GET /api/v1/camera/config`

- Campo nuevo `enabled: boolean`, incluido en `revision`.
- Responde también a una cámara **deshabilitada** (antes `403`). Las demás rutas de la cámara siguen
  respondiendo `403` mientras lo esté.

## 8. Migración

| Versión | Contenido |
|---|---|
| `V27__ultima_senal_camara_y_heartbeat_nodo.sql` | `camera.last_seen_at` (rellenada con la última foto), `camera.last_sync_error`, `fog_node.last_heartbeat_at`, `fog_node.last_sync_error`; índices de avisos no leídos por usuario y de alertas por cámara |

Variables nuevas (opcionales): Cloud `NOTIFICATIONS_CAMERA_OFFLINE_CHECK_MS` (60000) y
`NOTIFICATIONS_CAMERA_OFFLINE_INITIAL_DELAY_MS` (60000); Fog `CONFIG_SYNC_INTERVAL_MINUTES` (ahora
1), `HEARTBEAT_INTERVAL_SECONDS` (60), `DETECTION_RETRY_INTERVAL_SECONDS` (60),
`DETECTION_RETRY_BATCH_SIZE` (50), `DETECTION_RETRY_MAX_AGE_HOURS` (24).

## 9. Frontend

- Módulo nuevo `src/app/notifications` (domain / infrastructure / application / presentation).
- Vista `/admin/alerts` (`AdminAlertsView.vue`): filtro Abiertas/Resueltas/Todas, cámara, zona, tipo,
  última imagen, estado; Reconocer, Resolver (con nota) y Marcar leídos.
- Campana: entrada «Alertas» (ícono `Bell`) en el nav de `AdminLayout` con contador de no leídos,
  refrescado cada 30 s (`startInboxPolling`). `NavItem` gana `badge?: MaybeRef<number>` y `AppShell`
  lo pinta (también con el sidebar colapsado).
