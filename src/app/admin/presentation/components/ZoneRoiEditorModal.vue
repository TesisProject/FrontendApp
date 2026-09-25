<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAdminSpacesStore } from '../../application/admin-spaces.store'
import type { PointResponse } from '../../infrastructure/admin-response'

const props = defineProps<{
  zoneId:   number
  zoneName: string
}>()

const emit = defineEmits<{ close: [] }>()

const spacesStore = useAdminSpacesStore()

// Resolución lógica del canvas (16:9). Los puntos se guardan normalizados 0–1.
const CANVAS_W = 800
const CANVAS_H = 450
const HANDLE_RADIUS = 6

interface SpaceRoi {
  points:    PointResponse[]
  monitored: boolean
  dirty:     boolean
}

const canvasRef  = ref<HTMLCanvasElement | null>(null)
const loading    = ref(true)
const saving     = ref(false)
const selectedId = ref<number | null>(null)
const rois       = reactive<Record<number, SpaceRoi>>({})
const feedback   = ref<{ ok: boolean; msg: string } | null>(null)
const hasImage   = ref(false)
// Giro (grados, sentido horario) de la imagen de referencia. Solo afecta al dibujo: los ROI se
// guardan normalizados sobre la imagen ya derecha, que es la que el Fog obtiene al girar cada foto.
const imageRotation = ref(0)

let bgImage: HTMLImageElement | null = null
let dragIndex = -1

const selectedRoi = computed(() =>
  selectedId.value !== null ? rois[selectedId.value] : null,
)

const dirtyCount = computed(() =>
  Object.values(rois).filter(r => r.dirty && r.points.length >= 3).length,
)

// ── Dibujo ──────────────────────────────────────────────────────────────────

function draw() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  if (bgImage) {
    drawBackground(ctx, bgImage)
  } else {
    ctx.fillStyle = '#f4f6f8'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.strokeStyle = '#e2e6ea'
    ctx.lineWidth = 1
    for (let x = 0; x <= CANVAS_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
    }
  }

  // Primero los polígonos NO seleccionados (atenuados), luego el seleccionado encima.
  for (const space of spacesStore.spaces) {
    if (space.id !== selectedId.value) drawPolygon(ctx, space.id, space.spaceNumber, false)
  }
  if (selectedId.value !== null) {
    const space = spacesStore.spaces.find(s => s.id === selectedId.value)
    if (space) drawPolygon(ctx, space.id, space.spaceNumber, true)
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const rot = imageRotation.value
  // Con 90° / 270° el ancho y el alto se intercambian para que la imagen girada siga llenando el canvas.
  const swapped = rot === 90 || rot === 270
  const w = swapped ? CANVAS_H : CANVAS_W
  const h = swapped ? CANVAS_W : CANVAS_H
  ctx.save()
  ctx.translate(CANVAS_W / 2, CANVAS_H / 2)
  ctx.rotate((rot * Math.PI) / 180)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)
  ctx.restore()
}

function rotateImage() {
  imageRotation.value = (imageRotation.value + 90) % 360
  draw()
}

function drawPolygon(ctx: CanvasRenderingContext2D, spaceId: number, label: string, selected: boolean) {
  const roi = rois[spaceId]
  if (!roi || roi.points.length === 0) return

  const px = roi.points.map(p => ({ x: p.x * CANVAS_W, y: p.y * CANVAS_H }))
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

watch([rois, selectedId], draw, { deep: true })

// ── Interacción ─────────────────────────────────────────────────────────────

function canvasPos(e: MouseEvent): PointResponse {
  const rect = canvasRef.value!.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }
}

function hitPoint(pos: PointResponse): number {
  const roi = selectedRoi.value
  if (!roi) return -1
  const threshold = HANDLE_RADIUS * 1.8
  return roi.points.findIndex(p => {
    const dx = (p.x - pos.x) * CANVAS_W
    const dy = (p.y - pos.y) * CANVAS_H
    return Math.hypot(dx, dy) <= threshold
  })
}

function onMouseDown(e: MouseEvent) {
  const roi = selectedRoi.value
  if (!roi) return
  const pos = canvasPos(e)
  const idx = hitPoint(pos)
  if (idx !== -1) {
    dragIndex = idx
  } else {
    roi.points.push(pos)
    roi.dirty = true
    dragIndex = roi.points.length - 1
  }
  feedback.value = null
}

