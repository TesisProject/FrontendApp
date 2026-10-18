# Plan — Configuración de dispositivos en el panel admin (cámaras, redes WiFi, firmware OTA, API keys)

**Fecha:** 2026-10-12 · **Estado:** aprobado (D1-D13), implementándose en `feat/device-config` · **Backend:** `cloud-service` rama `dev`
(commit `6c2df0b`, ya implementado y con tests en verde) · **Pantallas:** `/admin/cameras`,
`/admin/nodes`, `/admin/firmware` (nueva), `/admin/api-keys`

> **Revisión 2026-10-18: las redes WiFi se retiraron.** La nube dejó de gestionar la WiFi
> (`cloud-service` `2d9d0ff`, revisión 3 de `delegacion-cambios-2026-10-11.md`): la WiFi de cada placa
> se graba por USB y nunca viaja por red. En el panel se borraron el diálogo «Redes WiFi» de Nodos, el
> selector de red de Cámaras, la columna «Red WiFi» y el paso «Quitar red y mover» al cambiar de nodo
> (`moveToNode`). Las secciones de WiFi de abajo (R3, §1.1, §2.3, D4 y los mensajes `WIFI_*`) se
> conservan como registro del diseño descartado; lo que digan de WiFi ya no describe el código.

La nube pasa a ser la dueña de la configuración de las ESP32-CAM (MAC, rotación, red WiFi, captura,
alta y firmware). Este documento dice qué tiene que hacer el frontend para administrarla y cómo se
arreglan las dos roturas que provoca el backend nuevo. Todo el contrato se ha comprobado leyendo el
código Java; cuando algo difiere del resumen de partida, se cita `fichero:línea`.

Fuentes: `cloud-service/docs/plan-firmware-ota.md` (§14 decisiones, §15 implementado),
`delegacion-cambios-2026-10-11.md`, los controllers de `occupancy/interfaces/rest` e
`iam/interfaces/rest/ApiKeyController.java`.

---

## 0. Resumen

| # | Qué | Prioridad |
|---|---|---|
| R1 | **Rotura:** `POST /cameras` sin `mac` → `400` (`admin-api.ts:60`). El alta de cámaras deja de funcionar al desplegar C4 | Bloqueante |
| R2 | **Rotura:** key `FOG` sin `nodeId` → `400 API_KEY_NODE_REQUIRED`. El formulario lo trata como opcional | Bloqueante |
| R3 | **Rotura latente** (no estaba en el encargo): borrar un nodo con redes WiFi → `409 NODE_HAS_WIFI_NETWORKS`, y `AdminNodesView.handleDelete` ignora el fallo (cierra el diálogo sin decir nada) | Alta |
| 1 | Cámaras: MAC, rotación, red WiFi, captura, reiniciar alta, firmware | Alta |
| 2 | Nodos: CRUD de redes WiFi por nodo | Alta (las cámaras las necesitan) |
| 3 | Firmware: subir `.bin` y listar versiones (pantalla nueva) | Media (el OTA no llega a las placas hasta E5) |
| 4 | API keys: rol `FOG`/`PREDICTION` y `nodeId` obligatorio en `FOG` | Bloqueante (= R2) |

**Contexto que condiciona la UX** (corregido el 2026-10-12 al aprobar el plan). El Fog **ya tiene**
F4 (sincronización completa, rotación incluida), F5 (alta de un solo uso), F6 (`/camera/config`) y
F2 (caché de firmware), en `fog-application` rama `develop`. Lo pendiente es el **firmware de la
ESP32**: E6 (aprovisionamiento USB), E7 (alta por MAC), E8 (leer la configuración del Fog) y E5
(cliente OTA). Por tanto:

- Lo configurado aquí **se aplica en la Pi en su siguiente sincronización** (p. ej. la rotación,
  que el Fog aplica antes de YOLO: cambiarla afecta a la detección en cuanto sincroniza).
- **Llegará a las placas cuando salga el firmware nuevo** (red WiFi, captura, OTA).
- "Reiniciar alta" y "cambiar MAC" tienen efecto **real e inmediato** en el Fog: revoca la credencial
  de la placa, y una placa con el firmware actual (credencial compilada, sin alta por MAC) se queda
  con `401` hasta reflashearla por USB.

**Decisiones aprobadas** por el dueño: todas las recomendaciones D1-D13 de §7. D1 explícito: el
panel `/admin` sigue siendo **solo ADMIN**.

---

## 1. Pantallas y flujos

### 1.0 Roles: lo que permite el backend y lo que ve hoy el panel

El panel `/admin` **solo admite ADMIN**: `adminGuard` (`src/app/iam/infrastructure/admin.guard.ts`)
exige `claims.role === ADMIN` y `auth.store.adminLogin` rechaza cualquier otro rol con "Acceso no
autorizado". Un OPERATOR hoy **no entra** al panel, aunque el backend le permita casi todo.

| Acción | Backend (`@PreAuthorize`) | En el panel |
|---|---|---|
| Cámaras: CRUD, `device-settings`, reiniciar alta, screenshot, `/config` | ADMIN · OPERATOR | ADMIN |
| Firmware de una cámara: ver, asignar, quitar | ADMIN · OPERATOR | ADMIN |
| Redes WiFi: listar / ver | ADMIN · OPERATOR | ADMIN |
| Redes WiFi: crear, editar, borrar | **solo ADMIN** (`WifiNetworkController.java:60,95,109`) | ADMIN |
| Firmware: listar / ver versiones | ADMIN · OPERATOR | ADMIN |
| Firmware: publicar `.bin` | **solo ADMIN** (`FirmwareReleaseController.java:51`) | ADMIN |
| API keys (todo) | **solo ADMIN** (`IamSecurityConfig.java:46`) | ADMIN |

Las pantallas se diseñan con un `canWrite` por recurso (derivado del rol del JWT) para que abrir el
panel a OPERATOR sea solo cambiar el guard; ver la decisión **D1**. En lo que sigue, "ADMIN" es quien
ve todo y "OPERATOR (futuro)" indica qué se le ocultaría.

Convenciones comunes a todas las pantallas (ya existentes en el repo):

- Contenedor `AdminPage` (título + subtítulo + slot `actions`), búsqueda `AdminSearch`, tabla
  `AdminTableCard` (prop `empty`/`emptyText`), carga y error con `AdminStateBox`
  (`tone="loading" | "error"`), errores de formulario con `FormAlert`, confirmaciones con
  `ConfirmDialog` (no se cierra solo: el padre decide; admite `error`), campos con `AdminField`
  (`label`, `optional`, `required`, `hint`), avisos de éxito con `toast` de `vue-sonner`.
- Badges `size="status"` (mono, mayúsculas) con las variantes suaves `success`, `warning`, `danger`,
  `info`, `neutral` (fondo tintado + texto oscuro: cumplen AA, decisión del design-system).
- Texto pequeño informativo con `text-muted-foreground`; nunca `--color-faint`. Naranja como texto
  solo con `--color-accent-text`.
- Datos técnicos (MAC, código, SHA-256, versiones) en `font-mono`.

### 1.1 Cámaras — `/admin/cameras` (cambia)

**Muestra.** La tabla actual más las columnas de dispositivo. La red WiFi se muestra por SSID (se
resuelve con las redes del nodo de cada cámara, ver store en §3.4).

```
┌ Cámaras ─────────────────────────────────────────────────── [+ Nueva cámara] ┐
│ 3 cámaras registradas · 1 sin MAC                                            │
│ [Buscar por nombre, código o MAC...]                                         │
├──────────┬────────┬─────────┬───────────────────┬──────────────┬─────────────┤
│ Nombre   │ Zona   │ Código  │ MAC               │ Firmware     │ Estado      │ Acciones
├──────────┼────────┼─────────┼───────────────────┼──────────────┼─────────────┤
│ Entrada  │ Zona A │ CAM-001 │ 24:6F:28:AB:CD:EF │ v3 · AL DÍA  │ ACTIVA      │ [Configurar] [Eliminar]
│ Rampa    │ Zona A │ CAM-002 │ (SIN MAC)  ⚠      │ SIN GESTIONAR│ ACTIVA      │ [Configurar] [Eliminar]
│ Patio    │ Zona B │ CAM-003 │ 24:6F:28:11:22:33 │ v2→v3 PENDIENTE │ INACTIVA │ [Configurar] [Eliminar]
└──────────┴────────┴─────────┴───────────────────┴──────────────┴─────────────┘
```

- **MAC**: `font-mono`; si es `null` (cámara anterior a la MAC obligatoria, `CameraResource.java:5-6`)
  badge `warning` "Sin MAC" con tooltip "Cárgala en Configurar → Dispositivo; sin MAC el Fog no podrá
  dar de alta esta placa".
- **Firmware**: `FirmwareStatusBadge` (componente nuevo, reutilizado en §1.3). Texto:
  `v{reported}` si coincide; `v{reported}→v{target}` si difiere; "—" si no hay datos. Los datos ya
  vienen en `CameraResource` (`targetFirmwareVersion`, `reportedFirmwareVersion`, `firmwareStatus`,
  `CameraResource.java:30-33`): no hace falta un GET por cámara para la tabla.
- Se quita la columna "Ubicación" de la tabla (pasa al detalle) para que quepan MAC y firmware en
  1040 px; el buscador añade la MAC (normalizada, ver §4.1).

| Estado de firmware | Badge | Etiqueta | Ayuda (tooltip) |
|---|---|---|---|
| `NOT_MANAGED` | `neutral` | Sin gestionar | No tiene versión asignada: la nube no le ofrece actualizaciones. |
| `UNKNOWN` | `info` | Sin informe | Tiene versión asignada pero la cámara aún no ha informado la suya. |
| `UP_TO_DATE` | `success` | Al día | Informa la versión asignada. |
| `PENDING` | `warning` | Pendiente | Informa una versión menor; aún está dentro del margen para actualizarse (3 h por defecto). |
| `BEHIND` | `danger` | Atrasada | Sigue en una versión menor pasado el margen: la descarga falló o la placa volvió atrás (rollback). Revisar el log del Fog. |
| `AHEAD` | `info` | Adelantada | Informa una versión mayor que la asignada: se flasheó por USB. Asigna esa versión o una mayor. |

**Estados.** Cargando: `AdminStateBox` "Cargando cámaras...". Error: `AdminStateBox tone="error"`
"No se pudieron cargar las cámaras". Vacío: "No hay cámaras registradas" (sin filtro) o "No se
encontraron cámaras" (con filtro). Si no hay zonas, "Nueva cámara" se deshabilita con hint "Crea
primero una zona".

