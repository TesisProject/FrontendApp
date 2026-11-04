# API iteración 2 — Slice A: cuenta y privacidad (HU-02, 03, 04, 05, 28, 30)

Cambios de `cloud-service` en la rama `iter2/A` y cómo los usa el frontend. Rutas relativas a
`/api/v1`. Para integrar en `API-Frontend.md` en la fase 3.

## 1. Resumen

| Método y ruta | Rol | Cambio |
|---|---|---|
| `POST /iam/users` | **ADMIN** (antes público) | Alta con rol. 400 `INVALID_ARGUMENT` si el rol no existe (antes caía en USER) |
| `POST /iam/auth/sign-up` | público | Sin cambio de ruta: siempre crea USER. Contraseña con política nueva |
| `POST /iam/auth/forgot-password` | público | **Siempre `202`** con el mismo mensaje, exista o no el correo |
| `POST /iam/auth/verify-otp` | público | `OTP_EXPIRED` separado de `INVALID_OTP`; 5 intentos por código; rate limit |
| `POST /iam/auth/reset-password` | público | Igual que verify-otp; además cierra todas las sesiones del usuario |
| `PUT /iam/users/{id}/profile` | dueño o ADMIN | Validación por campo; `avatarUrl` del cuerpo se ignora |
| `POST /iam/users/{id}/avatar` | dueño o ADMIN | **Nuevo.** Sube la foto a R2 |
| `DELETE /iam/users/{id}/avatar` | dueño o ADMIN | **Nuevo.** Quita la foto |
| `GET /iam/users/{id}/favorites` | dueño o ADMIN | Cada favorito trae `zoneName`, `classification`, `available`, `total` |
| `POST /iam/users/{id}/favorites` | dueño o ADMIN | **`201`** con el favorito enriquecido (antes `204`); 404 si la zona no existe |
| favorites / ratings / preferences `/{id}/...` | dueño o ADMIN | Antes cualquier usuario autenticado; ahora 403 `ACCESS_DENIED` si no es el dueño |
| `GET /notifications?userId`, `/notifications/unread?userId` | dueño o ADMIN | ídem |
| `PATCH /notifications/{id}/read`, `DELETE /notifications/{id}` | dueño o ADMIN | 403 si la notificación es de otro |
| `POST /notifications` | **ADMIN** | Antes cualquier autenticado |

`POST /iam/auth/sign-out` (fundaciones) lo usa ahora el frontend al cerrar sesión.

## 2. Política de contraseña (HU-02)

Aplica en `sign-up`, `POST /users`, `reset-password` (`newPassword`), `PUT /users/{id}/password`
(`newPassword`) y `PUT /users/{id}` (`newPassword`, opcional):

| Requisito | Regla |
|---|---|
| Largo | ≥ 8 caracteres |
| Mayúscula / minúscula | al menos una de cada (`Ñ`, `á` cuentan como letra) |
| Número | al menos un dígito |
| Símbolo | al menos un carácter que no sea letra, dígito ni espacio |

Error: `400 VALIDATION_ERROR`, `message: "password: falta: una letra mayúscula, un símbolo"`.
El FE replica la regla en `iam/domain/password-policy.ts` (checklist en vivo).

Correo duplicado: `409 USER_ALREADY_EXISTS`, `message: "The email is already in use"` (ya no repite
el correo). FE: "Este correo ya está en uso. Inicia sesión o recupera tu contraseña."

## 3. Recuperación con código (HU-03)

```
POST /iam/auth/forgot-password {email}
→ 202 {"message":"If the email is registered, a verification code has been sent"}
```

| Status | `error` | Cuándo | FE |
|---|---|---|---|
| 400 | `INVALID_OTP` | El código no coincide y quedan intentos | "El código no es correcto…" |
| 400 | `OTP_EXPIRED` | Vencido (>15 min), ya usado, invalidado al 5.º fallo o correo desconocido | Mensaje + botón "Solicitar un código nuevo" |
| 400 | `VALIDATION_ERROR` | `otp` que no son 5 dígitos; contraseña débil | — |
| 429 | `TOO_MANY_REQUESTS` | > 10 peticiones por IP en 15 min, compartido entre `verify-otp` y `reset-password` (`message` "…Try again in 15 minutes.") | "Demasiados intentos…" |

