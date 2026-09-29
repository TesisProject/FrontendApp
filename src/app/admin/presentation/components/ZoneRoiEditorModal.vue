<script setup lang="ts">
import { ref, reactive, computed, shallowRef, onMounted, watch } from 'vue'
import { useAdminSpacesStore } from '../../application/admin-spaces.store'
import type { AdminCamera } from '../../domain/model/admin-camera.model'
import type { PointResponse } from '../../infrastructure/admin-response'

const props = defineProps<{
  zoneId:   number
  zoneName: string
}>()

const emit = defineEmits<{ close: [] }>()

const spacesStore = useAdminSpacesStore()

// Ancho lógico del canvas; el alto sigue la proporción de la foto (16:9 sin foto).
const CANVAS_W = 800
const DEFAULT_H = 450
const HANDLE_RADIUS = 6

/**
 * ROI de un espacio. `points` está en coordenadas normalizadas 0–1 de la foto SIN girar de su cámara
 * (así lo usan el Fog y la preview del backend); solo al dibujar se pasan a la foto derecha.
 */
interface SpaceRoi {
  points:   PointResponse[]
  cameraId: number | null
  dirty:    boolean
  // Último estado guardado en el backend (para "Descartar"); null si no está monitoreado.
  saved:    { points: PointResponse[]; cameraId: number } | null
}

/** Fondo de una cámara: su última foto o una imagen subida a mano, y el giro para verla derecha. */
interface CameraBackground {
  image:      HTMLImageElement | null
  rotation:   number
  capturedAt: string | null
}

const canvasRef   = ref<HTMLCanvasElement | null>(null)
const loading     = ref(true)
const saving      = ref(false)
const loadError   = ref<string | null>(null)
const cameras     = ref<AdminCamera[]>([])
const cameraId    = ref<number | null>(null)
const selectedId  = ref<number | null>(null)
const rois        = reactive<Record<number, SpaceRoi>>({})
const feedback    = ref<{ ok: boolean; msg: string } | null>(null)
const background  = shallowRef<CameraBackground | null>(null)
const bgLoading   = ref(false)
const canvasH     = ref(DEFAULT_H)

const backgrounds = new Map<number, CameraBackground>()
let dragIndex = -1

const rotation = computed(() => background.value?.rotation ?? 0)

const selectedRoi = computed(() =>
  selectedId.value !== null ? rois[selectedId.value] : null,
)

/** El espacio seleccionado lo cubre otra cámara: dibujar aquí lo reasigna a la cámara actual. */
const selectedInOtherCamera = computed(() => {
  const roi = selectedRoi.value
  return !!roi && roi.cameraId !== null && roi.cameraId !== cameraId.value
})

const dirtyCount = computed(() =>
  Object.values(rois).filter(r => r.dirty && r.points.length >= 3).length,
)

function cameraLabel(id: number | null): string {
  return cameras.value.find(c => c.id === id)?.code ?? `cámara ${id}`
}

function spacesCoveredBy(id: number): number {
  return Object.values(rois).filter(r => r.cameraId === id && r.points.length > 0).length
}

// ── Rotación: foto sin girar (ROI) ↔ foto derecha (canvas) ─────────────────

function toDisplay({ x, y }: PointResponse, r = rotation.value): PointResponse {
  switch (r) {
    case 90:  return { x: 1 - y, y: x }
    case 180: return { x: 1 - x, y: 1 - y }
    case 270: return { x: y, y: 1 - x }
    default:  return { x, y }
  }
}

function toRaw({ x, y }: PointResponse, r = rotation.value): PointResponse {
  switch (r) {
    case 90:  return { x: y, y: 1 - x }
    case 180: return { x: 1 - x, y: 1 - y }
    case 270: return { x: 1 - y, y: x }
    default:  return { x, y }
  }
}