#### Alta — diálogo "Nueva cámara"

Un solo `POST /cameras` con todo. Las secciones de dispositivo reutilizan el componente
`CameraDeviceFields` que usa también la pestaña "Dispositivo" del detalle.

```
┌ Nueva cámara ──────────────────────────────────────────────┐
│ El código (CAM-001, CAM-002…) lo asigna el sistema.        │
│ ── General ─────────────────────────────────────────────── │
│ ZONA *          [Zona A            ▾]                      │
│ NOMBRE (opc.)   [Cámara entrada norte ]                    │
│ UBICACIÓN (opc.)[Poste central]  NODO FOG (opc.)[FOG-001 ▾]│
│ ── Dispositivo ─────────────────────────────────────────── │
│ MAC DE LA PLACA *  [24:6f:28:ab:cd:ef      ]  ⓘ           │
│   → se guardará como 24:6F:28:AB:CD:EF                     │
│   ⓘ Sale en el monitor serie al arrancar: WIFI: MAC=…      │
│ ROTACIÓN        ( 0° ) ( 90° ) ( 180° ) ( 270° )           │
│ RED WIFI (opc.) [Sin red (conserva la suya) ▾]             │
│   (deshabilitado si no hay nodo: "Elige antes un nodo")    │
│ ▸ Captura avanzada (300 s · SVGA · calidad 12)             │
│     INTERVALO (s) [300]  30–3600                           │
│     RESOLUCIÓN    [SVGA 800×600 ▾]                         │
│     CALIDAD JPEG  [12]  10–63 · menor = mejor imagen       │
│ [!] error del backend (FormAlert)                          │
│                              [Cancelar] [Crear cámara]     │
└────────────────────────────────────────────────────────────┘
```

- **MAC obligatoria** (asterisco). Vista previa normalizada debajo del campo mientras se escribe;
  error inline si no es válida (§4.1). Ayuda contextual del icono ⓘ (popover/tooltip):
  > La MAC es la de **estación (STA)** de la placa, la que imprime el firmware en el monitor serie al
  > arrancar, en la línea `WIFI: MAC=24:6F:28:AB:CD:EF`. No uses la MAC del punto de acceso (SoftAP),
  > que es distinta (suele acabar en un número más), ni la de la etiqueta del router. Abre el monitor
  > serie a 115200 baudios con DTR y RTS desactivados (con la ESP32-CAM-MB, si no, la placa se queda
  > en reset). Cada placa tiene una MAC única: no se puede repetir entre cámaras.
- **Rotación**: grupo de 4 botones (radio), no un input numérico. Hint "Grados en sentido horario
  para ver la foto derecha".
- **Red WiFi**: `NativeSelect` con las redes del nodo elegido (`GET /nodes/{id}/wifi-networks`);
  primera opción "Sin red (la cámara conserva su WiFi actual)". Sin nodo → deshabilitado. Si el nodo
  no tiene redes → opción única y enlace "Añadir redes en Nodos".
- **Captura**: plegada por defecto con los valores por defecto del backend (300 s, SVGA, 12,
  `RegisterCameraRequest.java:10`). Si no se toca, se omite `capture` y el backend aplica los
  defaults. Hint del intervalo: "Tiempo de deep sleep entre fotos. Menos segundos = más consumo de
  pilas". Hint de calidad: "10 = máxima calidad (fotos más pesadas), 63 = mínima".

#### Detalle — "Configurar" (lateral `Sheet` con pestañas)

Sustituye al botón "Editar". Cada pestaña **guarda por separado** porque son endpoints distintos
(`PUT /cameras/{id}` no lleva MAC ni captura; `PUT /cameras/{id}/device-settings` no lleva zona ni
nodo). Así no hay guardados en dos pasos que puedan fallar a medias.

```
┌ CAM-001 · Entrada ──────────────────────────────── ✕ ┐
│ [ General ] [ Dispositivo ] [ Firmware ] [ Alta ]    │
│ ──────────────────────────────────────────────────── │
│ (pestaña Dispositivo)                                │
│ MAC DE LA PLACA *  [24:6F:28:AB:CD:EF]               │
│ ⚠ Cambiar la MAC reinicia el alta: la placa anterior │
│   pierde su credencial. Hazlo solo al cambiar placa. │
│ ROTACIÓN   (0°) (90°) (●180°) (270°)                 │
│ ⚠ Esta cámara tiene 6 espacios con ROI. Cambiar la   │
│   rotación desplaza el encuadre: revisa los ROI.     │
│ RED WIFI   [ParkVisionFog1 ▾]                        │
│ CAPTURA    [300] s  [SVGA ▾]  calidad [12]           │
│ ⓘ Los cambios se aplican en la Pi en su siguiente    │
│   sincronización; llegarán a la placa cuando lleve   │
│   el firmware nuevo (lee su config cada 12 capturas).│
│                         [Descartar] [Guardar]        │
└──────────────────────────────────────────────────────┘
```

**Pestaña General** — zona, nodo, nombre, ubicación, activa → `PUT /cameras/{id}` (igual que hoy).
- Si la cámara tiene red WiFi asignada y se cambia el **nodo**, el backend responde `409
  CAMERA_WIFI_NETWORK_IN_OTHER_NODE` (`Camera.java:145-146`). La UI lo previene: al cambiar el nodo
  muestra un aviso "Esta cámara usa la red «X» del nodo actual. Para moverla se le quitará la red; la
  placa conservará la WiFi que tiene y habrá que darle la nueva por USB" y el botón pasa a "Quitar red
  y mover". El store hace `device-settings` con `wifiNetworkId: null` y luego el `PUT`. Si el segundo
  falla, el primero es inocuo (`null` = "conserva la suya"). Ver **D4**.
- Cambiar de zona una cámara con ROI ya da `409 CAMERA_HAS_MONITORED_SPACES` (mensaje existente).

**Pestaña Dispositivo** — MAC, rotación, red, captura → `PUT /cameras/{id}/device-settings`. El
endpoint **reemplaza los cuatro datos** (`CameraController.java:125`), así que el formulario se
precarga con los actuales y se envía completo.
- **MAC**: obligatoria si la cámara ya tiene una (no se puede quitar, `CAMERA_MAC_REQUIRED`). Si es
  una cámara antigua sin MAC, el campo admite vacío y muestra el aviso "Sin MAC, el Fog no podrá dar
  de alta esta placa cuando se active el alta por MAC". La primera MAC de una cámara antigua **no**
  reinicia el alta (`Camera.java:166-176`); cambiar una existente **sí** (`enrollmentGeneration + 1`).
- **Aviso de MAC** (solo si había MAC y el valor normalizado cambia): confirmación con
  `ConfirmDialog` antes de guardar:
  > Vas a cambiar la MAC de CAM-001 de `24:6F:28:AB:CD:EF` a `24:6F:28:11:22:33`. Esto **reinicia el
  > alta**: en su siguiente sincronización, el Fog revoca la credencial de la placa anterior, que dejará
  > de poder subir fotos. Hazlo solo si has sustituido la placa y la nueva lleva el firmware con alta
  > por MAC.
- **Aviso de rotación** (solo si cambia): antes de guardar, el store pide `GET /cameras/{id}/config`
  y cuenta `spaces` (los espacios con ROI de esa cámara). Si hay alguno, `ConfirmDialog`:
  > CAM-001 tiene 6 espacios con ROI dibujado sobre la foto girada 0°. Al cambiar a 90°, los polígonos
  > dejan de coincidir con lo que ve la cámara y la detección de ocupación será errónea hasta que los
  > vuelvas a dibujar en Zonas → ROI. La foto del editor se verá con el giro nuevo cuando la cámara
  > suba la siguiente foto.

  (La rotación de la screenshot viene de la **foto**, no de la cámara:
  `CameraResourceAssembler.java:106`, `latest.frame().getRotation()`. Por eso el editor de ROI sigue
  mostrando el giro anterior hasta la siguiente foto.) Se permite guardar igualmente (decisión D2 del
  backend: permitir con aviso).
- **Red WiFi**: redes del nodo **actual** de la cámara. "Sin red" envía `null` (la cámara conserva la
  suya). Sin nodo → deshabilitado con hint "Asigna un nodo en General".
- Banner informativo fijo con la propagación: "se aplica en la Pi en su siguiente sincronización;
  red y captura llegarán a la placa cuando lleve el firmware nuevo".
- MAC vacía en una cámara antigua: se envía **`null`**, no `""` (`""` pasa por `MacAddress.parse`
  y da `400 INVALID_MAC_ADDRESS`).

**Pestaña Firmware** — `GET /cameras/{id}/firmware` (trae además `targetFirmwareAssignedAt`, que no
está en `CameraResource`).

```
│ ESTADO      [PENDIENTE]  informa v2 · asignada v3     │
│ Asignada el 12/10/26 10:05 · último informe 10:35    │
│ ASIGNAR VERSIÓN [v4 — 12/10/26 · "fix wifi" ▾] [Asignar] │
│   v1, v2 aparecen deshabilitadas: "(menor que la actual)" │
│ ⓘ No se puede bajar de versión: el cliente OTA de la │
│   placa solo instala versiones mayores. Para corregir │
│   una versión mala, publica otra con número mayor.   │
│ [Quitar versión asignada]                            │
```
- El select lista las versiones de `GET /firmware-releases` (de mayor a menor). Se deshabilitan las
  menores que `max(asignada, informada)`: es exactamente la regla del backend (`Camera.java:204-209`;
  **difiere del resumen**: también cuenta la versión *informada*, no solo la asignada). Asignar la
  misma no hace nada y responde 200 (`Camera.java:210-212`): el botón se deshabilita si se elige la ya
  asignada.
- "Quitar versión asignada" → `DELETE …/firmware/target` con confirmación: "La cámara dejará de
  recibir actualizaciones. No se desinstala nada: seguirá con la versión que tenga." Útil para
  retirar una versión antes de que se instale.
- Si no hay versiones publicadas: "Aún no hay firmware publicado" + enlace a `/admin/firmware`.
- Nota fija mientras no esté E5 (ver D7): "El Fog ya descarga y guarda la versión asignada; las
  placas la instalarán cuando lleven el firmware con cliente OTA".