- Los fallos cuentan entre `verify-otp` y `reset-password`. El contador vuelve a 0 con cada código nuevo.
- `reset-password` correcto invalida todos los JWT anteriores del usuario (`revokeAllTokens`).
- FE: correo y código viajan entre `/forgot-password → /otp → /reset-password` por
  `sessionStorage` (`iam/infrastructure/recovery-session.ts`), **nunca en la URL**.

## 4. Perfil y foto (HU-04)

`PUT /iam/users/{id}/profile` `{firstName, lastName, phone, bio}`:

| Campo | Regla | Mensaje |
|---|---|---|
| `firstName`, `lastName` | 2–100 caracteres (null permitido) | "debe tener entre 2 y 100 caracteres" |
| `phone` | `^\+?\d{6,15}$` (null permitido) | "debe tener de 6 a 15 dígitos, con + opcional" |
| `bio` | ≤ 500 | "debe tener como máximo 500 caracteres" |

Error: `400 VALIDATION_ERROR` con `message` `"campo: motivo, campo: motivo"`; el FE lo separa por
campo con `shared/helpers/api-errors.ts#validationFieldErrors`.

`POST /iam/users/{id}/avatar` — `multipart/form-data`, parte `file`:

| Respuesta | Cuándo |
|---|---|
| `200 UserProfileResource` | OK; `avatarUrl` = URL presignada (1 h, `storage.r2.avatar-presign-ttl-seconds`) |
| `400 INVALID_AVATAR` | Vacía, > 2 MB o no es JPEG/PNG/WebP (por firma, no por Content-Type) |
| `413 FILE_TOO_LARGE` | > 5 MB (límite de multipart) |
| `503 AVATAR_STORAGE_UNAVAILABLE` | R2 sin configurar o caído; el perfil no cambia |

Clave en R2: `users/{id}/avatar.{jpg|png|webp}`; subir otro formato borra el anterior.
`DELETE /iam/users/{id}/avatar` → `200` con `avatarUrl: null`.
`avatarUrl` en `GET profile`: presignada si hay foto subida; si no, la URL externa heredada o null.

## 5. Favoritos (HU-28)

```json
{ "userId": 3, "zoneId": 7, "savedAt": "2026-11-04T10:00:00",
  "zoneName": "Sótano A", "classification": "MODERADO", "available": 4, "total": 12 }
```

- Orden: más recientes primero. `classification` usa el mismo cálculo que la disponibilidad
  (`LIBRE | MODERADO | OCUPADO | SIN_DATOS` tras la slice C).
- Zona borrada del catálogo: `zoneName`, `classification`, `available`, `total` en `null`.
- `POST` → `201` + `Location`; `404 ZONE_NOT_FOUND`; `409 FAVORITE_ALREADY_EXISTS`.

## 6. Privacidad

Regla en favorites, ratings, preferences, profile, avatar y notifications por usuario:
`#userId.toString() == authentication.name or hasRole('ADMIN')`. Por id de notificación:
`@notificationAccess.canAccess(#notificationId, authentication)` (una inexistente sigue dando su 404).
Violación → `403 ACCESS_DENIED` (`ApiError`).

## 7. Frontend

| HU | Dónde |
|---|---|
| 02 | `RegisterView.vue` + `PasswordChecklist.vue`: checklist en vivo, envío bloqueado, toast "Cuenta creada" |
| 03 | `ForgotPasswordView` (valida email), `OtpView`/`ResetPasswordView` ("Solicitar un código nuevo"), `recovery-session.ts` |
| 04 | `ProfileView.vue` + `profile/domain/profile-form.ts`: zod por campo, foto a R2, "¿Descartar cambios?" (`onBeforeRouteLeave`) |
| 05 | `auth.store.logout()` → `sign-out` + `resetStores` (todos menos auth/theme); `authGuard` y `sessionGuard` global validan `exp`; recarga en bfcache |
| 28 | `useFavoriteToggle` + `RemoveFavoriteDialog` en Favoritos, Zonas y Detalle; toasts |
| 30 | `profile.store.applyAccountTheme` al iniciar sesión/reabrir; `saveDarkMode` guarda al instante, localStorage solo caché |

## 8. Migraciones

| Versión | Contenido |
|---|---|
| `V21__intentos_codigo_recuperacion.sql` | `iam_user.otp_failed_attempts integer not null default 0` |
| `V22__foto_de_perfil_en_r2.sql` | `user_profile.avatar_key varchar(200)` |

Variable opcional nueva: `storage.r2.avatar-presign-ttl-seconds` (default 3600).