function fitCanvasToBackground() {
  const img = background.value?.image
  if (!img) { canvasH.value = DEFAULT_H; return }
  const swapped = rotation.value === 90 || rotation.value === 270
  const w = swapped ? img.naturalHeight : img.naturalWidth
  const h = swapped ? img.naturalWidth : img.naturalHeight
  canvasH.value = Math.round(CANVAS_W * (h / w))
}

// ── Dibujo ──────────────────────────────────────────────────────────────────

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  const H = canvasH.value

  ctx.clearRect(0, 0, CANVAS_W, H)

  const img = background.value?.image
  if (img) {
    drawBackground(ctx, img)
  } else {
    ctx.fillStyle = '#f4f6f8'
    ctx.fillRect(0, 0, CANVAS_W, H)
    ctx.strokeStyle = '#e2e6ea'
    ctx.lineWidth = 1
    for (let x = 0; x <= CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
    }
  }

  // Solo los espacios de la cámara actual: el ROI de otra cámara está en otra foto.
  // Primero los NO seleccionados (atenuados), luego el seleccionado encima.
  for (const space of spacesStore.spaces) {
    if (space.id !== selectedId.value) drawPolygon(ctx, space.id, space.spaceNumber, false)
  }
  if (selectedId.value !== null) {
    const space = spacesStore.spaces.find(s => s.id === selectedId.value)
    if (space) drawPolygon(ctx, space.id, space.spaceNumber, true)
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const rot = rotation.value
  // Con 90° / 270° el ancho y el alto se intercambian para que la imagen girada llene el canvas.
  const swapped = rot === 90 || rot === 270
  const w = swapped ? canvasH.value : CANVAS_W
  const h = swapped ? CANVAS_W : canvasH.value
  ctx.save()
  ctx.translate(CANVAS_W / 2, canvasH.value / 2)
  ctx.rotate((rot * Math.PI) / 180)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
}

function drawPolygon(ctx: CanvasRenderingContext2D, spaceId: number, label: string, selected: boolean) {
  const roi = rois[spaceId]
  if (!roi || roi.points.length === 0 || roi.cameraId !== cameraId.value) return

  const px = roi.points.map(p => {
    const d = toDisplay(p)
    return { x: d.x * CANVAS_W, y: d.y * canvasH.value }
  })
  const stroke = selected ? '#38a169' : 'rgba(26, 86, 196, 0.55)'
  const fill   = selected ? 'rgba(56, 161, 105, 0.28)' : 'rgba(26, 86, 196, 0.12)'

  ctx.beginPath()
  ctx.moveTo(px[0].x, px[0].y)
  for (let i = 1; i < px.length; i++) ctx.lineTo(px[i].x, px[i].y)
  if (px.length >= 3) {
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.strokeStyle = stroke
  ctx.lineWidth = selected ? 2.5 : 1.5
  ctx.stroke()

  // Vértices solo del polígono seleccionado (es el único editable).
  if (selected) {
    px.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, HANDLE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = i === 0 ? '#092c4c' : '#38a169'
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 2
      ctx.stroke()
    })
  }

  // Etiqueta en el centroide
  const cx = px.reduce((a, p) => a + p.x, 0) / px.length
  const cy = px.reduce((a, p) => a + p.y, 0) / px.length
  ctx.font = '600 12px sans-serif'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = selected ? '#092c4c' : 'rgba(9, 44, 76, 0.75)'
  ctx.fillRect(cx - tw / 2 - 5, cy - 9, tw + 10, 18)
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy)
}

// flush 'post': al cambiar el alto del canvas el DOM lo limpia, así que se redibuja después.
watch([rois, selectedId, cameraId, background, canvasH], draw, { deep: true, flush: 'post' })

// ── Interacción ─────────────────────────────────────────────────────────────

/** Posición del mouse sobre la foto derecha (0–1). */
function canvasPos(e: MouseEvent): PointResponse {
  const rect = canvasRef.value!.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }
}