**Pestaña Alta** — zona de peligro, "Reiniciar alta" → `DELETE /cameras/{id}/enrollment` (204).
```
│ Generación de alta: 1                                │
│ Reiniciar el alta hace que el Fog revoque la         │
│ credencial de esta placa y vuelva a admitir su alta  │
│ por MAC. Úsalo cuando cambies la placa por otra con  │
│ la misma MAC registrada o si la credencial se perdió.│
│ ⚠ Solo si la placa ya lleva el firmware con alta por │
│   MAC. Con el firmware anterior se queda sin         │
│   credencial (401) hasta que la reflashees por USB.  │
│                         [Reiniciar alta…] (rojo)      │
```
- Confirmación reforzada: `ConfirmDialog destructive` con un `Input` en el que hay que escribir el
  código (`CAM-001`) para habilitar "Reiniciar" (necesita la prop nueva `confirmDisabled`, §3.6).
  Tras el 204 se recarga la cámara (`GET /cameras/{id}`) para mostrar la generación nueva.

**Estados del Sheet.** Cada pestaña muestra un spinner propio mientras carga lo suyo (redes,
`/config`, firmware, versiones); un fallo de carga de una pestaña no bloquea las demás
(`AdminStateBox tone="error"` dentro de la pestaña con "Reintentar").

### 1.2 Nodos — `/admin/nodes` (cambia)

**Muestra.** La tabla actual + columna "Redes WiFi" (número) + acción "Redes WiFi".

```
┌ Nodos Fog ────────────────────────────────────────────── [+ Nuevo nodo] ┐
│ Código  │ Nombre        │ Ubicación │ Redes │ Estado │ Acciones                  │
│ FOG-001 │ Nodo central  │ Caseta    │ 2     │ ACTIVO │ [Redes WiFi] [Editar] [Eliminar]
└─────────┴───────────────┴───────────┴───────┴────────┴───────────────────────────┘
```

**Diálogo "Redes WiFi de FOG-001"** (CRUD de `/nodes/{nodeId}/wifi-networks`):

```
┌ Redes WiFi · FOG-001 Nodo central ────────────────────────────┐
│ Las cámaras de este nodo se conectan a una de estas redes.    │
│ La contraseña se guarda cifrada y no se puede volver a ver.   │
│ ┌──────────────────┬──────────┬─────────────────────┬────────┐│
│ │ SSID             │ Cámaras  │ Contraseña          │        ││
│ │ ParkVisionFog1   │ 3        │ cambiada 12/10 09:40│ [Editar] [Borrar⛔]│
│ │ ParkVisionBackup │ 0        │ cambiada 01/10 18:02│ [Editar] [Borrar] │
│ └──────────────────┴──────────┴─────────────────────┴────────┘│
│ ── Nueva red ──────────────────────────────────────────────── │
│ SSID *        [                ]  12/32 bytes                 │
│ CONTRASEÑA *  [••••••••••    ] 👁  WPA2: 8–63 caracteres       │
│ [!] FormAlert                                [Añadir red]     │
└───────────────────────────────────────────────────────────────┘
```

- **Contraseña de solo escritura.** Nunca se muestra ni se precarga: no viene en ninguna respuesta
  (`WifiNetworkResource.java`). Se muestra `passwordUpdatedAt` ("cambiada el …").
- **Editar** abre el formulario en modo edición: SSID precargado; contraseña vacía con placeholder
  "Sin cambios" y hint "Déjala vacía para conservar la actual". Al enviar, vacío → `password: null`
  (**nunca `""`**: el backend la validaría como contraseña y daría `400 INVALID_WIFI_PASSWORD`,
  `WifiNetworkCommandService.java:59-60` + `WifiPassphrase`). Aviso: "Las cámaras que usan esta red
  recibirán el cambio en la siguiente sincronización. Si la contraseña es incorrecta, perderán la
  conexión y habrá que reaprovisionarlas por USB." (confirmación si `cameraCount > 0` y cambia SSID o
  contraseña).
- **Borrar**: deshabilitado si `cameraCount > 0` con tooltip "La usan N cámaras: asígnales otra red
  antes" (el backend responde 409 igualmente). Confirmación normal si no hay cámaras.
- Botón de mostrar/ocultar contraseña (`aria-pressed`), `autocomplete="new-password"`.
- **OPERATOR (futuro):** ve la lista (sin contraseñas) en solo lectura; sin formulario ni acciones.
- Estados: cargando "Cargando redes..."; error "No se pudieron cargar las redes"; vacío "Este nodo
  aún no tiene redes WiFi. Añade la del estacionamiento para poder asignarla a sus cámaras."; si el
  backend no tiene la clave de cifrado → mensaje 503 de §2.

**Eliminar nodo (R3):** si tiene redes → `409 NODE_HAS_WIFI_NETWORKS`. El `ConfirmDialog` pasa a
mostrar `:error` (como ya hace Cámaras) con "Este nodo aún tiene redes WiFi. Bórralas antes en «Redes
WiFi»". El texto actual "Las cámaras asignadas quedarán sin nodo" se mantiene.

### 1.3 Firmware — `/admin/firmware` (nueva)

Entrada nueva en `AdminLayout` entre "Nodos" y "API Keys": `{ to: '/admin/firmware', label:
'Firmware', icon: Cpu }`.

