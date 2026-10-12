<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Info } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminFirmwareStore } from '../../application/admin-firmware.store'
import type { AdminCameraFirmware } from '../../domain/model/admin-firmware.model'
import { FIRMWARE_STATUS_META, minAssignableVersion } from '../../domain/camera-device'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminField from './AdminField.vue'
import AdminStateBox from './AdminStateBox.vue'
import FirmwareStatusBadge from './FirmwareStatusBadge.vue'

/**
 * CameraFirmwarePanel — versión asignada frente a la informada, y asignar o quitar versión. Las
 * versiones menores que la asignada o la informada salen deshabilitadas: es la regla del backend
 * (no se baja de versión).
 */
const props = defineProps<{ cameraId: number }>()

const camerasStore  = useAdminCamerasStore()
const firmwareStore = useAdminFirmwareStore()

const camera   = computed(() => camerasStore.cameras.find(c => c.id === props.cameraId) ?? null)
const detail   = ref<AdminCameraFirmware | null>(null)
const loading  = ref(false)
const selected = ref<number | ''>('')
const error    = ref<string | null>(null)
const confirmClear = ref(false)

const minimum = computed(() => {
  const fw = camera.value?.firmware
  return fw ? minAssignableVersion(fw.target, fw.reported) : 0
})

const canAssign = computed(() =>
  selected.value !== '' && selected.value >= minimum.value && selected.value !== camera.value?.firmware.target)

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

async function load() {
  loading.value = true
  error.value   = null
  const [fw] = await Promise.all([
    camerasStore.fetchCameraFirmware(props.cameraId),
    firmwareStore.releases.length ? Promise.resolve() : firmwareStore.fetchReleases(),
  ])
  detail.value  = fw
  loading.value = false
  // Por defecto, la más alta que se pueda asignar y aún no esté asignada.
  const best = firmwareStore.releases.find(r => r.version >= minimum.value && r.version !== camera.value?.firmware.target)
  selected.value = best?.version ?? ''
}

watch(() => props.cameraId, load, { immediate: true })

async function assign() {
  if (selected.value === '') return
  error.value = null
  const fw = await camerasStore.assignFirmware(props.cameraId, selected.value)
  if (!fw) {
    error.value = camerasStore.actionError
    return
  }
  detail.value = fw
  toast.success(`v${fw.target} asignada a ${camera.value?.code}`)
}

async function clear() {
  error.value = null
  if (await camerasStore.clearFirmware(props.cameraId)) {
    confirmClear.value = false
    detail.value = { ...(detail.value as AdminCameraFirmware), target: null, assignedAt: null, status: 'NOT_MANAGED' }
    toast.success('Versión asignada retirada')
  } else {
    confirmClear.value = false
    error.value = camerasStore.actionError
  }
}
</script>

<template>
  <div v-if="camera" class="grid gap-4">
    <AdminStateBox v-if="loading">Cargando firmware...</AdminStateBox>
    <AdminStateBox v-else-if="firmwareStore.error" tone="error">{{ firmwareStore.error }}</AdminStateBox>

    <template v-else>
      <div class="grid gap-1.5 rounded-lg border bg-muted/30 px-4 py-3 text-[13px]">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-muted-foreground">Estado</span>
          <FirmwareStatusBadge :status="camera.firmware.status" :target="camera.firmware.target" :reported="camera.firmware.reported" />
        </div>
        <p>
          Informa <strong class="font-mono">{{ camera.firmware.reported !== null ? `v${camera.firmware.reported}` : '—' }}</strong>
          · asignada <strong class="font-mono">{{ camera.firmware.target !== null ? `v${camera.firmware.target}` : '—' }}</strong>
        </p>
        <p class="text-[12px] text-muted-foreground">
          Asignada {{ formatDate(detail?.assignedAt ?? null) }} · último informe {{ formatDate(camera.firmware.reportedAt) }}
        </p>
        <p class="text-[12px] text-muted-foreground">{{ FIRMWARE_STATUS_META[camera.firmware.status].help }}</p>
      </div>

      <p v-if="firmwareStore.releases.length === 0" class="text-[13px] text-muted-foreground">
        Aún no hay firmware publicado.
        <RouterLink to="/admin/firmware" class="font-semibold text-link underline-offset-4 hover:underline">Publicar una versión</RouterLink>
      </p>

      <form v-else class="grid gap-3" @submit.prevent="assign">
        <AdminField v-slot="{ id }" label="Asignar versión">
          <div class="flex gap-2">
            <NativeSelect :id="id" v-model="selected">
              <NativeSelectOption value="" disabled>Elige una versión</NativeSelectOption>
              <NativeSelectOption
                v-for="r in firmwareStore.releases"
                :key="r.id"
                :value="r.version"
                :disabled="r.version < minimum"
              >
                v{{ r.version }} — {{ formatDate(r.createdAt) }}{{ r.notes ? ` · ${r.notes.slice(0, 40)}` : '' }}{{ r.version < minimum ? ' (menor que la actual)' : '' }}{{ r.version === camera.firmware.target ? ' (asignada)' : '' }}
              </NativeSelectOption>
            </NativeSelect>
            <Button type="submit" :disabled="!canAssign || camerasStore.saving">Asignar</Button>
          </div>
        </AdminField>
        <p class="flex gap-2 text-[12px] text-muted-foreground">
          <Info class="mt-px size-4 shrink-0" />
          <span>
            No se puede bajar de versión: el cliente OTA de la placa solo instala versiones mayores. Para corregir
            una versión mala, publica otra con número mayor. El Fog ya descarga la versión asignada; la placa la
            instalará cuando lleve el firmware con cliente OTA.
          </span>
        </p>
      </form>

      <FormAlert :message="error" />

      <div v-if="camera.firmware.target !== null" class="flex justify-end">
        <Button variant="outline-destructive" :disabled="camerasStore.saving" @click="confirmClear = true">
          Quitar versión asignada
        </Button>
      </div>
    </template>

    <ConfirmDialog
      :open="confirmClear"
      title="Quitar versión asignada"
      confirm-label="Quitar"
      destructive
      :loading="camerasStore.saving"
      @cancel="confirmClear = false"
      @confirm="clear"
    >
      {{ camera.code }} dejará de recibir actualizaciones. No se desinstala nada: seguirá con la versión que tenga.
    </ConfirmDialog>
  </div>
</template>