function hitPoint(pos: PointResponse): number {
  const roi = selectedRoi.value
  if (!roi || selectedInOtherCamera.value) return -1
  const threshold = HANDLE_RADIUS * 1.8
  return roi.points.findIndex(p => {
    const d = toDisplay(p)
    return Math.hypot((d.x - pos.x) * CANVAS_W, (d.y - pos.y) * canvasH.value) <= threshold
  })
}

function onMouseDown(e: MouseEvent) {
  const roi = selectedRoi.value
  if (!roi || cameraId.value === null) return
  // Su polígono actual pertenece a la foto de otra cámara: se empieza uno nuevo sobre esta.
  if (roi.cameraId !== cameraId.value) {
    roi.points = []
    roi.cameraId = cameraId.value
  }
  const pos = canvasPos(e)
  const idx = hitPoint(pos)
  if (idx !== -1) {
    dragIndex = idx
  } else {
    roi.points.push(toRaw(pos))
    roi.dirty = true
    dragIndex = roi.points.length - 1
  }
  feedback.value = null
}

function onMouseMove(e: MouseEvent) {
  const roi = selectedRoi.value
  if (dragIndex === -1 || !roi) return
  roi.points[dragIndex] = toRaw(canvasPos(e))
  roi.dirty = true
}

function onMouseUp() {
  dragIndex = -1
}

function undoPoint() {
  const roi = selectedRoi.value
  if (!roi || roi.points.length === 0) return
  roi.points.pop()
  roi.dirty = true
}

function clearPoints() {
  const roi = selectedRoi.value
  if (!roi) return
  roi.points = []
  roi.dirty = true
}

/** Vuelve al último estado guardado del espacio (deshace dibujos y reasignaciones). */
function discardSelected() {
  const roi = selectedRoi.value
  if (!roi) return
  roi.points   = roi.saved ? [...roi.saved.points] : []
  roi.cameraId = roi.saved?.cameraId ?? null
  roi.dirty    = false
}

// ── Cámaras y fondo ─────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Última foto de la cámara (con su giro); si no hay, un fondo vacío para subir una imagen. */
async function loadCameraBackground(id: number): Promise<CameraBackground> {
  const cached = backgrounds.get(id)
  if (cached) return cached
  const empty: CameraBackground = { image: null, rotation: 0, capturedAt: null }
  const shot = await spacesStore.fetchCameraScreenshot(id)
  let bg = empty
  if (shot) {
    try {
      bg = { image: await loadImage(shot.url), rotation: shot.rotation ?? 0, capturedAt: shot.capturedAt }
    } catch {
      bg = empty
    }
  }
  backgrounds.set(id, bg)
  return bg
}

async function selectCamera(id: number) {
  cameraId.value = id
  feedback.value = null
  bgLoading.value = true
  const bg = await loadCameraBackground(id)
  if (cameraId.value !== id) return // se cambió de cámara mientras cargaba
  background.value = bg
  fitCanvasToBackground()
  bgLoading.value = false
}

function setBackground(bg: CameraBackground) {
  if (cameraId.value === null) return
  backgrounds.set(cameraId.value, bg)
  background.value = bg
  fitCanvasToBackground()
}

// Giro de la vista (grados, sentido horario). Los ROI no cambian: viven en la foto sin girar.
function rotateImage() {
  const bg = background.value
  if (!bg?.image) return
  setBackground({ ...bg, rotation: (bg.rotation + 90) % 360 })
}

// Imagen de referencia propia (solo local, para dibujar; no se sube).
function onImageSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    const image = await loadImage(reader.result as string)
    setBackground({ image, rotation: background.value?.rotation ?? 0, capturedAt: null })
  }
  reader.readAsDataURL(file)
}