```
┌ Firmware ──────────────────────────────────────────── [⇪ Publicar versión] ┐
│ 4 versiones · placa esp32cam-aithinker · firmadas por la nube              │
├─────────┬───────────┬──────────────┬────────────────┬─────────┬───────────┤
│ Versión │ Publicada │ Tamaño       │ SHA-256        │ Cámaras │ Notas      │
├─────────┼───────────┼──────────────┼────────────────┼─────────┼───────────┤
│ v4      │ 12/10 10:05│ 1,08 MB (58 %)│ 3f9a…c21e [⧉] │ 1 asig. · 0 inst. │ fix wifi │
│ v3      │ 05/10 18:30│ 1,07 MB (57 %)│ 8b01…77aa [⧉] │ 2 asig. · 2 inst. │ —        │
└─────────┴───────────┴──────────────┴────────────────┴─────────┴───────────┘
┌ Despliegue por cámara ────────────────────────────────────────────────────┐
│ CAM-001 Entrada │ informa v3 │ asignada v4 │ [PENDIENTE] │ [Asignar v4]   │
│ CAM-002 Rampa   │ —          │ —           │ [SIN GESTIONAR] │ [Asignar v4]│
│ ⓘ Despliega primero en una cámara y, si informa la versión nueva, en las  │
│   demás. No se puede bajar de versión.                                    │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Tabla de versiones**: `GET /firmware-releases` (ya viene de mayor a menor). Tamaño en MB y % de
  la ranura OTA (1.966.080 bytes). SHA-256 abreviado (8…4) con botón copiar; `signingKeyId` en el
  tooltip. "Cámaras": cuántas la tienen **asignada** y cuántas la **informan** (calculado en cliente
  con las cámaras del store, sin endpoint nuevo). Notas truncadas con tooltip.
- **Panel "Despliegue por cámara"**: una fila por cámara con `FirmwareStatusBadge` y botón "Asignar
  v{última}" (deshabilitado si ya la tiene asignada o si informa una mayor). Es el mismo
  `PUT …/firmware/target` que la pestaña Firmware del detalle; aquí es el atajo para el despliegue
  escalonado "primero una, luego las demás" (`CameraFirmwareController.java:34`). Sin acción masiva
  (ver **D6**).
- No hay borrado de versiones (D14 del backend): no se muestra ninguna acción de borrar.
- **OPERATOR (futuro):** ve la tabla y el panel de despliegue (sí puede asignar), sin "Publicar".
- Estados: cargando "Cargando versiones..."; error "No se pudieron cargar las versiones"; vacío
  "Aún no hay versiones publicadas. Sube el `.bin` de la aplicación compilado con `arduino-cli`".

**Diálogo "Publicar versión"** (`POST /firmware-releases`, multipart):

```
┌ Publicar versión de firmware ────────────────────────────────────┐
│ ARCHIVO .BIN *   [ Elegir archivo… ]  esp32cam.ino.bin            │
│   ✓ Imagen ESP32 (0xE9) · 1.134.720 bytes (58 % de la ranura OTA) │
│   ⓘ Sube build/esp32cam.ino.bin, NO el .merged.bin ni el         │
│     .bootloader.bin.                                              │
│ VERSIÓN *        [5]   entero > 0, mayor que la v4 publicada      │
│   ⓘ Debe coincidir con FW_VERSION compilado en el firmware.      │
│ NOTAS (opc.)     [                                  ] 0/1000      │
│ ⚠ Una versión publicada no se puede borrar ni reutilizar.        │
│ ▓▓▓▓▓▓▓░░░ 70 %  (progreso de subida)                            │
│ [!] FormAlert                        [Cancelar] [Publicar v5]     │
└───────────────────────────────────────────────────────────────────┘
```

- Al elegir el archivo se valida en cliente (§4.3) **antes** de habilitar "Publicar": primer byte,
  tamaño y heurísticas de fichero equivocado. Con datos reales de `esp32cam/build/` (core 3.3.12):
  `esp32cam.ino.bin` empieza por `0xE9` y pesa 1.134.720 bytes; `esp32cam.ino.merged.bin` empieza
  por `0xFF` y pesa 4.194.304; `esp32cam.ino.bootloader.bin` **empieza por `0xE9`** (24.992 bytes),
  así que el byte mágico no basta para distinguirlo: se avisa si el nombre contiene `bootloader` o
  `partitions`, o si pesa menos de 64 KiB.
- La versión se precarga con `max(publicadas) + 1`. Si ya existe en la lista, error inline sin
  llamar al backend.
- Aviso de irreversibilidad: no hay borrado y no se puede asignar una menor, así que un número
  equivocado (p. ej. 50 en vez de 5) obliga a seguir desde 51.
- Confirmación final no necesaria (el aviso ya está en el diálogo); el botón muestra la versión
  ("Publicar v5") para que el admin vea el número antes de pulsar.

### 1.4 API Keys — `/admin/api-keys` (cambia, arregla R2)

```
┌ Nueva API key ──────────────────────────────────────┐
│ NOMBRE *      [fog-001                 ]             │
│ ROL *         (● Nodo Fog) ( Prediction engine )     │
│ NODO FOG *    [FOG-001 Nodo central ▾]               │
│   ⓘ La key solo podrá leer y escribir los datos de   │
│     este nodo (incluidas las contraseñas WiFi).      │
│ EXPIRACIÓN (opc.) [dd/mm/aaaa --:--]                 │
│                            [Cancelar] [Generar key]  │
└──────────────────────────────────────────────────────┘
```

- **Rol** nuevo: `FOG` (por defecto) o `PREDICTION` (`ApiKeyRole.java`). Se envía siempre explícito
  aunque el backend use `FOG` si falta (`CreateApiKeyCommand` compact constructor).
- **Nodo**: obligatorio con `FOG` (asterisco, sin opción "Sin nodo"); con `PREDICTION` se oculta y
  se envía sin `nodeId` (el backend respondería `400 API_KEY_NODE_NOT_ALLOWED`). Si no hay nodos y el
  rol es FOG: "Registra antes un nodo en Nodos" y botón deshabilitado.
- Tabla: columna nueva "Rol" (badge `info` "FOG" / `neutral` "PREDICTION"). Una key `FOG` activa con
  `nodeId: null` (anterior a C6; la migración V8 no debería dejar ninguna) se marca con badge
  `warning` "Sin nodo — sustituir".
- El diálogo de la key generada distingue el texto final por rol: FOG → "Configúrala en el Fog como
  `CLOUD_API_KEY` (header `X-API-Key`)"; PREDICTION → "Configúrala en el prediction-engine".
- **Revocar**: hoy ignora el fallo; pasa a mostrar `:error` en el `ConfirmDialog` como Cámaras.

### 1.5 Ayuda contextual: textos para un admin no técnico

| Dónde | Texto |
|---|---|
| MAC (alta y Dispositivo) | Ver §1.1: es la MAC de estación (STA) que imprime el monitor serie en `WIFI: MAC=…`; no la del SoftAP; formatos aceptados `aa:bb:cc:dd:ee:ff`, `AA-BB-CC-DD-EE-FF` o `aabbccddeeff`; se guarda en mayúsculas con `:`. |
| Cambiar MAC | Reinicia el alta: la placa anterior pierde su credencial. Solo al sustituir la placa. |
| Reiniciar alta | El Fog revoca la credencial de esta placa y admite una nueva alta por MAC. Solo si la placa ya lleva el firmware con alta por MAC; con el anterior se queda con 401 hasta reflashearla por USB. **Nunca antes de flashear** (fase C de la migración). |
| Rotación | Grados en sentido horario para ver la foto derecha. Con ROI dibujado, cambiarla desplaza el encuadre y hay que redibujar los ROI. |
| Red WiFi | La cámara se conectará a esta red en su siguiente lectura de configuración. "Sin red" no la desconecta: conserva la que ya tiene. Mover una cámara de nodo exige darle la WiFi nueva por USB. |
| Captura | Intervalo = tiempo dormida entre fotos (más corto = menos autonomía con pilas). Resolución mayor = más detalle y más tiempo de radio. Calidad: 10 mejor, 63 peor. |
| No se baja de versión | El cliente OTA de la placa solo instala versiones mayores que la que tiene. Si una versión sale mal, se publica otra con número mayor (puede ser el mismo código anterior recompilado con otro `FW_VERSION`). |
| Propagación | Los cambios se guardan en la nube al instante y se aplican en la Pi en su siguiente sincronización (la rotación, el alta y la versión asignada ya tienen efecto ahí). Red WiFi, captura y OTA llegarán a la placa cuando lleve el firmware nuevo, que lee su configuración cada 12 capturas (≈1 h con el intervalo de 5 min). |
| Contraseña WiFi | Se guarda cifrada y no se puede volver a ver. WPA2: 8 a 63 caracteres, o 64 dígitos hex. No se admiten redes abiertas. |

---

## 2. Contrato por endpoint (confirmado en el código)

Base: `httpClient` ya antepone `VITE_API_BASE_URL` (las rutas del repo empiezan en `/occupancy`,
`/iam`…). Todas con `Authorization: Bearer`. Formato de error `ApiError`
(`{timestamp, status, error, message, path}`); el frontend decide por `error` (código), **no** por
`message` (inglés). `400 VALIDATION_ERROR` (Bean Validation) trae en `message` `campo: motivo`.

Mensajes genéricos de respaldo (para cualquier endpoint): `401` → lo gestiona el interceptor
(redirige a `/admin`); `403` "No tienes permiso para esta acción"; `404 CAMERA_NOT_FOUND` /
`NODE_NOT_FOUND` "La cámara/el nodo ya no existe. Recarga la página"; error de red "No se pudo
conectar con el servidor"; otros "Ocurrió un error, intenta de nuevo".

### 2.1 Cámaras

**`GET /api/v1/occupancy/cameras[?zoneId=]`** — ADMIN · OPERATOR → `200 CameraResource[]`.

`CameraResource` (`CameraResource.java:17-36`):

| Campo | Tipo | Nota |
|---|---|---|
| `id`, `code`, `nodeId` (\|null), `zoneId`, `name` (\|null), `location` (\|null), `active` | | como hoy |
| `mac` | string \| null | `AA:BB:CC:DD:EE:FF`; `null` en cámaras anteriores |
| `rotation` | 0 \| 90 \| 180 \| 270 | |
| `wifiNetworkId` | int64 \| null | `null` = conserva su WiFi |
| `capture` | `{ intervalSec, framesize, jpegQuality }` | siempre presente |
| `enrollmentGeneration` | int | sube con cada reinicio de alta |
| `targetFirmwareVersion` / `reportedFirmwareVersion` | int \| null | |
| `firmwareReportedAt` | Instant (`…Z`) \| null | |
| `firmwareStatus` | `NOT_MANAGED\|UNKNOWN\|UP_TO_DATE\|PENDING\|BEHIND\|AHEAD` | |
| `createdAt`, `updatedAt` | LocalDateTime (sin zona) | ojo: no llevan `Z`, a diferencia de los `Instant` |

**`GET /api/v1/occupancy/cameras/{id}`** — igual, una cámara. `404 CAMERA_NOT_FOUND`.

**`POST /api/v1/occupancy/cameras`** — ADMIN · OPERATOR → `201 CameraResource`
(`CameraController.java:71-87`). Body `RegisterCameraRequest` (`RegisterCameraRequest.java:12-21`):

```json
{ "zoneId": 1, "nodeId": 1, "name": "Entrada", "location": "Poste central",
  "mac": "24:6F:28:AB:CD:EF", "rotation": 0, "wifiNetworkId": 3,
  "capture": { "intervalSec": 300, "framesize": "SVGA", "jpegQuality": 12 } }
```
`zoneId` y `mac` obligatorios; el resto opcional (`rotation` 0, sin red, captura 300/SVGA/12).

| Código | Cuándo | Mensaje al usuario |
|---|---|---|
| `400 VALIDATION_ERROR` | falta `zoneId`/`mac`, `mac` > 20, rangos de `capture` | "Revisa los campos marcados" (+ marcar campo por `message`) |
| `400 CAMERA_MAC_REQUIRED` | `mac` vacía | "La MAC de la placa es obligatoria" |
| `400 INVALID_MAC_ADDRESS` | formato, multicast o `00:00…` | "La MAC no es válida. Cópiala de la línea `WIFI: MAC=` del monitor serie" |
| `400 INVALID_ROTATION` | rotación ∉ {0,90,180,270} | "La rotación debe ser 0°, 90°, 180° o 270°" |
| `400 INVALID_CAPTURE_SETTINGS` | regla de dominio de captura | "Parámetros de captura fuera de rango" |
| `400 CAMERA_ZONE_NOT_FOUND` | zona inexistente | "La zona elegida ya no existe. Recarga la página" |
| `400 WIFI_NETWORK_NOT_IN_CAMERA_NODE` | red inexistente, de otro nodo o red sin nodo | "La red WiFi elegida no pertenece al nodo de la cámara" |
| `409 CAMERA_MAC_ALREADY_REGISTERED` | MAC ya usada por otra cámara | "Esa MAC ya está registrada en otra cámara. Cada placa tiene una MAC única: revisa que no la hayas copiado de otra" (si se puede, nombrar la cámara buscándola en el store) |

**`PUT /api/v1/occupancy/cameras/{id}`** — ADMIN · OPERATOR → `200 CameraResource`. Body
`UpdateCameraRequest` (`nodeId`, `zoneId`*, `name`, `location`, `active`*) — **sin cambios** de
forma; no lleva MAC.

| Código | Mensaje |
|---|---|
| `400 CAMERA_ZONE_NOT_FOUND` | como arriba |
| `409 CAMERA_HAS_MONITORED_SPACES` | "La cámara aún cubre espacios monitoreados: reasígnalos a otra cámara o quítales el ROI primero" (existente) |
| `409 CAMERA_WIFI_NETWORK_IN_OTHER_NODE` | "La cámara usa una red WiFi de su nodo actual. Quítale la red antes de cambiarla de nodo" (normalmente no se ve: la UI lo previene, §1.1) |

**`PUT /api/v1/occupancy/cameras/{id}/device-settings`** — ADMIN · OPERATOR → `200 CameraResource`
(`CameraController.java:121-135`). **Endpoint nuevo, no estaba en el resumen como tal.** Body
`UpdateCameraDeviceSettingsRequest` (`UpdateCameraDeviceSettingsRequest.java:12-17`), reemplaza todo:

```json
{ "mac": "24:6F:28:AB:CD:EF", "rotation": 90, "wifiNetworkId": null,
  "capture": { "intervalSec": 300, "framesize": "SVGA", "jpegQuality": 12 } }
