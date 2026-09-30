# ParkVision — API para el Frontend

> Documentación técnica de las APIs REST del backend (Cloud). Generada el 2026-07-03 a partir de los specs OpenAPI reales que exponen los servicios en ejecución. Todos los servicios comparten el mismo modelo de autenticación y formato de error.

## 1. Punto de entrada y entornos

Todo el tráfico del frontend pasa por el **API Gateway**. Nunca llames a los servicios por su puerto individual — usa siempre el gateway como único origen.

| Entorno | Base URL |
|---|---|
| Local (docker compose) | `http://localhost:8080` |
| Azure (Container Apps) | dominio del gateway del entorno |

Todas las rutas de este documento son **relativas a la base URL** y empiezan por `/api/v1/...`.

## 2. Autenticación

El backend es **stateless**: no hay sesión ni cookies. Cada request protegido debe llevar el token.

### 2.1 JWT (usuarios de la app)

1. El usuario se registra (`POST /api/v1/iam/users`) o ya existe.
2. Hace login en `POST /api/v1/iam/auth/sign-in` → responde un **JWT (RS256)**.
3. En cada llamada protegida se envía el header:

```
Authorization: Bearer <token>
```

El JWT incluye los claims `sub` (id de usuario), `role`, `email`, `iat` y `exp`. **Guárdalo** (memoria/storage seguro) y refréscalo volviendo a hacer login cuando expire (respuesta `401`).

### 2.2 Roles

El claim `role` determina qué puede hacer el usuario. Roles existentes:

| Rol | Para quién | Uso típico en el frontend |
|---|---|---|
| `USER` | App móvil/web del conductor | Ver disponibilidad, favoritos, ratings, notificaciones propias. |
| `OPERATOR` | Operador del estacionamiento | Gestión de zonas, cámaras, nodos, ROI. |
| `ADMIN` | Administrador | Todo lo anterior + gestión de usuarios/roles/permisos. |
| `FOG` | Nodo Fog (no es una persona) | Se autentica con **API-Key**, no con JWT. Ingesta de eventos y descarga de config. |

> En cada endpoint se indica el/los rol(es) permitidos. Si un rol no está autorizado, la respuesta es `403 Forbidden`; sin token (o expirado) es `401 Unauthorized`.

### 2.3 API-Key (solo nodos Fog)

Los endpoints marcados con 🔑 los usa el nodo Fog, no el frontend. Se autentican con el header `X-API-Key: <keyId.secret>` y otorgan el rol `FOG`.

## 3. Formato de errores

Todos los errores siguen el mismo esquema JSON:

```json
{
  "timestamp": "2026-07-03T14:00:00Z",
  "status": 404,
  "error": "ZONE_NOT_FOUND",
  "message": "Zone 123 not found",
  "path": "/api/v1/parking/zones/123"
}
```

| Código | Cuándo | Acción en el frontend |
|---|---|---|
| `400` | Validación del body/params falló | Mostrar los campos inválidos. |
| `401` | Falta token o expiró | Redirigir a login / refrescar token. |
| `403` | Autenticado pero sin el rol necesario | Ocultar/deshabilitar la acción. |
| `404` | Recurso no existe | Mensaje de "no encontrado". |
| `409` | Conflicto (p. ej. email ya registrado) | Mostrar mensaje específico. |
| `429` | Rate limit (endpoints sensibles de auth) | Pedir reintentar más tarde. |

## 4. Convenciones

- **IDs**: enteros (`Long`). **Fechas/horas**: ISO-8601 UTC (`2026-07-03T14:00:00Z`).
- **Content-Type**: `application/json` en requests con body.
- Las respuestas de lista son arrays JSON planos (sin paginación por ahora).
- Las rutas `/api/v1/**/internal/**` son de comunicación entre servicios: **el frontend no debe usarlas** (se documentan solo como referencia).

## 5. Servicios