function formatCapturedAt(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Acciones ────────────────────────────────────────────────────────────────

async function saveAll() {
  const dirtyIncomplete = spacesStore.spaces.filter(s => {
    const r = rois[s.id]
    return r?.dirty && r.points.length > 0 && r.points.length < 3
  })
  if (dirtyIncomplete.length > 0) {
    feedback.value = {
      ok: false,
      msg: `Espacios con menos de 3 puntos: ${dirtyIncomplete.map(s => s.spaceNumber).join(', ')}. Complétalos o límpialos.`,
    }
    return
  }

  const toSave = spacesStore.spaces.filter(s => {
    const r = rois[s.id]
    return r?.dirty && r.cameraId !== null && r.points.length >= 3
  })
  if (toSave.length === 0) {
    feedback.value = { ok: false, msg: 'No hay cambios que guardar' }
    return
  }

  saving.value = true
  let saved = 0
  for (const space of toSave) {
    const roi = rois[space.id]
    const ok = await spacesStore.saveRoi(space.id, roi.cameraId!, roi.points)
    if (ok) {
      roi.saved = { points: [...roi.points], cameraId: roi.cameraId! }
      roi.dirty = false
      saved++
    }
  }
  saving.value = false
  feedback.value = saved === toSave.length
    ? { ok: true,  msg: `${saved} ROI${saved !== 1 ? 's' : ''} guardado${saved !== 1 ? 's' : ''}` }
    : { ok: false, msg: `Se guardaron ${saved} de ${toSave.length} ROIs — revisa e intenta de nuevo` }
}

async function removeSelected() {
  const roi = selectedRoi.value
  if (!roi || selectedId.value === null || !roi.saved) return
  const ok = await spacesStore.removeMonitoring(selectedId.value)
  if (ok) {
    roi.points   = []
    roi.cameraId = null
    roi.saved    = null
    roi.dirty    = false
    feedback.value = { ok: true, msg: 'El espacio ya no se monitorea' }
  } else {
    feedback.value = { ok: false, msg: spacesStore.error ?? 'Error al quitar el monitoreo' }
  }
}

function spaceState(id: number): { cls: string; label: string } {
  const roi = rois[id]
  if (!roi) return { cls: 'off', label: 'Sin ROI' }
  if (roi.dirty) return { cls: 'dirty', label: '● sin guardar' }
  if (!roi.saved) return { cls: 'off', label: 'Sin ROI' }
  return roi.saved.cameraId === cameraId.value
    ? { cls: 'on', label: 'En esta cámara' }
    : { cls: 'other', label: `En ${cameraLabel(roi.saved.cameraId)}` }
}

function tryClose() {
  emit('close')
}

onMounted(async () => {
  try {
    // Asegura los espacios de la zona (si se abrió sin pasar por el modal de espacios).
    if (spacesStore.spaces.length === 0 || spacesStore.spaces[0]?.zoneId !== props.zoneId) {
      await spacesStore.fetchByZone(props.zoneId)
    }
    const [zoneCameras] = await Promise.all([
      spacesStore.fetchZoneCameras(props.zoneId),
      // ROI + cámara de cada espacio en paralelo (404 ⇒ sin monitorear).
      ...spacesStore.spaces.map(async s => {
        const monitored = await spacesStore.fetchMonitored(s.id)
        rois[s.id] = {
          points:   monitored ? [...monitored.roi] : [],
          cameraId: monitored?.cameraId ?? null,
          dirty:    false,
          saved:    monitored ? { points: [...monitored.roi], cameraId: monitored.cameraId } : null,
        }
      }),
    ])
    cameras.value = zoneCameras
  } catch {
    loadError.value = 'No se pudieron cargar las cámaras de la zona'
  }
  selectedId.value = spacesStore.spaces[0]?.id ?? null
  loading.value = false
  if (cameras.value.length > 0) await selectCamera(cameras.value[0].id)
})
</script>

<template>
  <div class="overlay" @click.self="tryClose">
    <div class="modal roi-modal">
      <div class="roi-head">
        <div>
          <h2 class="modal-title">ROIs de {{ zoneName }}</h2>
          <p class="roi-sub">
            Elige la cámara que cubre el espacio, selecciona el espacio y dibuja su polígono con clics sobre la foto.
          </p>
        </div>
        <span v-if="dirtyCount > 0" class="badge dirty-badge">{{ dirtyCount }} sin guardar</span>
      </div>

      <div v-if="loading" class="roi-loading">Cargando ROIs de la zona...</div>

      <div v-else-if="loadError" class="roi-loading error">{{ loadError }}</div>

      <div v-else-if="cameras.length === 0" class="roi-loading">
        Esta zona no tiene cámaras. Registra una en <strong>Cámaras</strong> para poder dibujar sus ROIs.
      </div>

      <template v-else>
        <!-- Cámaras de la zona -->
        <div class="roi-cameras">
          <button
            v-for="c in cameras"
            :key="c.id"
            class="roi-cam-tab"
            :class="{ selected: c.id === cameraId }"
            @click="selectCamera(c.id)"
          >
            <span class="roi-cam-code">{{ c.code }}</span>
            <span v-if="c.name !== c.code" class="roi-cam-name">{{ c.name }}</span>
            <span class="roi-cam-count">{{ spacesCoveredBy(c.id) }} esp.</span>
          </button>
        </div>

        <div class="roi-body">
          <!-- Lista de espacios -->
          <aside class="roi-spaces">
            <button
              v-for="s in spacesStore.spaces"
              :key="s.id"
              class="roi-space-item"
              :class="{ selected: s.id === selectedId }"
              @click="selectedId = s.id"
            >
              <span class="roi-space-num">{{ s.spaceNumber }}</span>
              <span class="roi-space-state" :class="spaceState(s.id).cls">{{ spaceState(s.id).label }}</span>
            </button>
          </aside>

          <!-- Canvas -->
          <div class="roi-canvas-col">
            <p v-if="selectedInOtherCamera" class="roi-notice">
              Este espacio lo cubre {{ cameraLabel(selectedRoi!.cameraId) }}. Si dibujas aquí, al guardar
              pasará a {{ cameraLabel(cameraId) }}.
            </p>
            <canvas
              ref="canvasRef"
              class="roi-canvas"
              :class="{ busy: bgLoading }"
              :width="CANVAS_W"
              :height="canvasH"
              @mousedown="onMouseDown"
              @mousemove="onMouseMove"
              @mouseup="onMouseUp"
              @mouseleave="onMouseUp"
            />
            <p class="roi-bg-info">
              <template v-if="bgLoading">Cargando foto de la cámara...</template>
              <template v-else-if="background?.capturedAt">
                Última foto de la cámara · {{ formatCapturedAt(background.capturedAt) }}
              </template>
              <template v-else-if="background?.image">Imagen de referencia propia</template>
              <template v-else>La cámara aún no subió fotos: sube una imagen de referencia.</template>
            </p>
            <div class="roi-toolbar">
              <label class="btn-ghost file-btn">
                {{ background?.image ? 'Usar otra imagen' : 'Subir imagen de referencia' }}
                <input type="file" accept="image/*" hidden @change="onImageSelected" />
              </label>
              <button
                class="btn-ghost"
                :disabled="!background?.image"
                title="Gira la vista 90° en sentido horario (el ROI no cambia)"
                @click="rotateImage"
              >
                Girar 90°{{ rotation ? ` (${rotation}°)` : '' }}
              </button>
              <span class="roi-count">
                {{ selectedRoi && !selectedInOtherCamera
                  ? `${selectedRoi.points.length} punto${selectedRoi.points.length !== 1 ? 's' : ''}`
                  : '' }}
              </span>
              <div class="roi-tools">
                <button
                  class="btn-ghost"
                  :disabled="!selectedRoi || selectedInOtherCamera || selectedRoi.points.length === 0"
                  @click="undoPoint"
                >Deshacer</button>
                <button
                  class="btn-ghost"
                  :disabled="!selectedRoi || selectedInOtherCamera || selectedRoi.points.length === 0"
                  @click="clearPoints"
                >Limpiar</button>
                <button class="btn-ghost" :disabled="!selectedRoi?.dirty" @click="discardSelected">Descartar</button>
                <button
                  class="btn-ghost danger"
                  :disabled="!selectedRoi?.saved || spacesStore.saving"
                  @click="removeSelected"
                >
                  Quitar ROI
                </button>
              </div>
            </div>
          </div>
        </div>

        <p v-if="feedback" class="feedback" :class="feedback.ok ? 'ok' : 'err'">{{ feedback.msg }}</p>
      </template>

      <div v-if="loading || loadError || cameras.length === 0" class="modal-actions">
        <button class="btn-ghost" @click="tryClose">Cerrar</button>
      </div>
      <div v-else class="modal-actions">
        <button class="btn-ghost" @click="tryClose">Cerrar</button>
        <button class="btn-primary" :disabled="saving || dirtyCount === 0" @click="saveAll">
          {{ saving ? 'Guardando...' : `Guardar cambios${dirtyCount > 0 ? ` (${dirtyCount})` : ''}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

.roi-modal {
  width: 1000px;
  max-width: 96vw;
  max-height: 92vh;
  overflow-y: auto;
}

.roi-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.roi-sub {
  font-size: 12px;
  color: #888;
  margin: 4px 0 0;
}

.badge.dirty-badge { background: #fff4e5; color: #b26a00; }

.roi-loading {
  text-align: center;
  color: #aaa;
  font-size: 13px;
  padding: 80px 0;
}
.roi-loading.error { color: #c0392b; }

/* Pestañas de cámaras */
.roi-cameras {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.roi-cam-tab {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  border: 1.5px solid #eee;
  border-radius: 8px;
  background: #fafbfc;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.roi-cam-tab:hover { background: #f0f5fa; }
.roi-cam-tab.selected { border-color: #1a56c4; background: #eef3fc; }

.roi-cam-code { font-size: 12.5px; font-weight: 700; font-family: monospace; color: #092c4c; }
.roi-cam-name { font-size: 12px; color: #555; }
.roi-cam-count { font-size: 10.5px; color: #999; }

.roi-body {
  display: flex;
  gap: 14px;
  align-items: stretch;
}

/* Lista lateral de espacios */
.roi-spaces {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 480px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.roi-space-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border: 1.5px solid #eee;
  border-radius: 8px;
  background: #fafbfc;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.roi-space-item:hover { background: #f0f5fa; }
.roi-space-item.selected {
  border-color: #38a169;
  background: #f0faf4;
}

.roi-space-num {
  font-size: 13px;
  font-weight: 700;
  font-family: monospace;
  color: #092c4c;
}

.roi-space-state { font-size: 10.5px; font-weight: 600; }
.roi-space-state.on    { color: #2e7d52; }
.roi-space-state.other { color: #1a56c4; }
.roi-space-state.off   { color: #aaa; }
.roi-space-state.dirty { color: #b26a00; }

/* Canvas */
.roi-canvas-col {
  flex: 1;
  min-width: 0;
}

.roi-notice {
  font-size: 12px;
  color: #1a56c4;
  background: #eef3fc;
  border-radius: 8px;
  padding: 6px 10px;
  margin: 0 0 8px;
}

/* Tamaño intrínseco = proporción de la foto; se escala sin deformarse. */
.roi-canvas {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  margin: 0 auto;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  cursor: crosshair;
}
.roi-canvas.busy { opacity: 0.5; }

.roi-bg-info {
  font-size: 11.5px;
  color: #999;
  text-align: center;
  margin: 6px 0 0;
}

.roi-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.file-btn { cursor: pointer; font-size: 12px; }

.roi-count {
  flex: 1;
  text-align: center;
  font-size: 12px;
  color: #aaa;
}

.roi-tools { display: flex; gap: 6px; }

.btn-ghost.danger { color: #c0392b; border-color: #f0c7c2; }
.btn-ghost.danger:hover:not(:disabled) { background: #fdecea; }
</style>