function onMouseMove(e: MouseEvent) {
  const roi = selectedRoi.value
  if (dragIndex === -1 || !roi) return
  roi.points[dragIndex] = canvasPos(e)
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

// ── Imagen de referencia (solo local, para dibujar; no se persiste) ─────────

function onImageSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => { bgImage = img; hasImage.value = true; draw() }
    img.src = reader.result as string
  }
  reader.readAsDataURL(file)
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

  const toSave = spacesStore.spaces.filter(s => rois[s.id]?.dirty && rois[s.id].points.length >= 3)
  if (toSave.length === 0) {
    feedback.value = { ok: false, msg: 'No hay cambios que guardar' }
    return
  }

  saving.value = true
  let saved = 0
  for (const space of toSave) {
    const ok = await spacesStore.saveRoi(space.id, rois[space.id].points)
    if (ok) {
      rois[space.id].dirty = false
      rois[space.id].monitored = true
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
  if (!roi || selectedId.value === null || !roi.monitored) return
  const ok = await spacesStore.removeMonitoring(selectedId.value)
  if (ok) {
    roi.points = []
    roi.monitored = false
    roi.dirty = false
    feedback.value = { ok: true, msg: 'El espacio ya no se monitorea' }
  } else {
    feedback.value = { ok: false, msg: spacesStore.error ?? 'Error al quitar el monitoreo' }
  }
}

function tryClose() {
  emit('close')
}

onMounted(async () => {
  // Asegura los espacios de la zona (si se abrió sin pasar por el modal de espacios).
  if (spacesStore.spaces.length === 0 || spacesStore.spaces[0]?.zoneId !== props.zoneId) {
    await spacesStore.fetchByZone(props.zoneId)
  }
  // Carga los ROIs existentes de todos los espacios en paralelo (404 ⇒ sin ROI).
  await Promise.all(
    spacesStore.spaces.map(async s => {
      const roi = await spacesStore.fetchRoi(s.id)
      rois[s.id] = {
        points:    roi ?? [],
        monitored: roi !== null,
        dirty:     false,
      }
    }),
  )
  selectedId.value = spacesStore.spaces[0]?.id ?? null
  loading.value = false
  draw()
})
</script>

<template>
  <div class="overlay" @click.self="tryClose">
    <div class="modal roi-modal">
      <div class="roi-head">
        <div>
          <h2 class="modal-title">ROIs de {{ zoneName }}</h2>
          <p class="roi-sub">
            Sube un frame de la cámara como referencia, elige un espacio y dibuja su polígono con clics.
          </p>
        </div>
        <span v-if="dirtyCount > 0" class="badge dirty-badge">{{ dirtyCount }} sin guardar</span>
      </div>

      <div v-if="loading" class="roi-loading">Cargando ROIs de la zona...</div>

      <template v-else>
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
              <span
                class="roi-space-state"
                :class="{
                  dirty: rois[s.id]?.dirty,
                  on:  !rois[s.id]?.dirty && rois[s.id]?.monitored,
                  off: !rois[s.id]?.dirty && !rois[s.id]?.monitored,
                }"
              >
                {{ rois[s.id]?.dirty ? '● sin guardar' : (rois[s.id]?.monitored ? 'Monitoreado' : 'Sin ROI') }}
              </span>
            </button>
          </aside>

          <!-- Canvas -->
          <div class="roi-canvas-col">
            <canvas
              ref="canvasRef"
              class="roi-canvas"
              :width="CANVAS_W"
              :height="CANVAS_H"
              @mousedown="onMouseDown"
              @mousemove="onMouseMove"
              @mouseup="onMouseUp"
              @mouseleave="onMouseUp"
            />
            <div class="roi-toolbar">
              <label class="btn-ghost file-btn">
                {{ hasImage ? 'Cambiar imagen' : 'Subir preview de la cámara' }}
                <input type="file" accept="image/*" hidden @change="onImageSelected" />
              </label>
              <button
                class="btn-ghost"
                :disabled="!hasImage"
                title="Gira la imagen de referencia 90° en sentido horario"
                @click="rotateImage"
              >
                Girar 90°{{ imageRotation ? ` (${imageRotation}°)` : '' }}
              </button>
              <span class="roi-count">
                {{ selectedRoi ? `${selectedRoi.points.length} punto${selectedRoi.points.length !== 1 ? 's' : ''}` : '' }}
              </span>
              <div class="roi-tools">
                <button class="btn-ghost" :disabled="!selectedRoi || selectedRoi.points.length === 0" @click="undoPoint">Deshacer</button>
                <button class="btn-ghost" :disabled="!selectedRoi || selectedRoi.points.length === 0" @click="clearPoints">Limpiar</button>
                <button
                  class="btn-ghost danger"
                  :disabled="!selectedRoi?.monitored || spacesStore.saving"
                  @click="removeSelected"
                >
                  Quitar ROI
                </button>
              </div>
            </div>
          </div>
        </div>

        <p v-if="feedback" class="feedback" :class="feedback.ok ? 'ok' : 'err'">{{ feedback.msg }}</p>

        <div class="modal-actions">
          <button class="btn-ghost" @click="tryClose">Cerrar</button>
          <button class="btn-primary" :disabled="saving || dirtyCount === 0" @click="saveAll">
            {{ saving ? 'Guardando...' : `Guardar cambios${dirtyCount > 0 ? ` (${dirtyCount})` : ''}` }}
          </button>
        </div>
      </template>
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
.roi-space-state.off   { color: #aaa; }
.roi-space-state.dirty { color: #b26a00; }

/* Canvas */
.roi-canvas-col {
  flex: 1;
  min-width: 0;
}

.roi-canvas {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  cursor: crosshair;
  display: block;
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
