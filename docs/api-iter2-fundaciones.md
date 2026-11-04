# API iteración 2 — Fundaciones (cloud-service, rama `iter2/fundaciones`)

Piezas transversales que usan las slices A–E: log de auditoría, revocación de JWT, CSV, errores
nuevos y rate limit configurable. Rutas relativas a la base URL (`http://localhost:8080` en local).
Para integrar en `API-Frontend.md` en la fase 3.

## 1. Resumen de endpoints

| Método y ruta | Rol | Respuesta | Para qué |
|---|---|---|---|
| `POST /api/v1/iam/auth/sign-out` | autenticado (cualquier rol) | `204` sin cuerpo | Cerrar sesión: revoca el token con que se llama (HU-05) |
| `GET /api/v1/audit/logs` | ADMIN | `200` `AuditLogPage` | Log de auditoría paginado y filtrado (HU-25) |
| `GET /api/v1/audit/logs/export.csv` | ADMIN | `200` `text/csv` adjunto | Mismo log, sin paginar, en CSV (HU-25) |

Documento OpenAPI nuevo: `/v3/api-docs/audit` (etiqueta `Audit Log`); también en `/v3/api-docs/all`.

## 2. Sign-out y revocación de tokens

### 2.1 `POST /api/v1/iam/auth/sign-out`

```
POST /api/v1/iam/auth/sign-out
Authorization: Bearer <token>
→ 204 No Content
```

- Desde la respuesta, **ese mismo token** responde `401` en toda la API. Las otras sesiones del
  usuario (otros dispositivos) siguen abiertas.
- Sin token o con un token ya revocado/vencido: `401` (sin cuerpo, lo responde el filtro de
  seguridad). El FE debe limpiar la sesión local igual, aunque el sign-out falle.
- Token emitido antes de este despliegue (sin claim `jti`): el backend no puede revocar solo ese,
  así que cierra **todas** las sesiones del usuario. Solo pasa durante las 24 h siguientes al
  despliegue, mientras esos tokens no vencen.

### 2.2 Cuándo un JWT deja de valer antes de su `exp`

Además de la firma y el `exp`, cada petición autenticada comprueba:

| Motivo | Origen | Efecto |
|---|---|---|
| El `jti` del token está revocado | sign-out | `401` con ese token |
| El token se emitió antes del corte del usuario (`iat < tokens_valid_after`) | `User.revokeAllTokens()`: cambio de rol, desactivación, cambio de contraseña (slices A/B) | `401` con todos los tokens anteriores; un login nuevo vale |
| El usuario está inactivo o se borró | `ToggleUserStatus` | `401` con cualquier token |

El `401` lleva `WWW-Authenticate: Bearer error="invalid_token", error_description="..."` y cuerpo
vacío, igual que un token vencido. **El FE no necesita distinguir el motivo**: ante cualquier `401`
borra la sesión y lleva a login.

Retraso: el estado se cachea 30 s por instancia. En la misma instancia la revocación se aplica al
instante (la caché se invalida al revocar); con varias réplicas, una revocación puede tardar hasta
30 s en verse en las otras.

### 2.3 Claims del JWT

| Claim | Cambio |
|---|---|
| `jti` | **Nuevo.** UUID por token. |
| `sub`, `role`, `email`, `iat`, `exp` | Sin cambios. |

## 3. Log de auditoría

### 3.1 `GET /api/v1/audit/logs`

| Query param | Tipo | Default | Notas |
|---|---|---|---|
| `from` | ISO-8601 instant | — | Inclusivo. `2026-11-01T00:00:00Z` o con offset `2026-11-01T00:00:00-05:00` |
| `to` | ISO-8601 instant | — | Exclusivo. Debe ser posterior a `from` |
| `zoneId` | number | — | Solo eventos de esa zona |
| `action` | `AuditAction` | — | Uno de los valores de la tabla 3.4 |
| `entityType` | string | — | `ZONE`, `CAMERA`, `USER`, `MODEL`, `CAMERA_ALERT` (sin distinguir mayúsculas) |
| `page` | number | `0` | Desde 0 |
| `size` | number | `20` | De 1 a 100 |

Orden fijo: `occurredAt` descendente (desempate por `id` descendente).

