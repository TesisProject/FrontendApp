<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Info, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminZonesStore } from '../../application/admin-zones.store'
import { useAdminNodesStore } from '../../application/admin-nodes.store'
import type { AdminCamera, AdminCameraDeviceForm, AdminCameraForm } from '../../domain/model/admin-camera.model'
import { batteryBadge, deviceFieldErrors, hasDeviceErrors, normalizeMac, sameCapture } from '../../domain/camera-device'
import { formatRelative } from '@/app/shared/helpers/date'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Label } from '@/app/shared/presentation/components/ui/label'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/app/shared/presentation/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/shared/presentation/components/ui/tabs'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminField from './AdminField.vue'
import CameraDeviceFields from './CameraDeviceFields.vue'
import CameraFirmwarePanel from './CameraFirmwarePanel.vue'
import BatteryMeter from './BatteryMeter.vue'

/**
 * CameraDetailSheet — configuración de una cámara en pestañas. Cada pestaña guarda por separado
 * porque son endpoints distintos: General = PUT /cameras/{id}; Dispositivo = PUT device-settings
 * (reemplaza los tres datos); Firmware = PUT/DELETE firmware/target; Alta = DELETE enrollment.
 */
const props = defineProps<{ cameraId: number | null }>()
const open  = defineModel<boolean>('open', { required: true })

const store      = useAdminCamerasStore()
const zonesStore = useAdminZonesStore()
const nodesStore = useAdminNodesStore()

// Se lee del store para ver siempre la versión guardada más reciente.
const camera = computed<AdminCamera | null>(() => store.cameras.find(c => c.id === props.cameraId) ?? null)

const tab = ref('general')

// ── Batería (solo lectura: viene con la cámara) ──────────────────────────
const battery      = computed(() => camera.value?.battery ?? null)
const batteryState = computed(() => battery.value ? batteryBadge(battery.value) : null)

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

// ── General ──────────────────────────────────────────────────────────────
const generalForm  = ref<AdminCameraForm>({ zoneId: '', nodeId: '', name: '', location: '', active: true })
const generalError = ref<string | null>(null)

function generalOf(c: AdminCamera): AdminCameraForm {
  return { zoneId: c.zoneId, nodeId: c.nodeId ?? '', name: c.name, location: c.location, active: c.active }
}

async function saveGeneral() {
  const c = camera.value
  if (!c) return
  generalError.value = null
  if (!(await store.updateCamera(c.id, generalForm.value))) {
    generalError.value = store.actionError
    return
  }
  toast.success('Cámara actualizada')
}

// ── Dispositivo ──────────────────────────────────────────────────────────
const deviceForm   = ref<AdminCameraDeviceForm>({ mac: '', rotation: 0, capture: { intervalSec: 300, framesize: 'SVGA', jpegQuality: 12 } })
const deviceError  = ref<string | null>(null)
const deviceTried  = ref(false)
const checkingRoi  = ref(false)
/** Avisos pendientes de confirmar antes de guardar el dispositivo. */
const deviceWarnings = ref<string[]>([])

function deviceOf(c: AdminCamera): AdminCameraDeviceForm {
  return { mac: c.mac ?? '', rotation: c.rotation, capture: { ...c.capture } }
}

const deviceDirty = computed(() => {
  const c = camera.value
  if (!c) return false
  const f = deviceForm.value
  return (normalizeMac(f.mac) ?? f.mac.trim()) !== (c.mac ?? '')
    || f.rotation !== c.rotation
    || !sameCapture(f.capture, c.capture)
})

async function saveDevice() {
  const c = camera.value
  if (!c) return
  deviceTried.value = true
  deviceError.value = null
  const errors = deviceFieldErrors(deviceForm.value.mac, deviceForm.value.capture, c.mac !== null)
  if (hasDeviceErrors(errors)) {
    deviceError.value = 'Revisa los campos marcados'
    return
  }

  const warnings: string[] = []
  const newMac = normalizeMac(deviceForm.value.mac)
  // La primera MAC de una cámara antigua no reinicia el alta; cambiar una existente sí.
  if (c.mac !== null && newMac !== c.mac) {
    warnings.push(
      `Vas a cambiar la MAC de ${c.code} de ${c.mac} a ${newMac}. Esto reinicia el alta: en su siguiente ` +
      'sincronización, el Fog revoca la credencial de la placa anterior, que dejará de poder subir fotos. ' +
      'Hazlo solo si has sustituido la placa y la nueva lleva el firmware con alta por MAC.',
    )
  }
  if (deviceForm.value.rotation !== c.rotation) {
    checkingRoi.value = true
    const spaces = await store.countRoiSpaces(c.id)
    checkingRoi.value = false
    if (spaces === null || spaces > 0) {
      const what = spaces === null ? 'Puede que esta cámara tenga espacios' : `${c.code} tiene ${spaces} espacio${spaces === 1 ? '' : 's'}`
      warnings.push(
        `${what} con ROI dibujado sobre la foto girada ${c.rotation}°. Al cambiar a ${deviceForm.value.rotation}°, ` +
        'los polígonos dejan de coincidir con lo que ve la cámara y la detección será errónea hasta que los ' +
        'vuelvas a dibujar en Zonas → ROI. El Fog aplica la rotación nueva en su siguiente sincronización; ' +
        'el editor de ROI mostrará el giro nuevo cuando llegue la siguiente foto.',
      )
    }
  }
  if (warnings.length) {
    deviceWarnings.value = warnings
    return
  }
  await commitDevice()
}