| Servicio | Prefijo | Qué ofrece |
|---|---|---|
| [IAM](#svc-iam) | `/api/v1/iam/…` | Registro, login, usuarios, roles, permisos, perfil, preferencias, favoritos, ratings y API-keys. |
| [Parking](#svc-parking) | `/api/v1/parking/…` | Catálogo de zonas y espacios, y sus reseñas. |
| [Vision / Occupancy](#svc-occupancy) | `/api/v1/occupancy/…` | Cámaras, nodos Fog, ROI de espacios, disponibilidad e historial de ocupación. |
| [Prediction](#svc-prediction) | `/api/v1/prediction/…` | Pronósticos de ocupación futura por zona y por espacio. |
| [Notifications](#svc-notifications) | `/api/v1/notifications/…` | Historial de notificaciones al usuario y alertas de cámara. |

---

<a name="svc-iam"></a>

## IAM — Identidad y Acceso

Registro, login, usuarios, roles, permisos, perfil, preferencias, favoritos, ratings y API-keys.

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/iam/api-keys` | JWT | Emitir una API Key para un nodo Fog (la key completa se muestra una sola vez) |
| `GET` | `/api/v1/iam/api-keys` | JWT | Listar las API Keys emitidas (metadata, sin secretos) |
| `DELETE` | `/api/v1/iam/api-keys/{apiKeyId}` | JWT | Revocar una API Key |
| `POST` | `/api/v1/iam/auth/forgot-password` | Público | Solicitar código OTP para recuperación de contraseña |
| `POST` | `/api/v1/iam/auth/reset-password` | Público | Restablecer contraseña usando el OTP verificado |
| `POST` | `/api/v1/iam/auth/sign-in` | Público | Iniciar sesión y obtener un token JWT |
| `POST` | `/api/v1/iam/auth/verify-otp` | Público | Verificar que el OTP sea correcto y no haya expirado |
| `POST` | `/api/v1/iam/permissions` | JWT | Crear un nuevo permiso |
| `GET` | `/api/v1/iam/permissions` | JWT | Listar todos los permisos |
| `GET` | `/api/v1/iam/permissions/{permissionId}` | JWT | Obtener un permiso por id |
| `PUT` | `/api/v1/iam/permissions/{permissionId}` | JWT | Actualizar un permiso |
| `DELETE` | `/api/v1/iam/permissions/{permissionId}` | JWT | Eliminar un permiso |
| `POST` | `/api/v1/iam/roles` | JWT | Crear un nuevo rol |
| `GET` | `/api/v1/iam/roles` | JWT | Listar todos los roles |
| `GET` | `/api/v1/iam/roles/{roleId}` | JWT | Obtener un rol por id |
| `PUT` | `/api/v1/iam/roles/{roleId}` | JWT | Actualizar un rol |
| `DELETE` | `/api/v1/iam/roles/{roleId}` | JWT | Eliminar un rol |
| `POST` | `/api/v1/iam/roles/{roleId}/permissions` | JWT | Asignar un permiso a un rol |
| `GET` | `/api/v1/iam/roles/{roleId}/permissions` | JWT | Listar los permisos asignados a un rol |
| `DELETE` | `/api/v1/iam/roles/{roleId}/permissions/{permissionId}` | JWT | Quitar un permiso de un rol |
| `POST` | `/api/v1/iam/users` | Público | Registrar un nuevo usuario |
| `GET` | `/api/v1/iam/users` | JWT | Listar todos los usuarios (admin) |
| `GET` | `/api/v1/iam/users/{userId}` | JWT | Obtener usuario por id |
| `PUT` | `/api/v1/iam/users/{userId}` | JWT | Actualizar email o contraseña del usuario |
| `POST` | `/api/v1/iam/users/{userId}/favorites` | JWT | Agregar una zona a favoritos |
| `GET` | `/api/v1/iam/users/{userId}/favorites` | JWT | Listar zonas favoritas del usuario |
| `DELETE` | `/api/v1/iam/users/{userId}/favorites/{zoneId}` | JWT | Eliminar una zona de favoritos |
| `PUT` | `/api/v1/iam/users/{userId}/password` | JWT | Cambiar contraseña verificando la actual |
| `GET` | `/api/v1/iam/users/{userId}/preferences` | JWT | Obtener preferencias del usuario |
| `PUT` | `/api/v1/iam/users/{userId}/preferences` | JWT | Actualizar preferencias del usuario |
| `GET` | `/api/v1/iam/users/{userId}/profile` | JWT | Obtener perfil del usuario |
| `PUT` | `/api/v1/iam/users/{userId}/profile` | JWT | Actualizar perfil del usuario |
| `POST` | `/api/v1/iam/users/{userId}/ratings` | JWT | Calificar una zona |
| `GET` | `/api/v1/iam/users/{userId}/ratings` | JWT | Listar calificaciones del usuario |
| `PUT` | `/api/v1/iam/users/{userId}/ratings/{zoneId}` | JWT | Actualizar calificación de una zona |
| `DELETE` | `/api/v1/iam/users/{userId}/ratings/{zoneId}` | JWT | Eliminar calificación de una zona |
| `PUT` | `/api/v1/iam/users/{userId}/role` | JWT | Cambiar rol de un usuario (admin) |
| `PUT` | `/api/v1/iam/users/{userId}/status` | JWT | Activar/desactivar usuario (admin) |

### `POST` /api/v1/iam/api-keys

**Emitir una API Key para un nodo Fog (la key completa se muestra una sola vez)**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `nodeId` | integer (int64) | no |
| `expiresAt` | date-time | no |


```json
{
  "name": "string",
  "nodeId": 1,
  "expiresAt": "2026-07-03T14:00:00Z"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `apiKey` | string | no |
| `metadata` | [`ApiKeyResource`](#modelo-apikeyresource) | no |


```json
{
  "apiKey": "string",
  "metadata": {
    "id": 1,
    "keyId": "string",
    "name": "string",
    "nodeId": 1,
    "active": true,
    "expiresAt": "2026-07-03T14:00:00Z",
    "lastUsedAt": "2026-07-03T14:00:00Z",
    "createdAt": "2026-07-03T14:00:00Z"
  }
}
```

### `GET` /api/v1/iam/api-keys

**Listar las API Keys emitidas (metadata, sin secretos)**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Respuesta `200`:**

Array de [`ApiKeyResource`](#modelo-apikeyresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `keyId` | string | no |
| `name` | string | no |
| `nodeId` | integer (int64) | no |
| `active` | boolean | no |
| `expiresAt` | date-time | no |
| `lastUsedAt` | date-time | no |
| `createdAt` | date-time | no |


```json
[
  {
    "id": 1,
    "keyId": "string",
    "name": "string",
    "nodeId": 1,
    "active": true,
    "expiresAt": "2026-07-03T14:00:00Z",
    "lastUsedAt": "2026-07-03T14:00:00Z",
    "createdAt": "2026-07-03T14:00:00Z"
  }
]
```

### `DELETE` /api/v1/iam/api-keys/{apiKeyId}

**Revocar una API Key**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `apiKeyId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/iam/auth/forgot-password

**Solicitar código OTP para recuperación de contraseña**

- **Auth:** 🌐 Público

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |


```json
{
  "email": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `message` | string | no |


```json
{
  "message": "string"
}
```

### `POST` /api/v1/iam/auth/reset-password

**Restablecer contraseña usando el OTP verificado**

- **Auth:** 🌐 Público

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `otp` | string | sí |
| `newPassword` | string | sí |


```json
{
  "email": "string",
  "otp": "string",
  "newPassword": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `message` | string | no |


```json
{
  "message": "string"
}
```

### `POST` /api/v1/iam/auth/sign-in

**Iniciar sesión y obtener un token JWT**

- **Auth:** 🌐 Público

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `password` | string | sí |


```json
{
  "email": "string",
  "password": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `token` | string | no |
| `tokenType` | string | no |
| `userId` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |


```json
{
  "token": "string",
  "tokenType": "string",
  "userId": 1,
  "email": "string",
  "role": "string"
}
```

### `POST` /api/v1/iam/auth/verify-otp

**Verificar que el OTP sea correcto y no haya expirado**

- **Auth:** 🌐 Público

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `otp` | string | sí |


```json
{
  "email": "string",
  "otp": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `message` | string | no |


```json
{
  "message": "string"
}
```

### `POST` /api/v1/iam/permissions

**Crear un nuevo permiso**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `resource` | string | sí |
| `action` | string | sí |
| `description` | string | no |


```json
{
  "name": "string",
  "resource": "string",
  "action": "string",
  "description": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `resource` | string | no |
| `action` | string | no |
| `description` | string | no |


```json
{
  "id": 1,
  "name": "string",
  "resource": "string",
  "action": "string",
  "description": "string"
}
```

### `GET` /api/v1/iam/permissions

**Listar todos los permisos**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Respuesta `200`:**

Array de [`PermissionResource`](#modelo-permissionresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `resource` | string | no |
| `action` | string | no |
| `description` | string | no |


```json
[
  {
    "id": 1,
    "name": "string",
    "resource": "string",
    "action": "string",
    "description": "string"
  }
]
```

### `GET` /api/v1/iam/permissions/{permissionId}

**Obtener un permiso por id**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `permissionId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `resource` | string | no |
| `action` | string | no |
| `description` | string | no |


```json
{
  "id": 1,
  "name": "string",
  "resource": "string",
  "action": "string",
  "description": "string"
}
```

### `PUT` /api/v1/iam/permissions/{permissionId}

**Actualizar un permiso**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `permissionId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `resource` | string | sí |
| `action` | string | sí |
| `description` | string | no |


```json
{
  "name": "string",
  "resource": "string",
  "action": "string",
  "description": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `resource` | string | no |
| `action` | string | no |
| `description` | string | no |


```json
{
  "id": 1,
  "name": "string",
  "resource": "string",
  "action": "string",
  "description": "string"
}
```

### `DELETE` /api/v1/iam/permissions/{permissionId}

**Eliminar un permiso**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `permissionId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/iam/roles

**Crear un nuevo rol**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `description` | string | no |


```json
{
  "name": "string",
  "description": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `description` | string | no |
| `isActive` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "name": "string",
  "description": "string",
  "isActive": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/iam/roles

**Listar todos los roles**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Respuesta `200`:**

Array de [`RoleResource`](#modelo-roleresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `description` | string | no |
| `isActive` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "id": 1,
    "name": "string",
    "description": "string",
    "isActive": true,
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/iam/roles/{roleId}

**Obtener un rol por id**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `roleId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `description` | string | no |
| `isActive` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "name": "string",
  "description": "string",
  "isActive": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/iam/roles/{roleId}

**Actualizar un rol**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `roleId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `description` | string | no |


```json
{
  "name": "string",
  "description": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `description` | string | no |
| `isActive` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "name": "string",
  "description": "string",
  "isActive": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `DELETE` /api/v1/iam/roles/{roleId}

**Eliminar un rol**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `roleId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/iam/roles/{roleId}/permissions

**Asignar un permiso a un rol**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `roleId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `permissionId` | integer (int64) | sí |


```json
{
  "permissionId": 1
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/iam/roles/{roleId}/permissions

**Listar los permisos asignados a un rol**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `roleId` (integer (int64))

**Respuesta `200`:**

Array de [`PermissionResource`](#modelo-permissionresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `resource` | string | no |
| `action` | string | no |
| `description` | string | no |


```json
[
  {
    "id": 1,
    "name": "string",
    "resource": "string",
    "action": "string",
    "description": "string"
  }
]
```

### `DELETE` /api/v1/iam/roles/{roleId}/permissions/{permissionId}

**Quitar un permiso de un rol**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `roleId` (integer (int64)), `permissionId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/iam/users

**Registrar un nuevo usuario**

- **Auth:** 🌐 Público

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `password` | string | sí |
| `roleName` | string | no |


```json
{
  "email": "string",
  "password": "string",
  "roleName": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |
| `lastLoginAt` | date-time | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "email": "string",
  "role": "string",
  "isActive": true,
  "lastLoginAt": "2026-07-03T14:00:00Z",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/iam/users

**Listar todos los usuarios (admin)**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Respuesta `200`:**

Array de [`UserResource`](#modelo-userresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |
| `lastLoginAt` | date-time | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "id": 1,
    "email": "string",
    "role": "string",
    "isActive": true,
    "lastLoginAt": "2026-07-03T14:00:00Z",
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/iam/users/{userId}

**Obtener usuario por id**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |
| `lastLoginAt` | date-time | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "email": "string",
  "role": "string",
  "isActive": true,
  "lastLoginAt": "2026-07-03T14:00:00Z",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/iam/users/{userId}

**Actualizar email o contraseña del usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | no |
| `newPassword` | string | no |


```json
{
  "email": "string",
  "newPassword": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |
| `lastLoginAt` | date-time | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "email": "string",
  "role": "string",
  "isActive": true,
  "lastLoginAt": "2026-07-03T14:00:00Z",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `POST` /api/v1/iam/users/{userId}/favorites

**Agregar una zona a favoritos**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | sí |


```json
{
  "zoneId": 1
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/iam/users/{userId}/favorites

**Listar zonas favoritas del usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Respuesta `200`:**

Array de [`FavoriteResource`](#modelo-favoriteresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `savedAt` | date-time | no |


```json
[
  {
    "userId": 1,
    "zoneId": 1,
    "savedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `DELETE` /api/v1/iam/users/{userId}/favorites/{zoneId}

**Eliminar una zona de favoritos**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64)), `zoneId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `PUT` /api/v1/iam/users/{userId}/password

**Cambiar contraseña verificando la actual**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `currentPassword` | string | sí |
| `newPassword` | string | sí |


```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/iam/users/{userId}/preferences

**Obtener preferencias del usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `darkMode` | boolean | no |
| `language` | string | no |
| `alertFreeSpace` | boolean | no |
| `alertSaturated` | boolean | no |
| `alertCameraFailure` | boolean | no |
| `alertRadiusM` | integer (int32) | no |
| `updatedAt` | date-time | no |


```json
{
  "userId": 1,
  "darkMode": true,
  "language": "string",
  "alertFreeSpace": true,
  "alertSaturated": true,
  "alertCameraFailure": true,
  "alertRadiusM": 1,
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/iam/users/{userId}/preferences

**Actualizar preferencias del usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `darkMode` | boolean | no |
| `language` | string | sí |
| `alertFreeSpace` | boolean | no |
| `alertSaturated` | boolean | no |
| `alertCameraFailure` | boolean | no |
| `alertRadiusM` | integer (int32) | no |


```json
{
  "darkMode": true,
  "language": "string",
  "alertFreeSpace": true,
  "alertSaturated": true,
  "alertCameraFailure": true,
  "alertRadiusM": 1
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `darkMode` | boolean | no |
| `language` | string | no |
| `alertFreeSpace` | boolean | no |
| `alertSaturated` | boolean | no |
| `alertCameraFailure` | boolean | no |
| `alertRadiusM` | integer (int32) | no |
| `updatedAt` | date-time | no |


```json
{
  "userId": 1,
  "darkMode": true,
  "language": "string",
  "alertFreeSpace": true,
  "alertSaturated": true,
  "alertCameraFailure": true,
  "alertRadiusM": 1,
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/iam/users/{userId}/profile

**Obtener perfil del usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `firstName` | string | no |
| `lastName` | string | no |
| `phone` | string | no |
| `isActive` | boolean | no |
| `avatarUrl` | string | no |
| `bio` | string | no |
| `updatedAt` | date-time | no |


```json
{
  "userId": 1,
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "isActive": true,
  "avatarUrl": "string",
  "bio": "string",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/iam/users/{userId}/profile

**Actualizar perfil del usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `firstName` | string | no |
| `lastName` | string | no |
| `phone` | string | no |
| `avatarUrl` | string | no |
| `bio` | string | no |


```json
{
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "avatarUrl": "string",
  "bio": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `firstName` | string | no |
| `lastName` | string | no |
| `phone` | string | no |
| `isActive` | boolean | no |
| `avatarUrl` | string | no |
| `bio` | string | no |
| `updatedAt` | date-time | no |


```json
{
  "userId": 1,
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "isActive": true,
  "avatarUrl": "string",
  "bio": "string",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `POST` /api/v1/iam/users/{userId}/ratings

**Calificar una zona**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | sí |
| `stars` | integer (int32) | sí |
| `comment` | string | no |
| `type` | string | no |


```json
{
  "zoneId": 1,
  "stars": 1,
  "comment": "string",
  "type": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `stars` | integer (int32) | no |
| `comment` | string | no |
| `type` | string | no |
| `isReviewed` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "userId": 1,
  "zoneId": 1,
  "stars": 1,
  "comment": "string",
  "type": "string",
  "isReviewed": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/iam/users/{userId}/ratings

**Listar calificaciones del usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Respuesta `200`:**

Array de [`RatingResource`](#modelo-ratingresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `stars` | integer (int32) | no |
| `comment` | string | no |
| `type` | string | no |
| `isReviewed` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "userId": 1,
    "zoneId": 1,
    "stars": 1,
    "comment": "string",
    "type": "string",
    "isReviewed": true,
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `PUT` /api/v1/iam/users/{userId}/ratings/{zoneId}

**Actualizar calificación de una zona**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64)), `zoneId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `stars` | integer (int32) | sí |
| `comment` | string | no |
| `type` | string | no |


```json
{
  "stars": 1,
  "comment": "string",
  "type": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `stars` | integer (int32) | no |
| `comment` | string | no |
| `type` | string | no |
| `isReviewed` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "userId": 1,
  "zoneId": 1,
  "stars": 1,
  "comment": "string",
  "type": "string",
  "isReviewed": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `DELETE` /api/v1/iam/users/{userId}/ratings/{zoneId}

**Eliminar calificación de una zona**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64)), `zoneId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `PUT` /api/v1/iam/users/{userId}/role

**Cambiar rol de un usuario (admin)**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `roleName` | string | sí |


```json
{
  "roleName": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |
| `lastLoginAt` | date-time | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "email": "string",
  "role": "string",
  "isActive": true,
  "lastLoginAt": "2026-07-03T14:00:00Z",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/iam/users/{userId}/status

**Activar/desactivar usuario (admin)**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `userId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `active` | boolean | sí |


```json
{
  "active": true
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |
| `lastLoginAt` | date-time | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "email": "string",
  "role": "string",
  "isActive": true,
  "lastLoginAt": "2026-07-03T14:00:00Z",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### Modelos

<a name="modelo-addfavoriterequest"></a>
**`AddFavoriteRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | sí |


<a name="modelo-apikeyresource"></a>
**`ApiKeyResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `keyId` | string | no |
| `name` | string | no |
| `nodeId` | integer (int64) | no |
| `active` | boolean | no |
| `expiresAt` | date-time | no |
| `lastUsedAt` | date-time | no |
| `createdAt` | date-time | no |


<a name="modelo-assignpermissionrequest"></a>
**`AssignPermissionRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `permissionId` | integer (int64) | sí |


<a name="modelo-authenticationresource"></a>
**`AuthenticationResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `token` | string | no |
| `tokenType` | string | no |
| `userId` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |


<a name="modelo-changepasswordrequest"></a>
**`ChangePasswordRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `currentPassword` | string | sí |
| `newPassword` | string | sí |


<a name="modelo-changeuserrolerequest"></a>
**`ChangeUserRoleRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `roleName` | string | sí |


<a name="modelo-createapikeyrequest"></a>
**`CreateApiKeyRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `nodeId` | integer (int64) | no |
| `expiresAt` | date-time | no |


<a name="modelo-createpermissionrequest"></a>
**`CreatePermissionRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `resource` | string | sí |
| `action` | string | sí |
| `description` | string | no |


<a name="modelo-createratingrequest"></a>
**`CreateRatingRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | sí |
| `stars` | integer (int32) | sí |
| `comment` | string | no |
| `type` | string | no |


<a name="modelo-createrolerequest"></a>
**`CreateRoleRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `description` | string | no |


<a name="modelo-createdapikeyresource"></a>
**`CreatedApiKeyResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `apiKey` | string | no |
| `metadata` | [`ApiKeyResource`](#modelo-apikeyresource) | no |


<a name="modelo-favoriteresource"></a>
**`FavoriteResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `savedAt` | date-time | no |


<a name="modelo-forgotpasswordrequest"></a>
**`ForgotPasswordRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |


<a name="modelo-messageresource"></a>
**`MessageResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `message` | string | no |


<a name="modelo-permissionresource"></a>
**`PermissionResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `resource` | string | no |
| `action` | string | no |
| `description` | string | no |


<a name="modelo-ratingresource"></a>
**`RatingResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `stars` | integer (int32) | no |
| `comment` | string | no |
| `type` | string | no |
| `isReviewed` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


<a name="modelo-resetpasswordrequest"></a>
**`ResetPasswordRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `otp` | string | sí |
| `newPassword` | string | sí |


<a name="modelo-roleresource"></a>
**`RoleResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `description` | string | no |
| `isActive` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


<a name="modelo-signinrequest"></a>
**`SignInRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `password` | string | sí |


<a name="modelo-signuprequest"></a>
**`SignUpRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `password` | string | sí |
| `roleName` | string | no |


<a name="modelo-toggleuserstatusrequest"></a>
**`ToggleUserStatusRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `active` | boolean | sí |


<a name="modelo-updatepermissionrequest"></a>
**`UpdatePermissionRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `resource` | string | sí |
| `action` | string | sí |
| `description` | string | no |


<a name="modelo-updateratingrequest"></a>
**`UpdateRatingRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `stars` | integer (int32) | sí |
| `comment` | string | no |
| `type` | string | no |


<a name="modelo-updaterolerequest"></a>
**`UpdateRoleRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `description` | string | no |


<a name="modelo-updateuserpreferencesrequest"></a>
**`UpdateUserPreferencesRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `darkMode` | boolean | no |
| `language` | string | sí |
| `alertFreeSpace` | boolean | no |
| `alertSaturated` | boolean | no |
| `alertCameraFailure` | boolean | no |
| `alertRadiusM` | integer (int32) | no |


<a name="modelo-updateuserprofilerequest"></a>
**`UpdateUserProfileRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `firstName` | string | no |
| `lastName` | string | no |
| `phone` | string | no |
| `avatarUrl` | string | no |
| `bio` | string | no |


<a name="modelo-updateuserrequest"></a>
**`UpdateUserRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | no |
| `newPassword` | string | no |


<a name="modelo-userpreferencesresource"></a>
**`UserPreferencesResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `darkMode` | boolean | no |
| `language` | string | no |
| `alertFreeSpace` | boolean | no |
| `alertSaturated` | boolean | no |
| `alertCameraFailure` | boolean | no |
| `alertRadiusM` | integer (int32) | no |
| `updatedAt` | date-time | no |


<a name="modelo-userprofileresource"></a>
**`UserProfileResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `firstName` | string | no |
| `lastName` | string | no |
| `phone` | string | no |
| `isActive` | boolean | no |
| `avatarUrl` | string | no |
| `bio` | string | no |
| `updatedAt` | date-time | no |


<a name="modelo-userresource"></a>
**`UserResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `email` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |
| `lastLoginAt` | date-time | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


<a name="modelo-verifyotprequest"></a>
**`VerifyOtpRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `email` | string | sí |
| `otp` | string | sí |


---

<a name="svc-parking"></a>

## Parking — Estacionamientos

Catálogo de zonas y espacios, y sus reseñas.

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/parking/spaces` | JWT | Registrar un nuevo espacio de estacionamiento |
| `GET` | `/api/v1/parking/spaces` | JWT | Listar espacios de una zona |
| `GET` | `/api/v1/parking/spaces/{spaceId}` | JWT | Obtener un espacio del catálogo por su id |
| `DELETE` | `/api/v1/parking/spaces/{spaceId}` | JWT | Eliminar un espacio de estacionamiento |
| `POST` | `/api/v1/parking/zones` | ADMIN · OPERATOR | Crear una nueva zona de estacionamiento |
| `GET` | `/api/v1/parking/zones` | JWT | Listar todas las zonas |
| `GET` | `/api/v1/parking/zones/{zoneId}` | JWT | Obtener una zona por su id |
| `PUT` | `/api/v1/parking/zones/{zoneId}` | ADMIN · OPERATOR | Actualizar los datos de una zona |
| `DELETE` | `/api/v1/parking/zones/{zoneId}` | ADMIN · OPERATOR | Eliminar una zona |
| `GET` | `/api/v1/parking/zones/{zoneId}/ratings` | JWT | Listar reseñas públicas de una zona |

### `POST` /api/v1/parking/spaces

**Registrar un nuevo espacio de estacionamiento**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | sí |
| `spaceNumber` | string | sí |


```json
{
  "zoneId": 1,
  "spaceNumber": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `spaceNumber` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "zoneId": 1,
  "spaceNumber": "string",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/parking/spaces

**Listar espacios de una zona**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Query params:** `zoneId` (integer (int64))

**Respuesta `200`:**

Array de [`ParkingSpaceResource`](#modelo-parkingspaceresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `spaceNumber` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "id": 1,
    "zoneId": 1,
    "spaceNumber": "string",
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/parking/spaces/{spaceId}

**Obtener un espacio del catálogo por su id**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `spaceId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `spaceNumber` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "zoneId": 1,
  "spaceNumber": "string",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `DELETE` /api/v1/parking/spaces/{spaceId}

**Eliminar un espacio de estacionamiento**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `spaceId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/parking/zones

**Crear una nueva zona de estacionamiento**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `street` | string | sí |
| `district` | string | sí |
| `city` | string | sí |
| `latitude` | number (double) | sí |
| `longitude` | number (double) | sí |
| `totalSpaces` | integer (int32) | sí |
| `totalCapacity` | integer (int32) | sí |


```json
{
  "name": "string",
  "street": "string",
  "district": "string",
  "city": "string",
  "latitude": 0.75,
  "longitude": 0.75,
  "totalSpaces": 1,
  "totalCapacity": 1
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `street` | string | no |
| `district` | string | no |
| `city` | string | no |
| `latitude` | number (double) | no |
| `longitude` | number (double) | no |
| `totalSpaces` | integer (int32) | no |
| `totalCapacity` | integer (int32) | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "name": "string",
  "street": "string",
  "district": "string",
  "city": "string",
  "latitude": 0.75,
  "longitude": 0.75,
  "totalSpaces": 1,
  "totalCapacity": 1,
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/parking/zones

**Listar todas las zonas**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Respuesta `200`:**

Array de [`ZoneResource`](#modelo-zoneresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `street` | string | no |
| `district` | string | no |
| `city` | string | no |
| `latitude` | number (double) | no |
| `longitude` | number (double) | no |
| `totalSpaces` | integer (int32) | no |
| `totalCapacity` | integer (int32) | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "id": 1,
    "name": "string",
    "street": "string",
    "district": "string",
    "city": "string",
    "latitude": 0.75,
    "longitude": 0.75,
    "totalSpaces": 1,
    "totalCapacity": 1,
    "active": true,
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/parking/zones/{zoneId}

**Obtener una zona por su id**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `zoneId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `street` | string | no |
| `district` | string | no |
| `city` | string | no |
| `latitude` | number (double) | no |
| `longitude` | number (double) | no |
| `totalSpaces` | integer (int32) | no |
| `totalCapacity` | integer (int32) | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "name": "string",
  "street": "string",
  "district": "string",
  "city": "string",
  "latitude": 0.75,
  "longitude": 0.75,
  "totalSpaces": 1,
  "totalCapacity": 1,
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/parking/zones/{zoneId}

**Actualizar los datos de una zona**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `zoneId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `street` | string | sí |
| `district` | string | sí |
| `city` | string | sí |
| `latitude` | number (double) | sí |
| `longitude` | number (double) | sí |
| `totalSpaces` | integer (int32) | sí |
| `totalCapacity` | integer (int32) | sí |


```json
{
  "name": "string",
  "street": "string",
  "district": "string",
  "city": "string",
  "latitude": 0.75,
  "longitude": 0.75,
  "totalSpaces": 1,
  "totalCapacity": 1
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `street` | string | no |
| `district` | string | no |
| `city` | string | no |
| `latitude` | number (double) | no |
| `longitude` | number (double) | no |
| `totalSpaces` | integer (int32) | no |
| `totalCapacity` | integer (int32) | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "name": "string",
  "street": "string",
  "district": "string",
  "city": "string",
  "latitude": 0.75,
  "longitude": 0.75,
  "totalSpaces": 1,
  "totalCapacity": 1,
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `DELETE` /api/v1/parking/zones/{zoneId}

**Eliminar una zona**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `zoneId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/parking/zones/{zoneId}/ratings

**Listar reseñas públicas de una zona**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `zoneId` (integer (int64))

**Respuesta `200`:**

Array de [`ZoneRatingResource`](#modelo-zoneratingresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `userDisplayName` | string | no |
| `stars` | integer (int32) | no |
| `comment` | string | no |
| `type` | string | no |
| `createdAt` | date-time | no |


```json
[
  {
    "userId": 1,
    "userDisplayName": "string",
    "stars": 1,
    "comment": "string",
    "type": "string",
    "createdAt": "2026-07-03T14:00:00Z"
  }
]
```

### Modelos

<a name="modelo-createparkingspacerequest"></a>
**`CreateParkingSpaceRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | sí |
| `spaceNumber` | string | sí |


<a name="modelo-createzonerequest"></a>
**`CreateZoneRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `street` | string | sí |
| `district` | string | sí |
| `city` | string | sí |
| `latitude` | number (double) | sí |
| `longitude` | number (double) | sí |
| `totalSpaces` | integer (int32) | sí |
| `totalCapacity` | integer (int32) | sí |


<a name="modelo-parkingspaceresource"></a>
**`ParkingSpaceResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `spaceNumber` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


<a name="modelo-updatezonerequest"></a>
**`UpdateZoneRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | sí |
| `street` | string | sí |
| `district` | string | sí |
| `city` | string | sí |
| `latitude` | number (double) | sí |
| `longitude` | number (double) | sí |
| `totalSpaces` | integer (int32) | sí |
| `totalCapacity` | integer (int32) | sí |


<a name="modelo-zoneratingresource"></a>
**`ZoneRatingResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | no |
| `userDisplayName` | string | no |
| `stars` | integer (int32) | no |
| `comment` | string | no |
| `type` | string | no |
| `createdAt` | date-time | no |


<a name="modelo-zoneresource"></a>
**`ZoneResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `name` | string | no |
| `street` | string | no |
| `district` | string | no |
| `city` | string | no |
| `latitude` | number (double) | no |
| `longitude` | number (double) | no |
| `totalSpaces` | integer (int32) | no |
| `totalCapacity` | integer (int32) | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


---

<a name="svc-occupancy"></a>

## Vision / Occupancy — Ocupación

Cámaras, nodos Fog, ROI de espacios, disponibilidad e historial de ocupación.

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/occupancy/cameras` | ADMIN · OPERATOR | Registrar una cámara y asignarla a una zona |
| `GET` | `/api/v1/occupancy/cameras` | ADMIN · OPERATOR | Listar cámaras (todas o filtradas por zona) |
| `GET` | `/api/v1/occupancy/cameras/{cameraId}` | ADMIN · OPERATOR | Obtener una cámara por su id |
| `PUT` | `/api/v1/occupancy/cameras/{cameraId}` | ADMIN · OPERATOR | Actualizar una cámara (reasignar zona, datos o habilitación) |
| `DELETE` | `/api/v1/occupancy/cameras/{cameraId}` | ADMIN · OPERATOR | Eliminar una cámara |
| `GET` | `/api/v1/occupancy/cameras/{cameraId}/config` | FOG · ADMIN · OPERATOR | Descargar la configuración de una cámara (zona + espacios del Cloud) |
| `POST` | `/api/v1/occupancy/cameras/{cameraId}/events` | API-Key FOG | Registrar en bloque el estado de todos los espacios observados por una cámara |
| `POST` | `/api/v1/occupancy/events` | API-Key FOG | Registrar un evento de ocupación reportado por un nodo Fog |
| `POST` | `/api/v1/occupancy/nodes` | ADMIN · OPERATOR | Registrar un nodo Fog |
| `GET` | `/api/v1/occupancy/nodes` | ADMIN · OPERATOR | Listar nodos Fog |
| `GET` | `/api/v1/occupancy/nodes/{nodeId}` | ADMIN · OPERATOR | Obtener un nodo por su id |
| `PUT` | `/api/v1/occupancy/nodes/{nodeId}` | ADMIN · OPERATOR | Actualizar un nodo Fog |
| `DELETE` | `/api/v1/occupancy/nodes/{nodeId}` | ADMIN · OPERATOR | Eliminar un nodo Fog |
| `GET` | `/api/v1/occupancy/nodes/{nodeId}/config` | FOG · ADMIN · OPERATOR | Descargar la configuración completa de un nodo (cámaras + zonas + espacios + ROI) |
| `GET` | `/api/v1/occupancy/spaces/{parkingSpaceId}` | ADMIN · OPERATOR | Obtener el espacio monitoreado (ROI + estado) de un espacio del catálogo |
| `DELETE` | `/api/v1/occupancy/spaces/{parkingSpaceId}` | ADMIN · OPERATOR | Dejar de monitorear un espacio (elimina su ROI y estado) |
| `PUT` | `/api/v1/occupancy/spaces/{parkingSpaceId}/roi` | ADMIN · OPERATOR | Crear o reemplazar el ROI de un espacio del catálogo |
| `GET` | `/api/v1/occupancy/zones/availability` | JWT | Disponibilidad viva de todas las zonas con espacios monitoreados |
| `GET` | `/api/v1/occupancy/zones/{zoneId}/availability` | JWT | Disponibilidad viva de una zona |
| `GET` | `/api/v1/occupancy/zones/{zoneId}/occupancy/history` | ADMIN · OPERATOR | Historial de ocupación de una zona en un rango de tiempo |

### `POST` /api/v1/occupancy/cameras

**Registrar una cámara y asignarla a una zona**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `code` | string | sí |
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | sí |
| `name` | string | no |
| `location` | string | no |


```json
{
  "code": "string",
  "nodeId": 1,
  "zoneId": 1,
  "name": "string",
  "location": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "code": "string",
  "nodeId": 1,
  "zoneId": 1,
  "name": "string",
  "location": "string",
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/occupancy/cameras

**Listar cámaras (todas o filtradas por zona)**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Query params:** `zoneId` (integer (int64), opcional)

**Respuesta `200`:**

Array de [`CameraResource`](#modelo-cameraresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "id": 1,
    "code": "string",
    "nodeId": 1,
    "zoneId": 1,
    "name": "string",
    "location": "string",
    "active": true,
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/occupancy/cameras/{cameraId}

**Obtener una cámara por su id**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `cameraId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "code": "string",
  "nodeId": 1,
  "zoneId": 1,
  "name": "string",
  "location": "string",
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/occupancy/cameras/{cameraId}

**Actualizar una cámara (reasignar zona, datos o habilitación)**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `cameraId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | sí |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | sí |


```json
{
  "nodeId": 1,
  "zoneId": 1,
  "name": "string",
  "location": "string",
  "active": true
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "code": "string",
  "nodeId": 1,
  "zoneId": 1,
  "name": "string",
  "location": "string",
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `DELETE` /api/v1/occupancy/cameras/{cameraId}

**Eliminar una cámara**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `cameraId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/occupancy/cameras/{cameraId}/config

**Descargar la configuración de una cámara (zona + espacios del Cloud)**

- **Auth:** 🔒 JWT · roles: **FOG · ADMIN · OPERATOR**
- **Path params:** `cameraId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `cameraId` | integer (int64) | no |
| `code` | string | no |
| `zoneId` | integer (int64) | no |
| `active` | boolean | no |
| `spaces` | Array&lt;[`SpaceConfig`](#modelo-spaceconfig)&gt; | no |


```json
{
  "cameraId": 1,
  "code": "string",
  "zoneId": 1,
  "active": true,
  "spaces": [
    {
      "parkingSpaceId": 1,
      "spaceNumber": "string",
      "occupied": true,
      "roi": [
        "..."
      ]
    }
  ]
}
```

### `POST` /api/v1/occupancy/cameras/{cameraId}/events

**Registrar en bloque el estado de todos los espacios observados por una cámara**

- **Auth:** 🔑 API-Key `X-API-Key` (rol FOG — nodos Fog)
- **Path params:** `cameraId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `occurredAt` | date-time | sí |
| `detections` | Array&lt;[`SpotDetection`](#modelo-spotdetection)&gt; | sí |


```json
{
  "occurredAt": "2026-07-03T14:00:00Z",
  "detections": [
    {
      "parkingSpotId": 1,
      "status": "AVAILABLE"
    }
  ]
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/occupancy/events

**Registrar un evento de ocupación reportado por un nodo Fog**

- **Auth:** 🔑 API-Key `X-API-Key` (rol FOG — nodos Fog)

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `parkingSpotId` | integer (int64) | sí |
| `status` | enum (AVAILABLE · OCCUPIED) | sí |
| `occurredAt` | date-time | sí |


```json
{
  "parkingSpotId": 1,
  "status": "AVAILABLE",
  "occurredAt": "2026-07-03T14:00:00Z"
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/occupancy/nodes

**Registrar un nodo Fog**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `code` | string | sí |
| `name` | string | no |
| `location` | string | no |


```json
{
  "code": "string",
  "name": "string",
  "location": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "code": "string",
  "name": "string",
  "location": "string",
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/occupancy/nodes

**Listar nodos Fog**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**

**Respuesta `200`:**

Array de [`NodeResource`](#modelo-noderesource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "id": 1,
    "code": "string",
    "name": "string",
    "location": "string",
    "active": true,
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/occupancy/nodes/{nodeId}

**Obtener un nodo por su id**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `nodeId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "code": "string",
  "name": "string",
  "location": "string",
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `PUT` /api/v1/occupancy/nodes/{nodeId}

**Actualizar un nodo Fog**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `nodeId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | sí |


```json
{
  "name": "string",
  "location": "string",
  "active": true
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "code": "string",
  "name": "string",
  "location": "string",
  "active": true,
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `DELETE` /api/v1/occupancy/nodes/{nodeId}

**Eliminar un nodo Fog**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `nodeId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/occupancy/nodes/{nodeId}/config

**Descargar la configuración completa de un nodo (cámaras + zonas + espacios + ROI)**

- **Auth:** 🔒 JWT · roles: **FOG · ADMIN · OPERATOR**
- **Path params:** `nodeId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `nodeId` | integer (int64) | no |
| `code` | string | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `cameras` | Array&lt;[`CameraConfigResource`](#modelo-cameraconfigresource)&gt; | no |


```json
{
  "nodeId": 1,
  "code": "string",
  "name": "string",
  "location": "string",
  "active": true,
  "cameras": [
    {
      "cameraId": 1,
      "code": "string",
      "zoneId": 1,
      "active": true,
      "spaces": [
        "..."
      ]
    }
  ]
}
```

### `GET` /api/v1/occupancy/spaces/{parkingSpaceId}

**Obtener el espacio monitoreado (ROI + estado) de un espacio del catálogo**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `parkingSpaceId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `parkingSpaceId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `spaceNumber` | string | no |
| `occupied` | boolean | no |
| `roi` | Array&lt;[`PointResource`](#modelo-pointresource)&gt; | no |


```json
{
  "parkingSpaceId": 1,
  "zoneId": 1,
  "spaceNumber": "string",
  "occupied": true,
  "roi": [
    {
      "x": 0.75,
      "y": 0.75
    }
  ]
}
```

### `DELETE` /api/v1/occupancy/spaces/{parkingSpaceId}

**Dejar de monitorear un espacio (elimina su ROI y estado)**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `parkingSpaceId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `PUT` /api/v1/occupancy/spaces/{parkingSpaceId}/roi

**Crear o reemplazar el ROI de un espacio del catálogo**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `parkingSpaceId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `roi` | Array&lt;[`PointResource`](#modelo-pointresource)&gt; | sí |


```json
{
  "roi": [
    {
      "x": 0.75,
      "y": 0.75
    }
  ]
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `parkingSpaceId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `spaceNumber` | string | no |
| `occupied` | boolean | no |
| `roi` | Array&lt;[`PointResource`](#modelo-pointresource)&gt; | no |


```json
{
  "parkingSpaceId": 1,
  "zoneId": 1,
  "spaceNumber": "string",
  "occupied": true,
  "roi": [
    {
      "x": 0.75,
      "y": 0.75
    }
  ]
}
```

### `GET` /api/v1/occupancy/zones/availability

**Disponibilidad viva de todas las zonas con espacios monitoreados**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Respuesta `200`:**

Array de [`ZoneAvailabilityResource`](#modelo-zoneavailabilityresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | no |
| `total` | integer (int32) | no |
| `occupied` | integer (int32) | no |
| `available` | integer (int32) | no |
| `occupancyPercentage` | number (double) | no |
| `classification` | string | no |
| `spaces` | Array&lt;[`SpaceAvailabilityResource`](#modelo-spaceavailabilityresource)&gt; | no |


```json
[
  {
    "zoneId": 1,
    "total": 1,
    "occupied": 1,
    "available": 1,
    "occupancyPercentage": 0.75,
    "classification": "string",
    "spaces": [
      {
        "parkingSpaceId": 1,
        "spaceNumber": "string",
        "occupied": true
      }
    ]
  }
]
```

### `GET` /api/v1/occupancy/zones/{zoneId}/availability

**Disponibilidad viva de una zona**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `zoneId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | no |
| `total` | integer (int32) | no |
| `occupied` | integer (int32) | no |
| `available` | integer (int32) | no |
| `occupancyPercentage` | number (double) | no |
| `classification` | string | no |
| `spaces` | Array&lt;[`SpaceAvailabilityResource`](#modelo-spaceavailabilityresource)&gt; | no |


```json
{
  "zoneId": 1,
  "total": 1,
  "occupied": 1,
  "available": 1,
  "occupancyPercentage": 0.75,
  "classification": "string",
  "spaces": [
    {
      "parkingSpaceId": 1,
      "spaceNumber": "string",
      "occupied": true
    }
  ]
}
```

### `GET` /api/v1/occupancy/zones/{zoneId}/occupancy/history

**Historial de ocupación de una zona en un rango de tiempo**

- **Auth:** 🔒 JWT · roles: **ADMIN · OPERATOR**
- **Path params:** `zoneId` (integer (int64))
- **Query params:** `from` (string, opcional), `to` (string, opcional)

**Respuesta `200`:**

Array de [`ZoneOccupancyHistoryPointResource`](#modelo-zoneoccupancyhistorypointresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `occupiedSpots` | integer (int32) | no |
| `totalSpots` | integer (int32) | no |
| `freeSpots` | integer (int32) | no |
| `occurredAt` | date-time | no |


```json
[
  {
    "occupiedSpots": 1,
    "totalSpots": 1,
    "freeSpots": 1,
    "occurredAt": "2026-07-03T14:00:00Z"
  }
]
```

### Modelos

<a name="modelo-cameraconfigresource"></a>
**`CameraConfigResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `cameraId` | integer (int64) | no |
| `code` | string | no |
| `zoneId` | integer (int64) | no |
| `active` | boolean | no |
| `spaces` | Array&lt;[`SpaceConfig`](#modelo-spaceconfig)&gt; | no |


<a name="modelo-cameraresource"></a>
**`CameraResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


<a name="modelo-monitoredspaceresource"></a>
**`MonitoredSpaceResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `parkingSpaceId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `spaceNumber` | string | no |
| `occupied` | boolean | no |
| `roi` | Array&lt;[`PointResource`](#modelo-pointresource)&gt; | no |


<a name="modelo-nodeconfigresource"></a>
**`NodeConfigResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `nodeId` | integer (int64) | no |
| `code` | string | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `cameras` | Array&lt;[`CameraConfigResource`](#modelo-cameraconfigresource)&gt; | no |


<a name="modelo-noderesource"></a>
**`NodeResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `code` | string | no |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


<a name="modelo-recordcameraoccupancyeventsrequest"></a>
**`RecordCameraOccupancyEventsRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `occurredAt` | date-time | sí |
| `detections` | Array&lt;[`SpotDetection`](#modelo-spotdetection)&gt; | sí |


<a name="modelo-recordoccupancyeventrequest"></a>
**`RecordOccupancyEventRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `parkingSpotId` | integer (int64) | sí |
| `status` | enum (AVAILABLE · OCCUPIED) | sí |
| `occurredAt` | date-time | sí |


<a name="modelo-registercamerarequest"></a>
**`RegisterCameraRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `code` | string | sí |
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | sí |
| `name` | string | no |
| `location` | string | no |


<a name="modelo-registernoderequest"></a>
**`RegisterNodeRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `code` | string | sí |
| `name` | string | no |
| `location` | string | no |


<a name="modelo-updatecamerarequest"></a>
**`UpdateCameraRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `nodeId` | integer (int64) | no |
| `zoneId` | integer (int64) | sí |
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | sí |


<a name="modelo-updatenoderequest"></a>
**`UpdateNodeRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `name` | string | no |
| `location` | string | no |
| `active` | boolean | sí |


<a name="modelo-updatespaceroirequest"></a>
**`UpdateSpaceRoiRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `roi` | Array&lt;[`PointResource`](#modelo-pointresource)&gt; | sí |


<a name="modelo-zoneavailabilityresource"></a>
**`ZoneAvailabilityResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | no |
| `total` | integer (int32) | no |
| `occupied` | integer (int32) | no |
| `available` | integer (int32) | no |
| `occupancyPercentage` | number (double) | no |
| `classification` | string | no |
| `spaces` | Array&lt;[`SpaceAvailabilityResource`](#modelo-spaceavailabilityresource)&gt; | no |


<a name="modelo-zoneoccupancyhistorypointresource"></a>
**`ZoneOccupancyHistoryPointResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `occupiedSpots` | integer (int32) | no |
| `totalSpots` | integer (int32) | no |
| `freeSpots` | integer (int32) | no |
| `occurredAt` | date-time | no |


---

<a name="svc-prediction"></a>

## Prediction — Predicciones IA

Pronósticos de ocupación futura por zona y por espacio.

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/prediction/forecasts` | ADMIN | Upsert a forecast |
| `GET` | `/api/v1/prediction/forecasts/spots/{spotId}` | ADMIN · USER | List all forecasts for a parking spot |
| `GET` | `/api/v1/prediction/forecasts/spots/{spotId}/current` | ADMIN · USER | Get the current forecast for a parking spot |
| `GET` | `/api/v1/prediction/zones/{zoneId}/forecast/comparison` | ADMIN · USER | Get the prediction-vs-reality comparison for a zone |
| `POST` | `/api/v1/prediction/zones/{zoneId}/forecasts` | ADMIN | Upsert a zone forecast |

### `POST` /api/v1/prediction/forecasts

**Upsert a forecast**

- **Auth:** 🔒 JWT · roles: **ADMIN**

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `parkingSpotId` | integer (int64) | sí |
| `dayOfWeek` | string | sí |
| `startMinuteOfDay` | integer (int32) | sí |
| `windowSizeMinutes` | integer (int32) | sí |
| `availabilityProbability` | number (double) | sí |
| `modelVersion` | string | sí |


```json
{
  "parkingSpotId": 1,
  "dayOfWeek": "string",
  "startMinuteOfDay": 1,
  "windowSizeMinutes": 1,
  "availabilityProbability": 0.75,
  "modelVersion": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `parkingSpotId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `availabilityProbability` | number (double) | no |
| `modelVersion` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "parkingSpotId": 1,
  "dayOfWeek": "string",
  "startMinuteOfDay": 1,
  "windowSizeMinutes": 1,
  "availabilityProbability": 0.75,
  "modelVersion": "string",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/prediction/forecasts/spots/{spotId}

**List all forecasts for a parking spot**

- **Auth:** 🔒 JWT · roles: **ADMIN · USER**
- **Path params:** `spotId` (integer (int64))

**Respuesta `200`:**

Array de [`OccupancyForecastResource`](#modelo-occupancyforecastresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `parkingSpotId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `availabilityProbability` | number (double) | no |
| `modelVersion` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
[
  {
    "id": 1,
    "parkingSpotId": 1,
    "dayOfWeek": "string",
    "startMinuteOfDay": 1,
    "windowSizeMinutes": 1,
    "availabilityProbability": 0.75,
    "modelVersion": "string",
    "createdAt": "2026-07-03T14:00:00Z",
    "updatedAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/prediction/forecasts/spots/{spotId}/current

**Get the current forecast for a parking spot**

- **Auth:** 🔒 JWT · roles: **ADMIN · USER**
- **Path params:** `spotId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `parkingSpotId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `availabilityProbability` | number (double) | no |
| `modelVersion` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "parkingSpotId": 1,
  "dayOfWeek": "string",
  "startMinuteOfDay": 1,
  "windowSizeMinutes": 1,
  "availabilityProbability": 0.75,
  "modelVersion": "string",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/prediction/zones/{zoneId}/forecast/comparison

**Get the prediction-vs-reality comparison for a zone**

- **Auth:** 🔒 JWT · roles: **ADMIN · USER**
- **Path params:** `zoneId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `predicted` | [`PredictedSide`](#modelo-predictedside) | no |
| `actual` | [`ActualSide`](#modelo-actualside) | no |
| `delta` | [`Delta`](#modelo-delta) | no |


```json
{
  "zoneId": 1,
  "dayOfWeek": "string",
  "startMinuteOfDay": 1,
  "windowSizeMinutes": 1,
  "predicted": {
    "availabilityProbability": 0.75,
    "totalSpots": 1,
    "availableSpots": 1,
    "occupiedSpots": 1,
    "modelVersion": "string"
  },
  "actual": {
    "totalSpots": 1,
    "availableSpots": 1,
    "occupiedSpots": 1,
    "occurredAt": "2026-07-03T14:00:00Z"
  },
  "delta": {
    "availableDiff": 1,
    "occupiedDiff": 1
  }
}
```

### `POST` /api/v1/prediction/zones/{zoneId}/forecasts

**Upsert a zone forecast**

- **Auth:** 🔒 JWT · roles: **ADMIN**
- **Path params:** `zoneId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `dayOfWeek` | string | sí |
| `startMinuteOfDay` | integer (int32) | sí |
| `windowSizeMinutes` | integer (int32) | sí |
| `availabilityProbability` | number (double) | sí |
| `totalSpots` | integer (int32) | sí |
| `modelVersion` | string | sí |


```json
{
  "dayOfWeek": "string",
  "startMinuteOfDay": 1,
  "windowSizeMinutes": 1,
  "availabilityProbability": 0.75,
  "totalSpots": 1,
  "modelVersion": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `availabilityProbability` | number (double) | no |
| `totalSpots` | integer (int32) | no |
| `predictedAvailableSpots` | integer (int32) | no |
| `predictedOccupiedSpots` | integer (int32) | no |
| `modelVersion` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


```json
{
  "id": 1,
  "zoneId": 1,
  "dayOfWeek": "string",
  "startMinuteOfDay": 1,
  "windowSizeMinutes": 1,
  "availabilityProbability": 0.75,
  "totalSpots": 1,
  "predictedAvailableSpots": 1,
  "predictedOccupiedSpots": 1,
  "modelVersion": "string",
  "createdAt": "2026-07-03T14:00:00Z",
  "updatedAt": "2026-07-03T14:00:00Z"
}
```

### Modelos

<a name="modelo-occupancyforecastresource"></a>
**`OccupancyForecastResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `parkingSpotId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `availabilityProbability` | number (double) | no |
| `modelVersion` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


<a name="modelo-upsertforecastrequest"></a>
**`UpsertForecastRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `parkingSpotId` | integer (int64) | sí |
| `dayOfWeek` | string | sí |
| `startMinuteOfDay` | integer (int32) | sí |
| `windowSizeMinutes` | integer (int32) | sí |
| `availabilityProbability` | number (double) | sí |
| `modelVersion` | string | sí |


<a name="modelo-upsertzoneforecastrequest"></a>
**`UpsertZoneForecastRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `dayOfWeek` | string | sí |
| `startMinuteOfDay` | integer (int32) | sí |
| `windowSizeMinutes` | integer (int32) | sí |
| `availabilityProbability` | number (double) | sí |
| `totalSpots` | integer (int32) | sí |
| `modelVersion` | string | sí |


<a name="modelo-zoneforecastcomparisonresource"></a>
**`ZoneForecastComparisonResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `zoneId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `predicted` | [`PredictedSide`](#modelo-predictedside) | no |
| `actual` | [`ActualSide`](#modelo-actualside) | no |
| `delta` | [`Delta`](#modelo-delta) | no |


<a name="modelo-zoneoccupancyforecastresource"></a>
**`ZoneOccupancyForecastResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `dayOfWeek` | string | no |
| `startMinuteOfDay` | integer (int32) | no |
| `windowSizeMinutes` | integer (int32) | no |
| `availabilityProbability` | number (double) | no |
| `totalSpots` | integer (int32) | no |
| `predictedAvailableSpots` | integer (int32) | no |
| `predictedOccupiedSpots` | integer (int32) | no |
| `modelVersion` | string | no |
| `createdAt` | date-time | no |
| `updatedAt` | date-time | no |


---

<a name="svc-notifications"></a>

## Notifications — Notificaciones

Historial de notificaciones al usuario y alertas de cámara.

### Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/notifications` | JWT | Enviar una notificación a un usuario |
| `GET` | `/api/v1/notifications` | JWT | Listar notificaciones de un usuario |
| `POST` | `/api/v1/notifications/camera-alerts` | JWT | Registrar una nueva alerta de cámara |
| `GET` | `/api/v1/notifications/camera-alerts` | JWT | Listar todas las alertas de cámara |
| `GET` | `/api/v1/notifications/camera-alerts/{alertId}` | JWT | Obtener una alerta de cámara por su id |
| `PATCH` | `/api/v1/notifications/camera-alerts/{alertId}/acknowledge` | JWT | Reconocer una alerta de cámara |
| `POST` | `/api/v1/notifications/camera-alerts/{alertId}/notifications` | JWT | Enviar notificación de alerta a un administrador |
| `GET` | `/api/v1/notifications/camera-alerts/{alertId}/notifications` | JWT | Listar notificaciones enviadas para una alerta |
| `PATCH` | `/api/v1/notifications/camera-alerts/{alertId}/resolve` | JWT | Resolver una alerta de cámara |
| `GET` | `/api/v1/notifications/unread` | JWT | Listar notificaciones no leídas de un usuario |
| `DELETE` | `/api/v1/notifications/{notificationId}` | JWT | Eliminar una notificación |
| `PATCH` | `/api/v1/notifications/{notificationId}/read` | JWT | Marcar una notificación como leída |

### `POST` /api/v1/notifications

**Enviar una notificación a un usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | sí |
| `zoneId` | integer (int64) | no |
| `type` | enum (AVAILABILITY · PREDICTION · SYSTEM · ALERT) | sí |
| `message` | string | sí |


```json
{
  "userId": 1,
  "zoneId": 1,
  "type": "AVAILABILITY",
  "message": "string"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `type` | string | no |
| `message` | string | no |
| `isRead` | boolean | no |
| `sentAt` | date-time | no |
| `createdAt` | date-time | no |


```json
{
  "id": 1,
  "userId": 1,
  "zoneId": 1,
  "type": "string",
  "message": "string",
  "isRead": true,
  "sentAt": "2026-07-03T14:00:00Z",
  "createdAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/notifications

**Listar notificaciones de un usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Query params:** `userId` (integer (int64))

**Respuesta `200`:**

Array de [`NotificationResource`](#modelo-notificationresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `type` | string | no |
| `message` | string | no |
| `isRead` | boolean | no |
| `sentAt` | date-time | no |
| `createdAt` | date-time | no |


```json
[
  {
    "id": 1,
    "userId": 1,
    "zoneId": 1,
    "type": "string",
    "message": "string",
    "isRead": true,
    "sentAt": "2026-07-03T14:00:00Z",
    "createdAt": "2026-07-03T14:00:00Z"
  }
]
```

### `POST` /api/v1/notifications/camera-alerts

**Registrar una nueva alerta de cámara**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `cameraId` | integer (int64) | sí |
| `zoneId` | integer (int64) | sí |
| `alertType` | enum (CAMERA_OFFLINE · OBSTRUCTION_DETECTED · UNAUTHORIZED_VEHICLE · SYSTEM_ERROR) | sí |
| `severity` | enum (LOW · MEDIUM · HIGH · CRITICAL) | sí |


```json
{
  "cameraId": 1,
  "zoneId": 1,
  "alertType": "CAMERA_OFFLINE",
  "severity": "LOW"
}
```

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `cameraId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `alertType` | string | no |
| `severity` | string | no |
| `detectedAt` | date-time | no |
| `lastFrameAt` | date-time | no |
| `secondAlertSentAt` | date-time | no |
| `acknowledgedBy` | integer (int64) | no |
| `acknowledgedAt` | date-time | no |
| `resolvedAt` | date-time | no |
| `resolutionNote` | string | no |
| `createdAt` | date-time | no |


```json
{
  "id": 1,
  "cameraId": 1,
  "zoneId": 1,
  "alertType": "string",
  "severity": "string",
  "detectedAt": "2026-07-03T14:00:00Z",
  "lastFrameAt": "2026-07-03T14:00:00Z",
  "secondAlertSentAt": "2026-07-03T14:00:00Z",
  "acknowledgedBy": 1,
  "acknowledgedAt": "2026-07-03T14:00:00Z",
  "resolvedAt": "2026-07-03T14:00:00Z",
  "resolutionNote": "string",
  "createdAt": "2026-07-03T14:00:00Z"
}
```

### `GET` /api/v1/notifications/camera-alerts

**Listar todas las alertas de cámara**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)

**Respuesta `200`:**

Array de [`CameraAlertResource`](#modelo-cameraalertresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `cameraId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `alertType` | string | no |
| `severity` | string | no |
| `detectedAt` | date-time | no |
| `lastFrameAt` | date-time | no |
| `secondAlertSentAt` | date-time | no |
| `acknowledgedBy` | integer (int64) | no |
| `acknowledgedAt` | date-time | no |
| `resolvedAt` | date-time | no |
| `resolutionNote` | string | no |
| `createdAt` | date-time | no |


```json
[
  {
    "id": 1,
    "cameraId": 1,
    "zoneId": 1,
    "alertType": "string",
    "severity": "string",
    "detectedAt": "2026-07-03T14:00:00Z",
    "lastFrameAt": "2026-07-03T14:00:00Z",
    "secondAlertSentAt": "2026-07-03T14:00:00Z",
    "acknowledgedBy": 1,
    "acknowledgedAt": "2026-07-03T14:00:00Z",
    "resolvedAt": "2026-07-03T14:00:00Z",
    "resolutionNote": "string",
    "createdAt": "2026-07-03T14:00:00Z"
  }
]
```

### `GET` /api/v1/notifications/camera-alerts/{alertId}

**Obtener una alerta de cámara por su id**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `alertId` (integer (int64))

**Respuesta `200`:**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `cameraId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `alertType` | string | no |
| `severity` | string | no |
| `detectedAt` | date-time | no |
| `lastFrameAt` | date-time | no |
| `secondAlertSentAt` | date-time | no |
| `acknowledgedBy` | integer (int64) | no |
| `acknowledgedAt` | date-time | no |
| `resolvedAt` | date-time | no |
| `resolutionNote` | string | no |
| `createdAt` | date-time | no |


```json
{
  "id": 1,
  "cameraId": 1,
  "zoneId": 1,
  "alertType": "string",
  "severity": "string",
  "detectedAt": "2026-07-03T14:00:00Z",
  "lastFrameAt": "2026-07-03T14:00:00Z",
  "secondAlertSentAt": "2026-07-03T14:00:00Z",
  "acknowledgedBy": 1,
  "acknowledgedAt": "2026-07-03T14:00:00Z",
  "resolvedAt": "2026-07-03T14:00:00Z",
  "resolutionNote": "string",
  "createdAt": "2026-07-03T14:00:00Z"
}
```

### `PATCH` /api/v1/notifications/camera-alerts/{alertId}/acknowledge

**Reconocer una alerta de cámara**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `alertId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `acknowledgedBy` | integer (int64) | sí |


```json
{
  "acknowledgedBy": 1
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `POST` /api/v1/notifications/camera-alerts/{alertId}/notifications

**Enviar notificación de alerta a un administrador**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `alertId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | sí |


```json
{
  "userId": 1
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/notifications/camera-alerts/{alertId}/notifications

**Listar notificaciones enviadas para una alerta**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `alertId` (integer (int64))

**Respuesta `200`:**

Array de [`CameraAlertNotificationResource`](#modelo-cameraalertnotificationresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `alertId` | integer (int64) | no |
| `userId` | integer (int64) | no |
| `sentAt` | date-time | no |
| `isRead` | boolean | no |
| `createdAt` | date-time | no |


```json
[
  {
    "id": 1,
    "alertId": 1,
    "userId": 1,
    "sentAt": "2026-07-03T14:00:00Z",
    "isRead": true,
    "createdAt": "2026-07-03T14:00:00Z"
  }
]
```

### `PATCH` /api/v1/notifications/camera-alerts/{alertId}/resolve

**Resolver una alerta de cámara**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `alertId` (integer (int64))

**Request body:**

| Campo | Tipo | Requerido |
|---|---|---|
| `resolutionNote` | string | sí |


```json
{
  "resolutionNote": "string"
}
```

**Respuesta `200`:**

_(sin cuerpo)_

### `GET` /api/v1/notifications/unread

**Listar notificaciones no leídas de un usuario**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Query params:** `userId` (integer (int64))

**Respuesta `200`:**

Array de [`NotificationResource`](#modelo-notificationresource).

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `type` | string | no |
| `message` | string | no |
| `isRead` | boolean | no |
| `sentAt` | date-time | no |
| `createdAt` | date-time | no |


```json
[
  {
    "id": 1,
    "userId": 1,
    "zoneId": 1,
    "type": "string",
    "message": "string",
    "isRead": true,
    "sentAt": "2026-07-03T14:00:00Z",
    "createdAt": "2026-07-03T14:00:00Z"
  }
]
```

### `DELETE` /api/v1/notifications/{notificationId}

**Eliminar una notificación**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `notificationId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### `PATCH` /api/v1/notifications/{notificationId}/read

**Marcar una notificación como leída**

- **Auth:** 🔒 JWT (cualquier usuario autenticado)
- **Path params:** `notificationId` (integer (int64))

**Respuesta `200`:**

_(sin cuerpo)_

### Modelos

<a name="modelo-acknowledgecameraalertrequest"></a>
**`AcknowledgeCameraAlertRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `acknowledgedBy` | integer (int64) | sí |


<a name="modelo-cameraalertnotificationresource"></a>
**`CameraAlertNotificationResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `alertId` | integer (int64) | no |
| `userId` | integer (int64) | no |
| `sentAt` | date-time | no |
| `isRead` | boolean | no |
| `createdAt` | date-time | no |


<a name="modelo-cameraalertresource"></a>
**`CameraAlertResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `cameraId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `alertType` | string | no |
| `severity` | string | no |
| `detectedAt` | date-time | no |
| `lastFrameAt` | date-time | no |
| `secondAlertSentAt` | date-time | no |
| `acknowledgedBy` | integer (int64) | no |
| `acknowledgedAt` | date-time | no |
| `resolvedAt` | date-time | no |
| `resolutionNote` | string | no |
| `createdAt` | date-time | no |


<a name="modelo-createcameraalertrequest"></a>
**`CreateCameraAlertRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `cameraId` | integer (int64) | sí |
| `zoneId` | integer (int64) | sí |
| `alertType` | enum (CAMERA_OFFLINE · OBSTRUCTION_DETECTED · UNAUTHORIZED_VEHICLE · SYSTEM_ERROR) | sí |
| `severity` | enum (LOW · MEDIUM · HIGH · CRITICAL) | sí |


<a name="modelo-notificationresource"></a>
**`NotificationResource`**

| Campo | Tipo | Requerido |
|---|---|---|
| `id` | integer (int64) | no |
| `userId` | integer (int64) | no |
| `zoneId` | integer (int64) | no |
| `type` | string | no |
| `message` | string | no |
| `isRead` | boolean | no |
| `sentAt` | date-time | no |
| `createdAt` | date-time | no |


<a name="modelo-resolvecameraalertrequest"></a>
**`ResolveCameraAlertRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `resolutionNote` | string | sí |


<a name="modelo-sendcameraalertnotificationrequest"></a>
**`SendCameraAlertNotificationRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | sí |


<a name="modelo-sendnotificationrequest"></a>
**`SendNotificationRequest`**

| Campo | Tipo | Requerido |
|---|---|---|
| `userId` | integer (int64) | sí |
| `zoneId` | integer (int64) | no |
| `type` | enum (AVAILABILITY · PREDICTION · SYSTEM · ALERT) | sí |
| `message` | string | sí |

