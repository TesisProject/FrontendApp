<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, Copy, Info, Upload } from '@lucide/vue'
import { useAdminFirmwareStore } from '../../application/admin-firmware.store'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { otaSlotPercent } from '../../domain/firmware-image'
import { minAssignableVersion } from '../../domain/camera-device'
import type { AdminCamera } from '../../domain/model/admin-camera.model'
import { toast } from 'vue-sonner'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import FirmwareStatusBadge from '../components/FirmwareStatusBadge.vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import AdminPage from '../components/AdminPage.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'
import FirmwareUploadDialog from '../components/FirmwareUploadDialog.vue'

const store        = useAdminFirmwareStore()
const camerasStore = useAdminCamerasStore()

const showUpload = ref(false)
const copiedSha  = ref<string | null>(null)

const subtitle = computed(() =>
  `${store.releases.length} versiones · placa esp32cam-aithinker · firmadas por la nube`)

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

function formatSize(bytes: number) {
  return `${(bytes / 1_048_576).toLocaleString('es-PE', { maximumFractionDigits: 2 })} MB`
}

function shortSha(sha: string) {
  return `${sha.slice(0, 8)}…${sha.slice(-4)}`
}

async function copySha(sha: string) {
  await navigator.clipboard.writeText(sha)
  copiedSha.value = sha
}

/** Cámaras que tienen la versión asignada y cuántas la informan (instalada). */
function usage(version: number) {
  const cams = camerasStore.cameras
  return {
    assigned:  cams.filter(c => c.firmware.target === version).length,
    installed: cams.filter(c => c.firmware.reported === version).length,
  }
}

// ── Despliegue por cámara: atajo para asignar la última versión, una cámara cada vez ──
const rolloutError = ref<string | null>(null)
const assigningId  = ref<number | null>(null)

/** Motivo por el que no se puede asignar la última versión a la cámara, o null si se puede. */
function assignBlocker(c: AdminCamera): string | null {
  const latest = store.latestVersion
  if (latest === null) return 'No hay versiones publicadas'
  if (c.firmware.target === latest) return 'Ya la tiene asignada'
  if (latest < minAssignableVersion(c.firmware.target, c.firmware.reported)) return 'Tiene una versión mayor'
  return null
}

async function assignLatest(c: AdminCamera) {
  if (store.latestVersion === null) return
  rolloutError.value = null
  assigningId.value  = c.id
  const fw = await camerasStore.assignFirmware(c.id, store.latestVersion)
  assigningId.value  = null
  if (fw) toast.success(`v${fw.target} asignada a ${c.code}`)
  else rolloutError.value = `${c.code}: ${camerasStore.actionError}`
}

onMounted(() => Promise.all([store.fetchReleases(), camerasStore.fetchCameras()]))
</script>

<template>
  <AdminPage title="Firmware" :sub="subtitle">
    <template #actions>
      <Button @click="showUpload = true"><Upload /> Publicar versión</Button>
    </template>

    <p class="mb-4 flex gap-2 rounded-xl border bg-card px-4 py-3 text-[13px] text-muted-foreground">
      <Info class="mt-0.5 size-4 shrink-0 text-[#1a56c4] dark:text-[#93c5fd]" />
      <span>
        El Fog ya descarga y guarda la versión asignada a cada cámara; las placas la instalarán cuando lleven el
        firmware con cliente OTA. No se puede bajar de versión: para corregir una versión mala, publica otra mayor.
      </span>
    </p>

    <AdminStateBox v-if="store.loading">Cargando versiones...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['Versión', 'Publicada', 'Tamaño', 'SHA-256', 'Cámaras', 'Notas']"
      :empty="store.releases.length === 0"
      empty-text="Aún no hay versiones publicadas. Sube el .bin de la aplicación compilado con arduino-cli."
    >
      <TableRow v-for="r in store.releases" :key="r.id">
        <TableCell class="font-mono text-sm font-semibold text-navy">v{{ r.version }}</TableCell>
        <TableCell class="text-xs text-muted-foreground">{{ formatDate(r.createdAt) }}</TableCell>
        <TableCell class="text-xs">
          {{ formatSize(r.size) }} <span class="text-muted-foreground">({{ otaSlotPercent(r.size) }} %)</span>
        </TableCell>
        <TableCell>
          <div class="flex items-center gap-1.5">
            <code class="font-mono text-xs" :title="`${r.sha256}\nClave de firma: ${r.signingKeyId}`">{{ shortSha(r.sha256) }}</code>
            <Button
              size="icon-xs"
              variant="ghost"
              :aria-label="`Copiar SHA-256 de v${r.version}`"
              @click="copySha(r.sha256)"
            >
              <Check v-if="copiedSha === r.sha256" /><Copy v-else />
            </Button>
          </div>
        </TableCell>
        <TableCell class="text-xs">
          {{ usage(r.version).assigned }} asig. · {{ usage(r.version).installed }} inst.
        </TableCell>
        <TableCell class="max-w-[220px] truncate text-xs text-muted-foreground" :title="r.notes ?? undefined">
          {{ r.notes ?? '—' }}
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <section v-if="!store.loading && !store.error && store.releases.length > 0" class="mt-6" aria-labelledby="rollout-title">
      <h2 id="rollout-title" class="mb-1 text-[15px] font-bold text-heading">Despliegue por cámara</h2>
      <p class="mb-3 text-[13px] text-muted-foreground">
        Despliega primero en una cámara y, cuando informe la versión nueva, en las demás.
      </p>
      <AdminStateBox v-if="camerasStore.loading">Cargando cámaras...</AdminStateBox>
      <AdminStateBox v-else-if="camerasStore.error" tone="error">{{ camerasStore.error }}</AdminStateBox>
      <AdminTableCard
        v-else
        :columns="['Cámara', 'Informa', 'Asignada', 'Estado', 'Acción']"
        :empty="camerasStore.cameras.length === 0"
        empty-text="No hay cámaras registradas"
      >
        <TableRow v-for="c in camerasStore.cameras" :key="c.id">
          <TableCell>
            <span class="font-mono text-xs font-semibold text-navy">{{ c.code }}</span>
            <span class="ml-1.5 text-muted-foreground">{{ c.name }}</span>
          </TableCell>
          <TableCell class="font-mono text-xs">{{ c.firmware.reported !== null ? `v${c.firmware.reported}` : '—' }}</TableCell>
          <TableCell class="font-mono text-xs">{{ c.firmware.target !== null ? `v${c.firmware.target}` : '—' }}</TableCell>
          <TableCell>
            <FirmwareStatusBadge :status="c.firmware.status" :target="c.firmware.target" :reported="c.firmware.reported" />
          </TableCell>
          <TableCell>
            <Button
              size="sm"
              variant="outline-primary"
              :disabled="!!assignBlocker(c) || camerasStore.saving"
              :title="assignBlocker(c) ?? undefined"
              @click="assignLatest(c)"
            >
              {{ assigningId === c.id ? 'Asignando...' : `Asignar v${store.latestVersion}` }}
            </Button>
          </TableCell>
        </TableRow>
      </AdminTableCard>
      <FormAlert class="mt-3" :message="rolloutError" />
    </section>

    <FirmwareUploadDialog v-model:open="showUpload" />
  </AdminPage>
</template>
