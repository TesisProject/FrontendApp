<script setup lang="ts">
import { ref, reactive, computed, shallowRef, onMounted, watch } from 'vue'
import { useAdminSpacesStore } from '../../application/admin-spaces.store'
import type { AdminCamera } from '../../domain/model/admin-camera.model'
import type { PointResponse } from '../../infrastructure/admin-response'
import { CircleAlert, CircleCheck, ImageUp, RotateCw, Undo2 } from '@lucide/vue'
import { Alert, AlertDescription } from '@/app/shared/presentation/components/ui/alert'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import AdminStateBox from './AdminStateBox.vue'

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
 * ROI de un espacio. `points` está en coordenadas normalizadas 0–1 de la foto YA girada de su cámara,
 * tal como se dibuja en el canvas: el Fog gira cada frame según `rotation` y después aplica el ROI.
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

  const px = roi.points.map(p => ({ x: p.x * CANVAS_W, y: p.y * canvasH.value }))
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
  return roi.points.findIndex(p =>
    Math.hypot((p.x - pos.x) * CANVAS_W, (p.y - pos.y) * canvasH.value) <= threshold,
  )
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

// Giro de la foto (grados, sentido horario), p. ej. para enderezar una imagen de referencia subida a
// mano. El ROI se dibuja sobre la foto tal como se ve, así que tiene que quedar derecha como la ve el
// Fog; los polígonos ya dibujados no se giran con ella.
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

// Selectable tiles (camera tabs + space list).
const optionClass = 'flex rounded-lg border-[1.5px] border-border bg-[#fafbfc] text-left transition-colors hover:bg-[#f0f5fa] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none'