async function commitDevice() {
  const c = camera.value
  deviceWarnings.value = []
  if (!c) return
  if (!(await store.updateDeviceSettings(c.id, deviceForm.value))) {
    deviceError.value = store.actionError
    return
  }
  deviceTried.value = false
  // Muestra lo guardado (p. ej. la MAC ya normalizada).
  if (camera.value) deviceForm.value = deviceOf(camera.value)
  toast.success('Configuración del dispositivo guardada')
}

// ── Alta ─────────────────────────────────────────────────────────────────
const showReset    = ref(false)
const resetCode    = ref('')
const resetError   = ref<string | null>(null)

function openReset() {
  resetCode.value  = ''
  resetError.value = null
  showReset.value  = true
}

async function confirmReset() {
  const c = camera.value
  if (!c) return
  if (await store.resetEnrollment(c.id)) {
    showReset.value = false
    toast.success(`Alta de ${c.code} reiniciada`)
  } else {
    resetError.value = store.actionError
  }
}

// ── Apertura ─────────────────────────────────────────────────────────────
function resetForms(c: AdminCamera) {
  generalForm.value  = generalOf(c)
  deviceForm.value   = deviceOf(c)
  generalError.value = null
  deviceError.value  = null
  deviceTried.value  = false
}

watch([open, () => props.cameraId], ([isOpen]) => {
  const c = camera.value
  if (!isOpen || !c) return
  tab.value = 'general'
  resetForms(c)
})
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent class="w-full gap-0 overflow-y-auto sm:max-w-[560px]">
      <SheetHeader class="border-b px-6 py-5">
        <SheetTitle class="font-signage text-[22px] text-navy">
          <span class="font-mono">{{ camera?.code }}</span> · {{ camera?.name }}
        </SheetTitle>
        <SheetDescription>Configuración de la cámara y de su placa ESP32-CAM.</SheetDescription>
      </SheetHeader>

      <div v-if="camera" class="px-6 py-5">
        <section aria-labelledby="camera-battery-title" class="mb-5 rounded-xl border bg-card px-4 py-3.5">
          <h3 id="camera-battery-title" class="mb-2 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">Batería</h3>
          <template v-if="battery && batteryState">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <BatteryMeter :battery="battery" size="lg" />
              <span class="font-signage text-[28px] leading-none font-semibold tabular-nums" :class="battery.stale ? 'text-muted-foreground' : 'text-navy'">
                {{ battery.percent }} %
              </span>
              <span class="font-mono text-sm text-muted-foreground">{{ battery.mv }} mV</span>
              <Badge :variant="batteryState.variant" size="status">{{ batteryState.label }}</Badge>
            </div>
            <p class="mt-2 text-[12px] text-muted-foreground">
              {{ batteryState.help }} Lectura {{ formatRelative(battery.capturedAt) }}
              ({{ formatDateTime(battery.capturedAt) }}).
            </p>
            <p class="mt-1 text-[11px] text-muted-foreground">
              El % es orientativo (±3–5 puntos entre 3650 y 3850 mV, donde la curva es plana): la medida son los mV.
            </p>
          </template>
          <p v-else class="text-[12px] text-muted-foreground">
            Sin lectura: la placa nunca envió una válida (sin celda o sin el divisor a GPIO13).
          </p>
        </section>

        <Tabs v-model="tab" class="gap-5">
          <TabsList aria-label="Secciones de la cámara" class="w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="device">Dispositivo</TabsTrigger>
            <TabsTrigger value="firmware">Firmware</TabsTrigger>
            <TabsTrigger value="enrollment">Alta</TabsTrigger>
          </TabsList>

          <!-- General -->
          <TabsContent value="general">
            <form class="grid gap-3.5" @submit.prevent="saveGeneral">
              <AdminField v-slot="{ id }" label="Zona" required>
                <NativeSelect :id="id" v-model="generalForm.zoneId">
                  <NativeSelectOption v-for="z in zonesStore.zones" :key="z.id" :value="z.id">{{ z.name }}</NativeSelectOption>
                </NativeSelect>
              </AdminField>
              <AdminField v-slot="{ id }" label="Nombre" optional>
                <Input :id="id" v-model="generalForm.name" maxlength="200" />
              </AdminField>
              <AdminField v-slot="{ id }" label="Ubicación" optional>
                <Input :id="id" v-model="generalForm.location" maxlength="300" />
              </AdminField>
              <AdminField v-slot="{ id }" label="Nodo Fog" optional>
                <NativeSelect :id="id" v-model="generalForm.nodeId">
                  <NativeSelectOption value="">Sin nodo</NativeSelectOption>
                  <NativeSelectOption v-for="n in nodesStore.nodes" :key="n.id" :value="n.id">{{ n.name }} ({{ n.code }})</NativeSelectOption>
                </NativeSelect>
              </AdminField>
              <div class="flex items-center gap-2.5">
                <Switch id="camera-detail-active" v-model="generalForm.active" />
                <Label for="camera-detail-active">Cámara activa</Label>
              </div>
              <FormAlert :message="generalError" />
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" @click="generalForm = generalOf(camera)">Descartar</Button>
                <Button type="submit" :disabled="store.saving">
                  {{ store.saving ? 'Guardando...' : 'Guardar' }}
                </Button>
              </div>
            </form>
          </TabsContent>

          <!-- Dispositivo -->
          <TabsContent value="device">
            <form class="grid gap-4" @submit.prevent="saveDevice">
              <CameraDeviceFields
                v-model="deviceForm"
                :mac-required="camera.mac !== null"
                :camera-id="camera.id"
                :show-errors="deviceTried"
              />
              <p class="flex gap-2 rounded-lg bg-navy-soft px-3 py-2 text-[12px] text-foreground">
                <Info class="mt-px size-4 shrink-0 text-[#1a56c4] dark:text-[#93c5fd]" />
                <span>
                  Los cambios se aplican en la Pi en su siguiente sincronización. La captura llegará a la placa
                  cuando lleve el firmware que lee su configuración del Fog (cada 12 capturas). La WiFi no se
                  configura aquí: se graba en la placa por USB.
                </span>
              </p>
              <FormAlert :message="deviceError" />
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" :disabled="!deviceDirty" @click="deviceForm = deviceOf(camera)">Descartar</Button>
                <Button type="submit" :disabled="store.saving || checkingRoi || !deviceDirty">
                  {{ checkingRoi ? 'Comprobando ROI...' : store.saving ? 'Guardando...' : 'Guardar' }}
                </Button>
              </div>
            </form>
          </TabsContent>

          <!-- Firmware (se monta al abrir la pestaña: solo entonces pide su estado y las versiones) -->
          <TabsContent value="firmware">
            <CameraFirmwarePanel v-if="tab === 'firmware'" :camera-id="camera.id" />
          </TabsContent>

          <!-- Alta -->
          <TabsContent value="enrollment">
            <div class="grid gap-4">
              <p class="text-[13px]">
                Generación de alta: <strong class="font-mono">{{ camera.enrollmentGeneration }}</strong>
              </p>
              <p class="text-[13px] text-muted-foreground">
                Reiniciar el alta hace que el Fog revoque la credencial de esta placa y vuelva a admitir su alta
                por MAC. Úsalo cuando cambies la placa por otra con la misma MAC registrada, o si su credencial
                se perdió.
              </p>
              <p class="flex gap-2 rounded-lg border border-destructive/25 bg-destructive-soft px-3 py-2 text-[12px] text-destructive">
                <TriangleAlert class="mt-px size-4 shrink-0" />
                <span>
                  Solo si la placa ya lleva el firmware con alta por MAC. Con el firmware anterior (credencial
                  compilada) se queda sin credencial (401) hasta que la reflashees por USB. Nunca antes de flashear.
                </span>
              </p>
              <div class="flex justify-end">
                <Button variant="outline-destructive" :disabled="store.saving" @click="openReset">Reiniciar alta…</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SheetContent>
  </Sheet>

  <ConfirmDialog
    :open="deviceWarnings.length > 0"
    title="Confirmar cambios del dispositivo"
    confirm-label="Guardar de todos modos"
    destructive
    :loading="store.saving"
    @cancel="deviceWarnings = []"
    @confirm="commitDevice"
  >
    <span v-for="(w, i) in deviceWarnings" :key="i" class="mb-2 block last:mb-0">{{ w }}</span>
  </ConfirmDialog>

  <ConfirmDialog
    :open="showReset"
    :title="`Reiniciar el alta de ${camera?.code ?? ''}`"
    confirm-label="Reiniciar alta"
    destructive
    :loading="store.saving"
    :error="resetError"
    :confirm-disabled="resetCode.trim().toUpperCase() !== camera?.code"
    @cancel="showReset = false"
    @confirm="confirmReset"
  >
    El Fog revocará la credencial actual de la placa en su siguiente sincronización. Si la placa no lleva el
    firmware con alta por MAC, dejará de subir fotos hasta reflashearla por USB.
    <template #extra>
      <div class="grid gap-1.5">
        <Label for="reset-code" class="text-[12px]">Escribe <strong class="font-mono">{{ camera?.code }}</strong> para confirmar</Label>
        <Input id="reset-code" v-model="resetCode" class="font-mono" autocomplete="off" spellcheck="false" />
      </div>
    </template>
  </ConfirmDialog>
</template>