```
`rotation` y `capture` obligatorios; `mac` obligatoria si la cámara ya tiene una; `wifiNetworkId`
`null` = quitar red (la placa conserva la suya). Cambiar una MAC existente → `enrollmentGeneration+1`.

| Código | Mensaje |
|---|---|
| `400 VALIDATION_ERROR` | "Revisa los campos marcados" |
| `400 CAMERA_MAC_REQUIRED` | "La MAC no se puede quitar, solo cambiar" |
| `400 INVALID_MAC_ADDRESS`, `INVALID_ROTATION`, `INVALID_CAPTURE_SETTINGS` | como en el alta |
| `400 WIFI_NETWORK_NOT_IN_CAMERA_NODE` | "La red WiFi elegida no pertenece al nodo de la cámara" |
| `409 CAMERA_MAC_ALREADY_REGISTERED` | como en el alta |

**`DELETE /api/v1/occupancy/cameras/{id}/enrollment`** — ADMIN · OPERATOR → `204`
(`CameraController.java:137-147`). Sin body. Errores: `404 CAMERA_NOT_FOUND`.

**`GET /api/v1/occupancy/cameras/{id}/config`** — ADMIN · OPERATOR (y FOG) → `200
CameraConfigResource`. El frontend solo usa `spaces.length` para el aviso de rotación.

**`DELETE /api/v1/occupancy/cameras/{id}`** y **`GET …/screenshot`** — sin cambios.

### 2.2 Firmware de una cámara

**`GET /api/v1/occupancy/cameras/{id}/firmware`** — ADMIN · OPERATOR → `200
CameraFirmwareResource` (`CameraFirmwareResource.java`): `cameraId`, `code`,
`targetFirmwareVersion`, `targetFirmwareAssignedAt`, `reportedFirmwareVersion`,
`firmwareReportedAt`, `status`.

**`PUT /api/v1/occupancy/cameras/{id}/firmware/target`** — ADMIN · OPERATOR → `200
CameraFirmwareResource` (**no** `CameraResource`: el store tiene que fusionarlo en la cámara,
`CameraFirmwareController.java:67-71`). Body `{ "version": 4 }` (`@NotNull @Positive`).

| Código | Mensaje |
|---|---|
| `400 VALIDATION_ERROR` | "Elige una versión válida" |
| `400 FIRMWARE_RELEASE_NOT_FOUND_FOR_ASSIGNMENT` | "Esa versión no está publicada. Recarga la lista de versiones" (**difiere**: es 400, no 404) |
| `409 FIRMWARE_DOWNGRADE_NOT_ALLOWED` | "No se puede bajar de versión: la cámara ya tiene asignada o instalada la v{N}. Para corregir una versión, publica otra mayor" ({N} = `max(asignada, informada)` del cliente) |

**`DELETE /api/v1/occupancy/cameras/{id}/firmware/target`** — ADMIN · OPERATOR → `204`
(`CameraFirmwareController.java:73-82`; no estaba en el resumen). `404 CAMERA_NOT_FOUND`.

`GET …/firmware/download` es para el Fog (ADMIN también puede): el frontend **no** lo usa.

### 2.3 Redes WiFi de un nodo

Base `/api/v1/occupancy/nodes/{nodeId}/wifi-networks` (`WifiNetworkController.java:49`).
`WifiNetworkResource`: `id`, `nodeId`, `ssid`, `cameraCount`, `passwordUpdatedAt` (Instant),
`createdAt`, `updatedAt`. **Nunca** la contraseña.

| Método | Ruta | Rol | Request | Respuesta |
|---|---|---|---|---|
| `GET` | `…/wifi-networks` | ADMIN · OPERATOR | — | `200 WifiNetworkResource[]` |
| `GET` | `…/wifi-networks/{networkId}` | ADMIN · OPERATOR | — | `200 WifiNetworkResource` |
| `POST` | `…/wifi-networks` | **ADMIN** | `{ ssid*, password* }` | `201 WifiNetworkResource` |
| `PUT` | `…/wifi-networks/{networkId}` | **ADMIN** | `{ ssid*, password: string \| null }` | `200 WifiNetworkResource` |
| `DELETE` | `…/wifi-networks/{networkId}` | **ADMIN** | — | `204` |

| Código | Mensaje |
|---|---|
| `400 VALIDATION_ERROR` | "Revisa el SSID y la contraseña" |
| `400 INVALID_WIFI_SSID` | "El SSID no puede estar vacío ni ocupar más de 32 bytes (las tildes y la ñ cuentan doble)" |
| `400 INVALID_WIFI_PASSWORD` | "La contraseña debe tener de 8 a 63 caracteres sin tildes ni ñ, o ser una clave de 64 dígitos hexadecimales. No se admiten redes abiertas" |
| `404 NODE_NOT_FOUND` / `WIFI_NETWORK_NOT_FOUND` | "El nodo o la red ya no existe. Recarga la página" |
| `409 WIFI_NETWORK_SSID_ALREADY_EXISTS` | "Este nodo ya tiene una red con ese SSID" |
| `409 WIFI_NETWORK_IN_USE` | "La usan cámaras de este nodo: asígnales otra red antes de borrarla" |
| `503 WIFI_SECRETS_UNAVAILABLE` | "El servidor no tiene configurada la clave de cifrado de contraseñas WiFi. Avisa al responsable del backend (WIFI_SECRETS_ENCRYPTION_KEY)" |
| `503 WIFI_SECRETS_KEY_MISMATCH` | "La contraseña guardada de esta red no se puede descifrar con la clave actual del servidor. Vuelve a escribirla" |

**`DELETE /api/v1/occupancy/nodes/{id}`** (existente) — nuevo `409 NODE_HAS_WIFI_NETWORKS`
(`NodeCommandService.java:47`): "Este nodo aún tiene redes WiFi. Bórralas antes en «Redes WiFi»".
El resto de `/nodes` no cambia (`NodeResource` no trae número de redes: la columna "Redes" sale de
pedir las redes de cada nodo, ver §3.4).

### 2.4 Versiones de firmware

Base `/api/v1/occupancy/firmware-releases` (`FirmwareReleaseController.java:41`).
`FirmwareReleaseResource`: `id`, `version`, `hardware` (`esp32cam-aithinker`), `size`, `sha256`,
`signature`, `signingKeyId`, `notes` (\|null), `createdAt` (LocalDateTime).

| Método | Ruta | Rol | Respuesta |
|---|---|---|---|
| `GET` | `/firmware-releases` | ADMIN · OPERATOR | `200 FirmwareReleaseResource[]`, de la versión más alta a la más baja |
| `GET` | `/firmware-releases/{version}` | ADMIN · OPERATOR | `200` · `404 FIRMWARE_RELEASE_NOT_FOUND` (por **versión**, no por id) |
| `POST` | `/firmware-releases` | **ADMIN** | `201 FirmwareReleaseResource` |

`POST` es `multipart/form-data`: parte `file` (el `.bin`), campos `version` (entero) y `notes`
(opcional). Orden de comprobaciones en el backend (`FirmwareReleaseCommandService.java:42-52`):
versión repetida → imagen → firma → R2.

| Código | Cuándo | Mensaje |
|---|---|---|
| `400` (sin código `ApiError`) | falta `version`/`file` o `version` no numérica: no hay handler para `MissingServletRequestParameterException` ni `MethodArgumentTypeMismatchException` y responde el error por defecto de Spring | "Falta el archivo o la versión" (la validación en cliente lo evita) |
| `400 INVALID_FIRMWARE_VERSION` | `version` ≤ 0 | "La versión debe ser un entero mayor que 0" |
| `400 INVALID_FIRMWARE_IMAGE` | vacío o primer byte ≠ `0xE9` | "El archivo no es una imagen de aplicación ESP32. Sube `esp32cam.ino.bin`, no el `.merged.bin`" |
| `400 FIRMWARE_TOO_LARGE` | > 1.966.080 bytes | "El firmware no cabe en la ranura OTA (máx. 1.966.080 bytes)" (**difiere**: es un código propio, no `INVALID_FIRMWARE_IMAGE`) |
| `400 INVALID_FIRMWARE_NOTES` | notas > 1000 | "Las notas no pueden pasar de 1000 caracteres" |
| `409 FIRMWARE_VERSION_ALREADY_EXISTS` | versión ya publicada | "La v{N} ya está publicada. Usa un número mayor" |
| `413 FILE_TOO_LARGE` | > 5 MB (`spring.servlet.multipart.max-file-size`, `application.yml:56`) | "El archivo es demasiado grande" |
| `503 FIRMWARE_SIGNING_UNAVAILABLE` | falta el par de claves de firma | "El servidor no tiene configurada la clave de firma de firmware. Avisa al responsable del backend" |
| `503 FIRMWARE_STORAGE_UNAVAILABLE` | R2 no configurado o caído | "No se pudo guardar el binario en el almacenamiento (R2). Inténtalo más tarde o avisa al responsable del backend" |

(El resumen de partida hablaba de un solo 503 "si falta la clave de firma o R2": son **dos códigos**.)

### 2.5 API keys

**`POST /api/v1/iam/api-keys`** — **solo ADMIN** (`IamSecurityConfig.java:46`; `API-Frontend.md`
dice "cualquier usuario autenticado", está desactualizado) → **`201`** `CreatedApiKeyResource`
(`ApiKeyController.java:58`; el doc dice 200). Body `CreateApiKeyRequest`
(`CreateApiKeyRequest.java:18-23`):

```json
{ "name": "fog-001", "role": "FOG", "nodeId": 1, "expiresAt": "2027-01-01T00:00:00Z" }
```
`role` opcional (por defecto `FOG`); `nodeId` obligatorio con `FOG`, prohibido con `PREDICTION`.
`ApiKeyResource` gana el campo **`role`** (`ApiKeyResource.java:15`), que el frontend no lee hoy.

| Código | Mensaje |
|---|---|
| `400 VALIDATION_ERROR` | "El nombre de la key es obligatorio" |
| `400 API_KEY_NODE_REQUIRED` | "Una key de nodo Fog tiene que estar ligada a un nodo" |
| `400 API_KEY_NODE_NOT_FOUND` | "El nodo elegido ya no existe. Recarga la página" |
| `400 API_KEY_NODE_NOT_ALLOWED` | "Una key del prediction-engine no se liga a ningún nodo" |

`GET /iam/api-keys` y `DELETE /iam/api-keys/{id}` (→ `204`, `404 API_KEY_NOT_FOUND`) sin otros
cambios.

---

## 3. Cambios por capa y fichero

Se siguen las convenciones del repo: `domain/model` = interfaces puras; helpers de dominio puros en
`domain/` (como `parking/domain/zone-classification.ts`); `infrastructure` = `AdminApi` + DTOs
(`admin-response.ts`) + assembler; `application` = stores Pinia en estilo setup; `presentation` =
vistas y componentes. Los stores de admin usan `ref` sueltos (`loading`, `error`, `saving`,
`actionError`) y no `useAsyncState`; se mantiene ese patrón dentro de `admin/` por coherencia con los
seis stores existentes (la memoria del qa-advisor recomienda `useAsyncState`, pero mezclar estilos en
el mismo contexto sería peor; ver D9).

### 3.1 `shared/infrastructure/http-client.ts`

- `errorCode(error): string | undefined` junto a `errorStatus`: lee `error` del cuerpo `ApiError`.
- `postForm<T>(path, form: FormData, options?: { onUploadProgress? })`. **Necesario**: la instancia
  axios fija `Content-Type: application/json` por defecto y axios 1.18 **convierte un `FormData` a
  JSON** cuando ve esa cabecera (`node_modules/axios/lib/defaults/index.js:55-56`), con lo que el
  `File` se perdería. `postForm` pasa `headers: { 'Content-Type': 'multipart/form-data' }`; axios lo
  deja como `FormData` y en el navegador quita la cabecera para que el browser ponga el `boundary`
  (`helpers/resolveConfig.js:79-85`).

### 3.2 Dominio (`src/app/admin/domain/`)

| Fichero | Cambio |
|---|---|
| `model/admin-camera.model.ts` | `AdminCamera` + `mac: string \| null`, `rotation: CameraRotation`, `wifiNetworkId: number \| null`, `capture: CaptureSettings`, `enrollmentGeneration`, `firmware: { target, reported, reportedAt, status }`. Tipos `CameraRotation = 0\|90\|180\|270`, `FrameSize = 'QVGA'\|'VGA'\|'SVGA'\|'XGA'`, `FirmwareStatus`. Formularios: `AdminCameraForm` (General, como hoy), `AdminCameraDeviceForm` (`mac`, `rotation`, `wifiNetworkId: number \| ''`, `capture`), `AdminCameraCreateForm = AdminCameraForm & AdminCameraDeviceForm` |
| `camera-device.ts` (nuevo) | Reglas puras: `CAMERA_ROTATIONS`, `FRAME_SIZES` (con etiqueta `SVGA 800×600`…), `CAPTURE_LIMITS` (30–3600, 10–63), `CAPTURE_DEFAULTS` (300/SVGA/12), `normalizeMac(raw): string \| null`, `FIRMWARE_STATUS_META` (label, variante de badge, ayuda) |
| `model/admin-wifi-network.model.ts` (nuevo) | `AdminWifiNetwork` (`id`, `nodeId`, `ssid`, `cameraCount`, `passwordUpdatedAt`) y `AdminWifiNetworkForm` (`ssid`, `password`) |
| `wifi-credentials.ts` (nuevo) | `ssidByteLength(s)` (con `TextEncoder`), `MAX_SSID_BYTES = 32`, `validateWifiPassword(p): string \| null` (8–63 ASCII imprimible `0x20–0x7E`, o 64 hex) — espejo de `WifiNetwork.requireValidSsid` y `WifiPassphrase` |
| `model/admin-firmware.model.ts` (nuevo) | `AdminFirmwareRelease` (`version`, `size`, `sha256`, `signingKeyId`, `notes`, `createdAt`), `AdminCameraFirmware`, `AdminFirmwareUploadForm` (`file: File \| null`, `version: number \| ''`, `notes`) |
| `firmware-image.ts` (nuevo) | `ESP_IMAGE_MAGIC = 0xE9`, `OTA_SLOT_BYTES = 1_966_080`, `NOTES_MAX = 1000`, `checkFirmwareImage({ firstByte, size, name }): FirmwareCheck` (errores y avisos, §4.3), `minAssignableVersion(target, reported)` |
| `model/admin-api-key.model.ts` | `AdminApiKey.role: ApiKeyRole`; `AdminApiKeyForm.role`; tipo `ApiKeyRole = 'FOG' \| 'PREDICTION'` |
| `model/admin-node.model.ts` | sin cambios (el nº de redes lo da el store de redes) |

### 3.3 Infraestructura

**`admin-response.ts`**
- `AdminCameraResponse` + los campos de §2.1; `CaptureSettingsDto`.
- `AdminCameraCreateRequest` + `mac: string` (**obligatorio**, arregla R1), `rotation?`,
  `wifiNetworkId?`, `capture?`.
- `AdminCameraDeviceSettingsRequest` (`mac: string \| null`, `rotation`, `wifiNetworkId: number \|
  null`, `capture`).
- `CameraConfigResponse` (solo `cameraId` y `spaces: { parkingSpaceId }[]`; tipar lo que se usa).
- `WifiNetworkResponse`, `WifiNetworkCreateRequest`, `WifiNetworkUpdateRequest` (`password: string \|
  null`).
- `FirmwareReleaseResponse`, `CameraFirmwareResponse`, `AssignFirmwareRequest`.
- `AdminApiKeyResponse.role`, `AdminApiKeyCreateRequest.role`.

**`admin-api.ts`** — métodos nuevos (mismo estilo):
`getCamera(id)`, `updateCameraDeviceSettings(id, body)`, `resetCameraEnrollment(id)`,
`getCameraConfig(id)`, `getCameraFirmware(id)`, `assignCameraFirmware(id, version)`,
`clearCameraFirmware(id)`, `getWifiNetworks(nodeId)`, `createWifiNetwork(nodeId, body)`,
`updateWifiNetwork(nodeId, networkId, body)`, `deleteWifiNetwork(nodeId, networkId)`,
`getFirmwareReleases()`, `uploadFirmwareRelease(form: FormData, onProgress?)` (usa `postForm`).

**`admin-assembler.ts`** — `toAdminCamera` ampliado; `toAdminWifiNetwork`, `toAdminFirmwareRelease`,
`toAdminCameraFirmware`; `toAdminApiKey` con `role`. `rotation` llega como `int`: se acota a
`CameraRotation` con un guard (fallback 0) para no mentir en el tipo.

**`firmware-file.ts`** (nuevo, infraestructura del navegador) — `readFirstByte(file: File):
Promise<number \| null>` con `file.slice(0, 1).arrayBuffer()` (o `FileReader.readAsArrayBuffer`
sobre el `slice`, como pide el encargo). Solo lee 1 byte, no el binario entero.

### 3.4 Aplicación (stores)

| Store | Cambio |
|---|---|
| `admin-error-messages.ts` (nuevo, `application/`) | `adminErrorMessage(e, fallback)`: mapa `código → mensaje` de §2 + respaldo por `status`. Sustituye a `actionErrorMessage` local de `admin-cameras.store.ts` y se reutiliza en todos |
| `admin-cameras.store.ts` | `createCamera(form: AdminCameraCreateForm)` envía `mac` normalizada y, si se tocaron, `rotation`/`wifiNetworkId`/`capture` (**R1**). Nuevos: `updateDeviceSettings(id, form)`, `resetEnrollment(id)` (+ `refreshCamera(id)`), `countRoiSpaces(id)` (vía `/config`), `moveToNode(id, form)` (quita red y hace el PUT, D4), `assignFirmware(id, v)` / `clearFirmware(id)` (fusionan `CameraFirmwareResponse` en `cameras[idx].firmware`), `fetchCameraFirmware(id)`. Todos con `actionError` vía `adminErrorMessage` |
| `admin-wifi-networks.store.ts` (nuevo) | `byNode: Record<number, AdminWifiNetwork[]>`, `loadingByNode`, `errorByNode`, `fetchNetworks(nodeId)`, `ensureNetworks(nodeIds)` (pide solo los que faltan; con 3 nodos son ≤3 GET en paralelo), `create/update/delete(nodeId, …)`, `ssidOf(nodeId, networkId)`, `countByNode(nodeId)`. `update` traduce `password === ''` → `null` |
| `admin-firmware.store.ts` (nuevo) | `releases`, `loading`, `error`, `uploading`, `uploadProgress`, `uploadError`, `fetchReleases()`, `uploadRelease(form)` (construye el `FormData`: `file`, `version` como string, `notes` solo si no está vacía), `latestVersion` (computed) |
| `admin-api-keys.store.ts` | `createApiKey` envía `role` y `nodeId` solo si `role === 'FOG'` (**R2**); errores con `adminErrorMessage`; `actionError`; `revokeApiKey` deja de tragarse el fallo |
| `admin-nodes.store.ts` | `actionError` + `adminErrorMessage` en `deleteNode` (**R3**) y en create/update |

### 3.5 Presentación

| Fichero | Cambio |
|---|---|
| `views/AdminCamerasView.vue` | Columnas nuevas, búsqueda por MAC, "Editar" → "Configurar" abre `CameraDetailSheet`; diálogo de alta con `CameraDeviceFields`; carga `ensureNetworks` de los nodos usados |
| `components/CameraDeviceFields.vue` (nuevo) | MAC (con vista previa normalizada y ayuda), rotación (radio de 4), red (por `nodeId` prop), captura plegable. `v-model` de `AdminCameraDeviceForm`; emite `valid`. Reutilizado en alta y pestaña Dispositivo |
| `components/CameraDetailSheet.vue` (nuevo) | `Sheet` + `Tabs` (General · Dispositivo · Firmware · Alta). Orquesta los avisos (MAC, rotación, mover de nodo) con `ConfirmDialog` |
| `components/CameraFirmwarePanel.vue` (nuevo) | Pestaña Firmware: estado, select de versiones con las menores deshabilitadas, asignar, quitar |
| `components/FirmwareStatusBadge.vue` (nuevo) | Badge + tooltip a partir de `FIRMWARE_STATUS_META`; usado en Cámaras, detalle y Firmware |
| `components/MacHelpPopover.vue` (nuevo, opcional) | Texto de ayuda de la MAC (se usa en dos sitios; si queda en una línea, va dentro de `CameraDeviceFields`) |
| `views/AdminNodesView.vue` | Columna "Redes", acción "Redes WiFi", `:error` en el `ConfirmDialog` de borrar (R3) |
| `components/WifiNetworksDialog.vue` (nuevo) | Lista + formulario alta/edición de redes de un nodo; contraseña con mostrar/ocultar; borrar con confirmación |
| `views/AdminFirmwareView.vue` (nuevo) | Tabla de versiones + panel "Despliegue por cámara" |
| `components/FirmwareUploadDialog.vue` (nuevo) | Diálogo de publicación con validación previa y barra de progreso |
| `views/AdminApiKeysView.vue` | Rol (radio), nodo obligatorio con FOG / oculto con PREDICTION, columna "Rol", badge "Sin nodo — sustituir", `:error` al revocar, texto final según rol |
| `components/ZoneRoiEditorModal.vue` | Sin cambios funcionales. Opcional: si `screenshot.rotation ≠ camera.rotation`, aviso "La foto es anterior al cambio de rotación (X° → Y°); espera a la siguiente foto antes de redibujar" |

### 3.6 Shared y router

| Fichero | Cambio |
|---|---|
| `shared/presentation/components/ConfirmDialog.vue` | prop `confirmDisabled?: boolean` (para "escribe CAM-001 para confirmar"). Retrocompatible |
| `router/index.ts` | hijo `{ path: 'firmware', component: () => import('…/AdminFirmwareView.vue') }` bajo `/admin` (mismo `adminGuard`) |
| `shared/presentation/layout/AdminLayout.vue` | entrada de navegación "Firmware" (`Cpu` de `@lucide/vue`) |
| `API-Frontend.md` | Actualizar Cámaras (campos, `device-settings`, `enrollment`, firmware), redes WiFi, firmware y API keys (rol, ADMIN, 201); lo pide el plan del backend §11 "Frontend" |

---

## 4. Validaciones en cliente

Espejo de las reglas del backend, para dar el error antes y en español. El backend sigue siendo la
autoridad: los mensajes de §2 cubren lo que se escape.

### 4.1 MAC

Acepta `aa:bb:cc:dd:ee:ff`, `AA-BB-CC-DD-EE-FF` y `aabbccddeeff`, en cualquier caja y con espacios
alrededor; **no** mezcla de separadores. Normaliza a `AA:BB:CC:DD:EE:FF`. Rechaza multicast (bit 0
del primer octeto), difusión y `00:00:00:00:00:00`. Es exactamente `MacAddress.parse`.

```ts
// camera-device.ts — espejo de MacAddress.parse (cloud-service)
export function normalizeMac(raw: string): string | null {
  const t = raw.trim().toUpperCase()
  const sep = /^[0-9A-F]{2}([:-])(?:[0-9A-F]{2}\1){4}[0-9A-F]{2}$/.test(t)
  const bare = sep ? t.replace(/[:-]/g, '') : t
  if (!/^[0-9A-F]{12}$/.test(bare)) return null
  if ((parseInt(bare.slice(0, 2), 16) & 1) !== 0 || bare === '000000000000') return null
  return bare.match(/../g)!.join(':')
}
```
(La difusión `FF:FF:…` ya cae por el bit multicast.) Se envía **normalizada**; la búsqueda en la
tabla normaliza también lo que escribe el usuario. Unicidad: aviso inline si la MAC ya está en otra
cámara del store ("Ya la usa CAM-002"), sin bloquear (el 409 del backend manda).

### 4.2 Rangos y campos

| Campo | Regla | Mensaje inline |
|---|---|---|
| Zona | obligatoria | "Elige una zona" |
| Nombre / ubicación | ≤ 200 / ≤ 300 | "Máximo 200/300 caracteres" |
| Rotación | ∈ {0, 90, 180, 270} (radio: no se puede salir) | — |
| Intervalo | entero 30–3600 | "Entre 30 s y 1 h (3600 s)" |
| Resolución | QVGA · VGA · SVGA · XGA (select) | — |
| Calidad JPEG | entero 10–63 | "Entre 10 (mejor) y 63" |
| SSID | no vacío, `TextEncoder` ≤ 32 bytes; contador "n/32 bytes" | "Máximo 32 bytes (tildes y ñ cuentan doble)" |
| Contraseña WiFi | 8–63 ASCII imprimible o 64 hex; obligatoria al crear, opcional al editar | "8 a 63 caracteres sin tildes ni ñ, o 64 hex" |
| Versión | entero > 0, ≤ 2.147.483.647, no repetida en la lista | "Ya está publicada la vN" |
| Notas | ≤ 1000 (contador) | "Máximo 1000 caracteres" |
| Nombre de API key | no vacío | (existente) |
| Nodo de API key | obligatorio si rol FOG | "Elige el nodo de esta key" |

Inputs numéricos con `type="number"` + `inputmode="numeric"` + `min`/`max`/`step=1`, y validación
propia en el submit (el navegador no bloquea `v-model` fuera de rango).

### 4.3 Binario de firmware (antes de subir)

Al elegir el archivo, `readFirstByte(file)` (lee solo `file.slice(0, 1)`) y `checkFirmwareImage`:

| Comprobación | Resultado |
|---|---|
| `size === 0` | **Error**: "El archivo está vacío" |
| `size > 1_966_080` | **Error**: "No cabe en la ranura OTA: {size} bytes de 1.966.080 máximo" (si además empieza por `0xFF`: "parece el `.merged.bin`") |
| primer byte ≠ `0xE9` | **Error**: "No es una imagen de aplicación ESP32 (empieza por 0x{xx}, debería ser 0xE9)"; `0xFF` → "parece el `.merged.bin`" |
| extensión ≠ `.bin` | **Aviso** (no bloquea) |
| nombre contiene `bootloader` / `partitions`, o `size < 64 KiB` | **Aviso** fuerte: "Parece el bootloader, no la aplicación. Sube `esp32cam.ino.bin`" (el bootloader también empieza por `0xE9`) |
| todo OK | "✓ Imagen ESP32 · {size} bytes ({pct} % de la ranura OTA)" |

`accept=".bin,application/octet-stream"` en el `<input type="file">`. Con errores, "Publicar" queda
deshabilitado.

---

## 5. Cómo se arreglan las roturas

**R1 — `POST /cameras` sin MAC → 400.** `AdminCameraCreateRequest.mac` pasa a obligatorio en el tipo
(el compilador obliga a rellenarlo), el formulario de alta gana el campo MAC obligatorio con
validación y normalización (§4.1), y el store lo envía normalizado. Mínimo viable para desbloquear el
despliegue de C4: solo MAC (rotación, red y captura pueden llegar en el paso siguiente, el backend
pone defaults). Las cámaras existentes sin MAC siguen funcionando: el tipo de respuesta admite
`mac: null` y la tabla las marca.

**R2 — key FOG sin `nodeId` → 400 `API_KEY_NODE_REQUIRED`.** El formulario añade el rol; con FOG el
nodo es obligatorio (sin opción "Sin nodo asociado") y el submit se bloquea si falta; con PREDICTION
no se envía `nodeId`. El store manda `role` explícito. Los errores `API_KEY_NODE_*` se traducen.

**R3 — borrar nodo con redes → 409 silencioso.** `deleteNode` guarda `actionError` y la vista lo
muestra en el `ConfirmDialog` sin cerrarlo, igual que ya hace Cámaras.

R1 y R2 son independientes del resto y pequeñas: van en el **primer paso** y pueden publicarse solas
antes de desplegar C4/C6 en producción (§6).

---

## 6. Orden de implementación, verificación y agentes

### 6.1 Rama

Estado de las ramas (refs locales de `origin`, sin `fetch` en esta sesión):

| Rama | Commit | Relación |
|---|---|---|
| `origin/main` | `a3a8265` | Lo más nuevo. Contiene el merge de `feat/zone-forecasts` (PR #2, `39e9b1c`) y 2 commits más (`e581afa`, `a3a8265`) |
| `feat/zone-forecasts` (local = origin) | `eb3e38d` | Ya mergeada en `main`; 0 commits que `main` no tenga. Árbol limpio |
| `origin/dev` = `dev` local | `f9f5d71` | **12 commits por detrás de `main`**. Su único commit propio es el merge de `feat/redesign-frontend-ui-library` (`f9f5d71`), con **el mismo árbol** que `7a782b9` de `main` (`git diff` vacío) |
| `main` local | `018302c` | Desactualizada respecto a `origin/main` (le faltan 4 commits) |

Partir de `origin/dev` tal cual dejaría fuera, entre otros, `48a0fff fix(admin): save space ROIs in
rotated-photo coordinates`, que toca justo el editor de ROI y la rotación, y el resto del trabajo de
zonas: el PR a `dev` traería conflictos o regresiones. Propuesta:

1. Actualizar `dev` con `main`: `git switch dev && git merge --ff-only origin/dev && git merge
   origin/main` (merge sin conflictos: el árbol de `dev` ya está contenido en `main`) y push de `dev`.
   Lo decide el dueño (**D8**).
2. Rama de trabajo desde `origin/dev` ya actualizado: **`feat/device-config`**. Si se prefiere un
   PR pequeño para las roturas antes de desplegar C4: `fix/camera-mac-fog-key-node` primero (paso 1
   de abajo) y luego `feat/device-config` encima.

### 6.2 Pasos

| # | Paso | Ficheros | Agentes |
|---|---|---|---|
| 0 | Revisión de los bocetos de §1 (Sheet vs Dialog, densidad de la tabla, avisos) | este plan | `ux-ui-web-designer` |
| 1 | **Roturas R1 + R2 + R3** y base común: `errorCode`, `adminErrorMessage`, `normalizeMac`, MAC en el alta, rol/nodo en API keys, error al borrar nodo/revocar | http-client, admin-error-messages, camera-device, admin-response, admin-api-keys.store, admin-cameras.store, admin-nodes.store, AdminApiKeysView, AdminCamerasView, AdminNodesView | `frontend-clean-code-expert` (implementa) → `qa-code-advisor` (revisa) |
| 2 | Redes WiFi por nodo | admin-wifi-network.model, wifi-credentials, admin-api, assembler, admin-wifi-networks.store, WifiNetworksDialog, AdminNodesView | `frontend-clean-code-expert` → `qa-code-advisor` |
| 3 | Dispositivo de cámara: modelo ampliado, `CameraDeviceFields`, `CameraDetailSheet` (General + Dispositivo + Alta), avisos de MAC/rotación/nodo, `confirmDisabled` | admin-camera.model, camera-device, admin-response, admin-api, assembler, admin-cameras.store, CameraDeviceFields, CameraDetailSheet, ConfirmDialog, AdminCamerasView | `ux-ui-web-designer` (pase visual del Sheet) + `frontend-clean-code-expert` → `qa-code-advisor` |
| 4 | Pantalla Firmware: lista + publicación | http-client `postForm`, admin-firmware.model, firmware-image, firmware-file, admin-firmware.store, FirmwareUploadDialog, AdminFirmwareView, router, AdminLayout | `frontend-clean-code-expert` → `qa-code-advisor` |
| 5 | Firmware por cámara: `FirmwareStatusBadge`, pestaña Firmware, panel de despliegue, columna en la tabla | FirmwareStatusBadge, CameraFirmwarePanel, CameraDetailSheet, AdminFirmwareView, AdminCamerasView | `frontend-clean-code-expert` → `qa-code-advisor` |
| 6 | Documentación `API-Frontend.md` y repaso de accesibilidad (foco en Sheet/Tabs, `aria-describedby` de hints, contraste de badges en oscuro) | API-Frontend.md, vistas | `ux-ui-web-designer` (a11y) + `qa-code-advisor` (revisión final del diff) |

Cada paso termina con `pnpm build` en verde y la prueba manual de su parte (§6.3), y es un commit
propio (estilo del repo: `feat(admin): …`, `fix(admin): …`).

### 6.3 Verificación

**Type-check.** El repo no tiene tests: `pnpm build` (`vue-tsc -b && vite build`) es la red. Los
tipos nuevos están pensados para que el compilador detecte R1 (`mac` obligatorio en el request) y
los usos de `AdminCamera` que haya que actualizar (`ZoneRoiEditorModal`, `AdminDashboardView`).

**Backend local.** En `cloud-service` (rama `dev`):
1. Para probar redes WiFi con éxito hace falta `WIFI_SECRETS_ENCRYPTION_KEY`
   (`scripts/gen-wifi-secrets-key.sh`); sin ella, crear/editar responde `503` (sirve para probar ese
   mensaje). Para publicar firmware: `FIRMWARE_SIGNING_PRIVATE_KEY`/`PUBLIC_KEY`
   (`scripts/gen-firmware-signing-key.sh`) **y** credenciales R2 de un bucket de pruebas; sin R2 la
   publicación llega hasta `503 FIRMWARE_STORAGE_UNAVAILABLE` (sirve para probar los 400/409, que
   van antes: versión repetida → imagen → firma → R2). Las variables van en el entorno de
   `docker compose` de `cloud-service` (líneas 88-95 del compose).
2. `docker compose up -d` → gateway en `http://localhost:8080`. Si la base viene de antes de C6, la
   key del `DevApiKeySeeder` no tiene nodo y `V8` falla: `docker compose down -v` (plan del backend
   §11, fase A).
