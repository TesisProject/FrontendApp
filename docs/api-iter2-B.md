# API iteración 2 — Slice B: administración y auditoría (HU-22, 23, 24, 25, 27)

Cambios del backend (`cloud-service`, rama `iter2/B`) que consume el panel admin. Rutas relativas a
`/api/v1`. Para integrar en `API-Frontend.md` en la fase 3. Todo error lleva
`ApiError {timestamp, status, error, message, path}`; el FE decide por `error`.

## 1. Resumen de endpoints

| Método y ruta | Rol | Respuesta | Nuevo / cambia |
|---|---|---|---|
| `DELETE /parking/zones/{id}?confirm=true` | ADMIN, OPERATOR | `204` | Cambia: sin `confirm`, 409 si la zona tiene datos |
| `GET /parking/zones/{id}/deletion-impact` | ADMIN, OPERATOR | `200 ZoneDeletionImpact` | Nuevo |
| `GET /iam/users?q=&role=` | ADMIN | `200 UserResource[]` | Cambia: filtros y `fullName` |
| `PUT /iam/users/{id}/role` | ADMIN | `200 UserResource` | Cambia: 400 `INVALID_ROLE`, 409 `LAST_ACTIVE_ADMIN` |
| `PUT /iam/users/{id}/status` | ADMIN | `200 UserResource` | Cambia: 409 `LAST_ACTIVE_ADMIN` |
| `POST/PUT /occupancy/cameras[/{id}]` | ADMIN, OPERATOR | igual | Cambia: errores nuevos y auditoría |
| `POST /prediction/model/retrain` | ADMIN | `202` sin cuerpo | Nuevo |
| `GET /prediction/model/runs?limit=20` | ADMIN | `200 ModelTrainingRun[]` | Nuevo |
| `GET /prediction/model/versions?limit=20` | ADMIN | `200 ModelVersion[]` | Nuevo |
| `PUT /prediction/zones/{id}/forecasts` | ADMIN, PREDICTION | igual | Cambia: campo opcional `runId` |

Todas las acciones de zona, cámara, usuario y modelo quedan en el log de auditoría
(`GET /audit/logs`, ver `api-iter2-fundaciones.md` §3) con actor, fecha y detalle.

## 2. Zonas (HU-22)

### 2.1 Eliminar con segunda confirmación

```
DELETE /parking/zones/7            → 409 ZONE_HAS_ACTIVE_DATA   (tiene espacios, espacios monitoreados o cámaras)
GET    /parking/zones/7/deletion-impact
       → {"zoneId":7,"parkingSpaces":12,"monitoredSpaces":6,"cameras":2,"activeCameras":1,"hasActiveData":true}
DELETE /parking/zones/7?confirm=true → 204
```

- Sin datos asociados, `DELETE` sin `confirm` borra directo (204).
- Con `confirm=true`: se borran los espacios del catálogo y los monitoreados (con su ROI); las
  cámaras quedan **desactivadas y sin zona** (`zoneId: null`) para reasignarlas. El historial de
  ocupación y de pronósticos se conserva. Auditoría: `ZONE_DELETED` (con los conteos en `detail`) y
  un `CAMERA_DEACTIVATED` por cada cámara que estaba activa.
- Flujo del FE (`AdminZonesView`): primera confirmación → `DELETE`; si responde 409, pide los
  conteos y muestra la segunda confirmación → `DELETE ?confirm=true`. Toast de éxito o error.

### 2.2 Validación por campo

Un body inválido responde `400 VALIDATION_ERROR` con `message` = `"campo: mensaje, campo: mensaje"`.
El FE lo traduce con `validationFieldErrors()` (`admin-field-errors.ts`) y marca cada campo
(`AdminField :error`). El formulario además valida en el cliente antes de enviar.

Crear y editar responden igual que antes y se auditan (`ZONE_CREATED`, `ZONE_UPDATED`).

## 3. Cámaras (HU-23)

Registrar, editar, activar y desactivar se auditan (`CAMERA_REGISTERED`, `CAMERA_UPDATED`,
`CAMERA_ACTIVATED`, `CAMERA_DEACTIVATED`; activar/desactivar = cambio de `active` en
`PUT /occupancy/cameras/{id}`). `CameraResource.zoneId` y `CameraConfigResource.zoneId` pueden ser
`null` (cámara cuya zona se eliminó; siempre `active: false`). `active` ya viajaba en la config del
nodo (`GET /occupancy/nodes/{id}/config`), sin cambios para el Fog.

| Status | `error` | Cuándo |
|---|---|---|
| 400 | `CAMERA_NODE_NOT_FOUND` | `nodeId` que no existe (alta o edición) |
| 409 | `CAMERA_NODE_INACTIVE` | Activar una cámara de un nodo desactivado |
| 400 | `CAMERA_ZONE_REQUIRED` | Dejar activa una cámara sin zona |
| 400 | `CAMERA_MAC_REQUIRED` | (además) activar una cámara antigua sin MAC |
| 400 | `CAMERA_ZONE_NOT_FOUND` | (sin cambios) zona inexistente |