```json
{
  "items": [
    {
      "id": 31,
      "occurredAt": "2026-11-03T15:04:05Z",
      "actorUserId": 1,
      "actorEmail": "admin@parkvision.pe",
      "action": "ZONE_DELETED",
      "entityType": "ZONE",
      "entityId": "7",
      "zoneId": 7,
      "detail": "espacios=12, cámaras=2"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

- `actorUserId` y `actorEmail` son `null` cuando la acción la hizo un proceso del sistema
  (scheduler, p. ej. `MODEL_RETRAIN_FAILED`); mostrar "Sistema".
- `entityId`, `zoneId` y `detail` pueden ser `null`.
- `detail` es texto libre (a veces JSON serializado); mostrarlo tal cual.
- Sin eventos: `items: []`, `totalElements: 0` → mensaje "Sin eventos".
- `totalPages` no viaja: `Math.ceil(totalElements / size)`.

### 3.2 `GET /api/v1/audit/logs/export.csv`

Mismos filtros que 3.1, sin `page` ni `size`. Devuelve como máximo los **10 000** eventos más
recientes que calzan; para más, acotar el rango de fechas.

- `Content-Type: text/csv;charset=UTF-8`, con BOM UTF-8 (Excel abre bien los acentos).
- `Content-Disposition: attachment; filename="auditoria.csv"`.
- Separador `,`, fin de línea CRLF, comillas dobles según RFC 4180; `null` = celda vacía.
- Columnas: `id,occurredAt,actorUserId,actorEmail,action,entityType,entityId,zoneId,detail`.

Descarga desde el FE (el endpoint exige el header `Authorization`, así que un `<a href>` directo no
sirve):

```ts
const res = await http.get('/api/v1/audit/logs/export.csv', { params: filtros, responseType: 'blob' })
const url = URL.createObjectURL(res.data)
const a = Object.assign(document.createElement('a'), { href: url, download: 'auditoria.csv' })
a.click()
URL.revokeObjectURL(url)
```

### 3.3 Errores

| Status | `error` | Cuándo |
|---|---|---|
| `400` | `INVALID_AUDIT_QUERY` | `from` ≥ `to`, `page` < 0, `size` fuera de 1–100 |
| `400` | `INVALID_PARAMETER` | `action` que no existe, fecha que no es ISO-8601, `zoneId` no numérico |
| `401` | — (cuerpo vacío) | Sin token, token vencido o revocado |
| `403` | `ACCESS_DENIED` | Usuario autenticado sin rol ADMIN |

### 3.4 Acciones (`AuditAction`)

| Acción | `entityType` | La registra |
|---|---|---|
| `ZONE_CREATED`, `ZONE_UPDATED`, `ZONE_DELETED` | `ZONE` | slice B (HU-22) |
| `CAMERA_REGISTERED`, `CAMERA_UPDATED`, `CAMERA_ACTIVATED`, `CAMERA_DEACTIVATED` | `CAMERA` | slice B (HU-23) |
| `USER_ROLE_CHANGED`, `USER_ACTIVATED`, `USER_DEACTIVATED` | `USER` | slice B (HU-24) |
| `MODEL_RETRAIN_REQUESTED`, `MODEL_RETRAIN_FAILED` | `MODEL` | slice B (HU-27) |
| `CAMERA_ALERT_OPENED`, `CAMERA_ALERT_RESOLVED` | `CAMERA_ALERT` | slice E (HU-17) |

Etiquetas sugeridas para la vista: "Zona creada", "Zona actualizada", "Zona eliminada", "Cámara
registrada", "Cámara actualizada", "Cámara activada", "Cámara desactivada", "Rol de usuario
cambiado", "Usuario activado", "Usuario desactivado", "Reentrenamiento solicitado",
"Reentrenamiento fallido", "Alerta de cámara abierta", "Alerta de cámara resuelta".

## 4. Errores nuevos en toda la API

Antes estos casos salían como `403`/`500` sin cuerpo o como `400` sin `ApiError`; ahora todos
llevan `ApiError {timestamp, status, error, message, path}`.

| Status | `error` | Cuándo |
|---|---|---|
| `403` | `ACCESS_DENIED` | El `@PreAuthorize` del endpoint no se cumple (p. ej. un USER que pide datos de otro usuario) |
| `401` | `UNAUTHORIZED` | Mismo caso, pero sin usuario autenticado (ruta pública cuyo método exige rol) |
| `400` | `INVALID_ARGUMENT` | Una regla de dominio rota que antes daba `500` (p. ej. un rol que no existe) |
| `400` | `INVALID_PARAMETER` | Query param o path variable con tipo inválido |

Los `401`/`403` que decide la configuración de rutas (token ausente, vencido o revocado;
`api-keys/**` sin ADMIN) siguen saliendo del filtro de seguridad, con cuerpo vacío. El FE debe
tratar el `403` con y sin cuerpo igual.

## 5. Rate limit

Sin cambios visibles: `sign-in` y `forgot-password` comparten un límite de **5 peticiones por
minuto por IP**; la sexta responde:

```json
{"status":429,"error":"TOO_MANY_REQUESTS","message":"Too many requests. Try again in a minute."}
```

Las slices que agreguen límites en otras rutas (p. ej. `verify-otp`, `reset-password` en la slice
A) documentan su capacidad y ventana; el cuerpo es el mismo con la ventana en el `message`
("Try again in 15 minutes.").

## 6. Contrato para las slices del backend

Firmas públicas que existen desde esta rama (`cloud-service`):

```java
// shared/application/audit
public interface AuditRecorder { void record(AuditEntry entry); }
public record AuditEntry(AuditAction action, String entityType, String entityId, Long zoneId, String detail) {}
public enum AuditAction { ZONE_CREATED, ZONE_UPDATED, ZONE_DELETED, CAMERA_REGISTERED, CAMERA_UPDATED,
    CAMERA_ACTIVATED, CAMERA_DEACTIVATED, USER_ROLE_CHANGED, USER_ACTIVATED, USER_DEACTIVATED,
    MODEL_RETRAIN_REQUESTED, MODEL_RETRAIN_FAILED, CAMERA_ALERT_OPENED, CAMERA_ALERT_RESOLVED }

// iam/domain/model/aggregates/User
public void revokeAllTokens();                 // guardar con userRepository.save(user)
public void revokeAllTokens(Instant now);      // para tests

// shared/interfaces/rest
public static ResponseEntity<byte[]> CsvResponse.of(String filename, List<String> header, List<? extends List<?>> rows);
public static byte[] CsvResponse.toBytes(List<String> header, List<? extends List<?>> rows);
public static String CsvResponse.escape(Object value);

// shared/infrastructure/web (no es bean: se instancia en el WebMvcConfigurer del contexto)
public RateLimitInterceptor(int capacity, Duration window);
public static RateLimitInterceptor RateLimitInterceptor.perMinute(int requests);
```

- `AuditRecorder.record` se llama **dentro** del `@Transactional` del caso de uso: si el caso de
  uso hace rollback, la entrada también. El actor lo pone la implementación (JWT del
  `SecurityContext`); en un scheduler queda `null`. `entityType` en mayúsculas, máx. 50;
  `entityId` máx. 100; `detail` se recorta a 4000.
- `AuditAction` se guarda por nombre y la columna no tiene `check`: agregar un valor no requiere
  migración.
- `User.revokeAllTokens()` fija `tokens_valid_after` al segundo actual (truncado). `setActive(...)`
  ya invalida la caché del validador; no hace falta llamar a los dos para desactivar, pero sí
  `revokeAllTokens()` al reactivar si los tokens viejos no deben volver a valer.
- Para limitar una ruta nueva: `registry.addInterceptor(new RateLimitInterceptor(5,
  Duration.ofMinutes(15))).addPathPatterns("/api/v1/iam/auth/verify-otp")`. Rutas registradas con
  la misma instancia comparten contador.
- Cadena de seguridad del contexto `audit`: `@Order(6)`.

## 7. Migraciones

| Versión | Contenido |
|---|---|
| `V19__log_de_auditoria.sql` | Tabla `audit_log` + índices `(occurred_at desc)`, `(zone_id)`, `(action)` |
| `V20__revocacion_de_tokens.sql` | Tabla `revoked_token (jti, expires_at)` + `iam_user.tokens_valid_after` |

Variable de entorno nueva (opcional): `IAM_REVOKED_TOKENS_PURGE_CRON` (default `0 30 3 * * *`,
purga diaria de `revoked_token` vencidos).