3. Frontend: `pnpm dev`; el proxy de Vite manda `/api` a `:8080` (`vite.config.ts`). Login en
   `/admin` con un usuario ADMIN.

**Binarios de prueba** (en un directorio temporal, fuera del repo):
- Válido real: `esp32cam/build/esp32cam.ino.bin` (0xE9, 1.134.720 bytes).
- Merged: `esp32cam/build/esp32cam.ino.merged.bin` (0xFF, 4.194.304) → error en cliente.
- Bootloader: `esp32cam/build/esp32cam.ino.bootloader.bin` (0xE9, 24.992) → aviso en cliente; el
  backend **lo aceptaría** (D12: aún no valida `chip_id` ni `esp_app_desc_t`).
- Demasiado grande: `head -c 1966081 /dev/zero | tr '\0' '\351' > big.bin` → error en cliente;
  forzando el envío (DevTools/curl) → `400 FIRMWARE_TOO_LARGE`.
- Byte malo: `printf '\x00' > bad.bin` → error en cliente / `400 INVALID_FIRMWARE_IMAGE`.

> **Cuidado:** no hay borrado de versiones ni bajada de versión. Publicar en un entorno compartido o
> en producción para probar deja una versión basura para siempre y sube el mínimo de todas las
> cámaras a las que se asigne. Probar la publicación **solo en local** (`down -v` lo limpia).