const stateClass: Record<string, string> = {
  on:    'text-success',
  other: 'text-[#1a56c4]',
  off:   'text-muted-foreground',
  dirty: 'text-warning',
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
  <Dialog :open="true" @update:open="(v: boolean) => !v && tryClose()">
    <DialogContent class="max-h-[92vh] sm:max-w-[1000px]">
      <DialogHeader class="flex-row items-start justify-between gap-3">
        <div class="grid gap-1">
          <DialogTitle>ROIs de {{ zoneName }}</DialogTitle>
          <DialogDescription class="text-xs">
            Elige la cámara que cubre el espacio, selecciona el espacio y dibuja su polígono con clics sobre la foto.
          </DialogDescription>
        </div>
        <Badge v-if="dirtyCount > 0" variant="warning" size="status" class="mr-8">{{ dirtyCount }} sin guardar</Badge>
      </DialogHeader>

      <AdminStateBox v-if="loading">Cargando ROIs de la zona...</AdminStateBox>

      <AdminStateBox v-else-if="loadError" tone="error">{{ loadError }}</AdminStateBox>

      <p v-else-if="cameras.length === 0" class="py-20 text-center text-[13px] text-muted-foreground">
        Esta zona no tiene cámaras. Registra una en <strong>Cámaras</strong> para poder dibujar sus ROIs.
      </p>

      <template v-else>
        <!-- Cámaras de la zona -->
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Cámara">
          <button
            v-for="c in cameras"
            :key="c.id"
            type="button"
            :aria-pressed="c.id === cameraId"
            :class="[optionClass, c.id === cameraId ? 'border-[#1a56c4] bg-[#eef3fc]' : '']"
            class="flex-row items-baseline gap-1.5 px-3 py-1.5"
            @click="selectCamera(c.id)"
          >
            <span class="font-mono text-[12.5px] font-bold text-navy">{{ c.code }}</span>
            <span v-if="c.name !== c.code" class="text-xs text-muted-foreground">{{ c.name }}</span>
            <span class="text-[10.5px] text-muted-foreground">{{ spacesCoveredBy(c.id) }} esp.</span>
          </button>
        </div>

        <div class="flex items-stretch gap-3.5">
          <!-- Lista de espacios -->
          <div
            class="flex max-h-[480px] w-[180px] shrink-0 flex-col gap-1 overflow-y-auto [scrollbar-width:thin]"
            role="listbox"
            aria-label="Espacios"
          >
            <button
              v-for="s in spacesStore.spaces"
              :key="s.id"
              type="button"
              role="option"
              :aria-selected="s.id === selectedId"
              :class="[optionClass, s.id === selectedId ? 'border-zone-libre bg-[#f0faf4]' : '']"
              class="flex-col items-start gap-0.5 px-2.5 py-2"
              @click="selectedId = s.id"
            >
              <span class="font-mono text-[13px] font-bold text-navy">{{ s.spaceNumber }}</span>
              <span class="text-[10.5px] font-semibold" :class="stateClass[spaceState(s.id).cls]">
                {{ spaceState(s.id).label }}
              </span>
            </button>
          </div>

          <!-- Canvas -->
          <div class="min-w-0 flex-1">
            <p v-if="selectedInOtherCamera" class="mb-2 rounded-lg bg-[#eef3fc] px-2.5 py-1.5 text-xs text-[#1a56c4]">
              Este espacio lo cubre {{ cameraLabel(selectedRoi!.cameraId) }}. Si dibujas aquí, al guardar
              pasará a {{ cameraLabel(cameraId) }}.
            </p>
            <canvas
              ref="canvasRef"
              class="mx-auto block max-h-[60vh] max-w-full cursor-crosshair rounded-[10px] border-[1.5px]"
              :class="{ 'opacity-50': bgLoading }"
              :width="CANVAS_W"
              :height="canvasH"
              @mousedown="onMouseDown"
              @mousemove="onMouseMove"
              @mouseup="onMouseUp"
              @mouseleave="onMouseUp"
            />
            <p class="mt-1.5 text-center text-[11.5px] text-muted-foreground">
              <template v-if="bgLoading">Cargando foto de la cámara...</template>
              <template v-else-if="background?.capturedAt">
                Última foto de la cámara · {{ formatCapturedAt(background.capturedAt) }}
              </template>
              <template v-else-if="background?.image">Imagen de referencia propia</template>
              <template v-else>La cámara aún no subió fotos: sube una imagen de referencia.</template>
            </p>
            <div class="mt-2.5 flex flex-wrap items-center gap-2.5">
              <Button as="label" variant="outline" size="sm" class="cursor-pointer text-xs">
                <ImageUp />
                {{ background?.image ? 'Usar otra imagen' : 'Subir imagen de referencia' }}
                <input type="file" accept="image/*" hidden @change="onImageSelected" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="text-xs"
                :disabled="!background?.image"
                title="Gira la foto 90° en sentido horario: el ROI se dibuja sobre la foto derecha"
                @click="rotateImage"
              >
                <RotateCw /> Girar 90°{{ rotation ? ` (${rotation}°)` : '' }}
              </Button>
              <span class="flex-1 text-center text-xs text-muted-foreground">
                {{ selectedRoi && !selectedInOtherCamera
                  ? `${selectedRoi.points.length} punto${selectedRoi.points.length !== 1 ? 's' : ''}`
                  : '' }}
              </span>
              <div class="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  class="text-xs"
                  :disabled="!selectedRoi || selectedInOtherCamera || selectedRoi.points.length === 0"
                  @click="undoPoint"
                ><Undo2 /> Deshacer</Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="text-xs"
                  :disabled="!selectedRoi || selectedInOtherCamera || selectedRoi.points.length === 0"
                  @click="clearPoints"
                >Limpiar</Button>
                <Button variant="outline" size="sm" class="text-xs" :disabled="!selectedRoi?.dirty" @click="discardSelected">
                  Descartar
                </Button>
                <Button
                  variant="outline-destructive"
                  size="sm"
                  class="text-xs"
                  :disabled="!selectedRoi?.saved || spacesStore.saving"
                  @click="removeSelected"
                >
                  Quitar ROI
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Alert v-if="feedback" :variant="feedback.ok ? 'success' : 'destructive'" class="py-2">
          <CircleCheck v-if="feedback.ok" />
          <CircleAlert v-else />
          <AlertDescription class="text-[13px] text-current">{{ feedback.msg }}</AlertDescription>
        </Alert>
      </template>

      <DialogFooter>
        <Button variant="outline" @click="tryClose">Cerrar</Button>
        <Button
          v-if="!loading && !loadError && cameras.length > 0"
          :disabled="saving || dirtyCount === 0"
          @click="saveAll"
        >
          {{ saving ? 'Guardando...' : `Guardar cambios${dirtyCount > 0 ? ` (${dirtyCount})` : ''}` }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