FE: botón Activar/Desactivar en cada fila (`store.setActive`), la fila se actualiza con la
respuesta y el toast dice la causa exacta si falla.

## 4. Usuarios (HU-24)

`GET /iam/users?q=ana&role=OPERATOR` — `q` busca sin distinguir mayúsculas en el correo y en el
nombre completo del perfil; `role` es exacto (`ADMIN`, `OPERATOR`, `USER`, sin distinguir
mayúsculas). Sin parámetros lista a todos. `UserResource` agrega `fullName` (`string | null`, solo
en este listado).

| Status | `error` | Cuándo |
|---|---|---|
| 400 | `INVALID_ROLE` | Rol inexistente en `PUT /role` o en el filtro `role` (antes: 500) |
| 409 | `LAST_ACTIVE_ADMIN` | Desactivar o quitar ADMIN al único administrador activo |
| 404 | `USER_NOT_FOUND` | Usuario inexistente |

- Si el rol o el estado cambia, todos los tokens del usuario dejan de valer (`revokeAllTokens`) y
  queda en auditoría (`USER_ROLE_CHANGED` con `ADMIN -> OPERATOR` en `detail`, `USER_ACTIVATED`,
  `USER_DEACTIVATED`). Pedir el mismo rol o estado no hace nada (200, sin auditoría).
- FE: búsqueda con debounce de 300 ms contra el backend, columna Nombre, errores visibles en el
  diálogo y en un toast, y aviso del último admin (deshabilita Confirmar) usando
  `GET /iam/users?role=ADMIN`.

## 5. Modelo IA (HU-27)

```
POST /prediction/model/retrain   {"dryRun": false}   (cuerpo opcional)  → 202
GET  /prediction/model/runs
  → [{"id":301,"runNumber":45,"trigger":"workflow_dispatch","status":"completed","conclusion":"failure",
      "failed":true,"startedAt":"2026-11-04T14:58:05Z","finishedAt":"2026-11-04T15:00:00Z",
      "logsUrl":"https://github.com/<repo>/actions/runs/301"}]
GET  /prediction/model/versions
  → [{"id":3,"modelVersion":"profile-anchor-v1","runId":301,"publishedAt":"...","lastPublishedAt":"...","zonesPublished":4}]
```

- `retrain` dispara el workflow `prediction-engine.yml` por `workflow_dispatch` y se audita
  (`MODEL_RETRAIN_REQUESTED`). La corrida aparece en `/runs` a los pocos segundos.
- `runs`: estado en vivo desde GitHub, solo corridas de entrenamiento (`schedule`,
  `workflow_dispatch`). `status` ∈ `queued | in_progress | completed`; `conclusion` `null` mientras corre.
- `versions`: una por corrida que publicó al menos una zona (el engine manda `runId` =
  `GITHUB_RUN_ID` en el `PUT forecasts`). No depende del token de GitHub.
- Cada 5 min el backend busca corridas fallidas (últimas 24 h) y, una sola vez por corrida, avisa a
  los ADMIN activos por correo y con una notificación in-app (`type: ALERT`), y audita
  `MODEL_RETRAIN_FAILED`. El pronóstico publicado no cambia: cada zona se reemplaza en un solo `PUT`
  transaccional, así que una zona que falla conserva el anterior.

| Status | `error` | Cuándo |
|---|---|---|
| 503 | `MODEL_TRAINING_NOT_CONFIGURED` | Faltan `GITHUB_TOKEN` o `GITHUB_REPO` en el backend (`retrain`, `runs`) |
| 503 | `MODEL_TRAINING_UNAVAILABLE` | GitHub rechazó la petición (401/403/404/422) o no respondió |
| 400 | — | `limit` fuera de 1–50 (`runs`) o 1–100 (`versions`) |

## 6. Vistas nuevas del panel

| Ruta | Vista | HU |
|---|---|---|
| `/admin/audit` | `AdminAuditView` — filtros Desde/Hasta (fecha local, ambas inclusivas), Zona y Tipo de evento; tabla descendente paginada de 20; "Exportar CSV" con los filtros aplicados; "No hay eventos para los filtros aplicados" | HU-25 |
| `/admin/model` | `AdminModelView` — "Reentrenar" (con opción "solo probar"), corridas con estado y enlace "Ver logs", versiones con fecha y hora; se refresca sola cada 15 s mientras hay una corrida en curso | HU-27 |

## 7. Migraciones y variables de entorno

| Versión | Contenido |
|---|---|
| `V23__camara_sin_zona.sql` | `camera.zone_id` admite null |
| `V24__versiones_y_corridas_del_modelo.sql` | `model_version_log`, `model_training_run` |

| Variable | Default | Uso |
|---|---|---|
| `GITHUB_TOKEN` | — | Fine-grained token con *Actions: Read and write* sobre el repo del backend |
| `GITHUB_REPO` | — | `owner/name` del repo con el workflow |
| `GITHUB_WORKFLOW_FILE` | `prediction-engine.yml` | Workflow que se dispara |
| `GITHUB_WORKFLOW_REF` | `main` | Rama con que corre |
| `PREDICTION_TRAINING_CHECK_INTERVAL` | `PT5M` | Frecuencia del vigía de corridas fallidas |