**Checklist manual** (cada línea: acción → resultado esperado en pantalla):

| Área | Caso | Esperado |
|---|---|---|
| R1 | Alta con `24-6f-28-ab-cd-ef` | 201; tabla muestra `24:6F:28:AB:CD:EF` |
| R1 | Alta con MAC de otra cámara | aviso inline + `409` → mensaje de MAC duplicada |
| R1 | Alta con `01:00:5E:00:00:01` (multicast) | error inline; sin llamada |
| R2 | Key FOG sin nodo | submit bloqueado; forzando → mensaje `API_KEY_NODE_REQUIRED` |
| R2 | Key PREDICTION | sin selector de nodo; 201; columna Rol = PREDICTION |
| R3 | Borrar nodo con redes | diálogo sigue abierto con el mensaje 409 |
| WiFi | Crear red con SSID de 33 bytes (`ñ`×17) | error inline por bytes |
| WiFi | Editar red sin tocar contraseña | `PUT` con `password: null` (verlo en Network); `passwordUpdatedAt` no cambia |
| WiFi | Borrar red asignada | botón deshabilitado; forzando → 409 `WIFI_NETWORK_IN_USE` |
| WiFi | Sin `WIFI_SECRETS_ENCRYPTION_KEY` | 503 con el mensaje de clave de cifrado |
| Disp. | Cambiar rotación de una cámara con ROI | confirmación con nº de espacios; tras guardar `rotation` nuevo en la tabla |
| Disp. | Cambiar MAC existente | confirmación; tras guardar, pestaña Alta muestra generación +1 |
| Disp. | Cámara sin MAC: guardar rotación con MAC vacía | 200; sigue "Sin MAC" |
| Disp. | Cámara con MAC: vaciar MAC | error inline; forzando → `CAMERA_MAC_REQUIRED` |
| Nodo | Cambiar nodo de una cámara con red | aviso + "Quitar red y mover"; dos llamadas; red queda vacía |
| Alta | Reiniciar alta | botón habilitado solo al escribir el código; 204; generación +1 |
| FW | Publicar `esp32cam.ino.bin` como v1 | 201 (con R2) o 503 storage (sin R2); progreso visible |
| FW | Publicar otra vez v1 | error inline (lista) / 409 |
| FW | Asignar v1 a CAM-001; luego intentar v0/menor | menores deshabilitadas; forzando → 409 downgrade |
| FW | Quitar versión asignada | 204; estado `NOT_MANAGED` |
| Roles | Login como OPERATOR en `/admin` | "Acceso no autorizado" (comportamiento actual, D1) |
| Build | `pnpm build` | sin errores de `vue-tsc` |

---

## 7. Decisiones para el dueño

| # | Decisión | Recomendación |
|---|---|---|
| D1 | ¿Abrir el panel a OPERATOR? El backend le deja cámaras, `device-settings`, reiniciar alta, asignar firmware y listar redes/versiones; hoy el guard y `adminLogin` solo admiten ADMIN | **No en esta fase.** Dejar el panel ADMIN-only y diseñar con `canWrite` por recurso para abrirlo después cambiando el guard y ocultando Usuarios, API keys, escritura de redes y "Publicar". Reiniciar alta en manos de un OPERATOR es arriesgado mientras E7 no esté desplegado |
| D2 | ¿Mostrar "Reiniciar alta" ya, si E7 no está desplegado? (F4/F5 ya están en el Fog: revoca de verdad la credencial del firmware actual → 401 hasta USB) | **Mostrarlo** en la pestaña Alta con la confirmación de escribir el código y el aviso explícito de "solo con el firmware de alta por MAC". Alternativa más prudente: ocultarlo tras un flag `VITE_FEATURE_ENROLLMENT` hasta E7 |
| D3 | ¿Cámaras sin MAC pueden guardar `device-settings` sin MAC? (el backend lo permite) | **Sí**, con el aviso "Sin MAC": bloquearlo impediría corregir la rotación en la fase B de la migración si aún no se ha leído la MAC |
| D4 | Mover de nodo una cámara con red: ¿la UI quita la red y mueve (dos llamadas), o bloquea y obliga a hacerlo a mano? | **Guiado en dos llamadas** con aviso de reaprovisionar por USB (D11 del backend). El primer paso (`wifiNetworkId: null`) es inocuo si falla el segundo |
| D5 | Detalle de cámara en `Sheet` lateral con pestañas, o `Dialog` como el resto del panel | **Sheet**: cuatro grupos de campos no caben bien en un diálogo y la tabla sigue visible. El alta sigue en `Dialog` |
| D6 | ¿Asignación masiva de firmware ("asignar vN a todas")? | **No**: solo por cámara (detalle y panel de despliegue). El backend está pensado para escalonar ("primero una y, si va bien, las demás") y con 3 cámaras son 3 clics |
| D7 | ¿Mostrar las pantallas de firmware ya, con el OTA aún sin E5 (ESP32)? (F2 ya está en el Fog) | **Sí**, con una nota fija "El Fog ya descarga la versión asignada; las placas la instalarán cuando lleven el firmware con cliente OTA". Publicar y asignar ya sirve para probar nube y Fog |
| D8 | Rama base: `dev` está 12 commits por detrás de `main` | **Mergear `origin/main` en `dev`** (sin conflictos) y crear `feat/device-config` desde `dev`. Alternativa: rama desde `origin/main` y PR a `main` directamente |
| D9 | Estado asíncrono: seguir con `ref` sueltos como los 6 stores de admin, o migrar a `useAsyncState` | **Seguir el patrón de admin** en estos stores; migrar todo `admin/` a `useAsyncState` en un refactor aparte, no mezclado con funcionalidad |
| D10 | ¿Validar en cliente la unicidad de la MAC contra las cámaras cargadas? | **Sí, como aviso** (no bloqueo): nombra la cámara que ya la tiene, cosa que el 409 no hace |
| D11 | Columna "Ubicación" de la tabla de cámaras | **Quitarla** de la tabla (sigue en el detalle) para dar sitio a MAC y firmware |
| D12 | El backend no tiene handler para `MissingServletRequestParameterException` (`version` ausente o no numérica en el multipart → 400 sin código `ApiError`) | Aceptarlo en el frontend (la validación en cliente lo evita) y **pedir al backend** un handler que devuelva `400 VALIDATION_ERROR` con el formato común |
| D13 | `API-Frontend.md` está desactualizado en API keys (rol, ADMIN-only, 201) y no tiene nada de lo nuevo | Actualizarlo en el paso 6 de este plan, o regenerarlo desde `/v3/api-docs/all` si existe el script que lo generó |

---

## 8. Implementación (2026-10-12, rama `feat/device-config`, sin commit)

Hecha en el orden de §6.2, con `pnpm build` en verde tras cada paso. Desviaciones respecto al plan:

| Plan | Implementado | Motivo |
|---|---|---|
| Usar los agentes del repo (`frontend-clean-code-expert`, `qa-code-advisor`, `ux-ui-web-designer`) | Se siguieron sus reglas sin lanzarlos | No estaban disponibles como agentes en la sesión de implementación |
| Rotación y rol con un "radio" | Componente nuevo `AdminSegmented.vue` (radios nativos con aspecto segmentado) | Lo usan dos formularios; teclado y lector de pantalla sin código extra |
| `MacHelpPopover.vue` opcional | `<details>` "¿Dónde encuentro la MAC?" dentro de `CameraDeviceFields` | Visible y accesible por teclado sin depender del proveedor de tooltips |
| Tabla de cámaras: Nombre, Zona, Código, MAC, Firmware, Estado | Se añade también "Red WiFi" (SSID) | Es el dato nuevo que más se consulta; Ubicación pasa al detalle (D11) |
| Input de fichero con `<Input>` | `<input type="file">` nativo con los estilos de `Input` | El `v-model` interno de `<Input>` reescribe `value`, que en un input de fichero lo vacía |
| Mensaje de downgrade con "la v{N}" | Mensaje genérico | El caso casi no se ve: las versiones menores salen deshabilitadas en el select y en el panel de despliegue |
| Métodos de firmware por cámara en el paso 5 | `admin-api.ts` los tiene desde el paso 4 | Se añadieron junto con los de versiones; la UI sí llega en el paso 5 |
| Aviso opcional en `ZoneRoiEditorModal` | Hecho: avisa si el giro mostrado ≠ `camera.rotation` | Barato con el modelo nuevo |
| Aviso de rotación si `/config` falla | Se avisa igualmente ("puede que tenga espacios con ROI") | Mejor un aviso de más que descuadrar ROI sin avisar |
