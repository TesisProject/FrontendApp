<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminZonesStore }   from '../../application/admin-zones.store'
import { useAdminNodesStore }   from '../../application/admin-nodes.store'
import type { AdminCameraCreateForm } from '../../domain/model/admin-camera.model'
import { CAPTURE_DEFAULTS, deviceFieldErrors, hasDeviceErrors, normalizeMac } from '../../domain/camera-device'
import { Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminPage from '../components/AdminPage.vue'
import AdminSearch from '../components/AdminSearch.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'
import AdminField from '../components/AdminField.vue'
import CameraDeviceFields from '../components/CameraDeviceFields.vue'
import CameraDetailSheet from '../components/CameraDetailSheet.vue'
import FirmwareStatusBadge from '../components/FirmwareStatusBadge.vue'

const store      = useAdminCamerasStore()
const zonesStore = useAdminZonesStore()
const nodesStore = useAdminNodesStore()
const search     = ref('')

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  // La MAC se compara normalizada: así encuentra "246f28abcdef" o "24-6f-…".
  const mac = normalizeMac(search.value)
  return store.cameras.filter(c =>
    c.name.toLowerCase().includes(term) ||
    c.code.toLowerCase().includes(term) ||
    (c.mac !== null && (c.mac.toLowerCase().includes(term) || c.mac === mac))
  )
})

const withoutMac = computed(() => store.cameras.filter(c => c.mac === null).length)
const subtitle   = computed(() => {
  const base = `${store.cameras.length} cámaras registradas`
  return withoutMac.value ? `${base} · ${withoutMac.value} sin MAC` : base
})

function zoneName(zoneId: number) {
  return zonesStore.zones.find(z => z.id === zoneId)?.name ?? `Zona ${zoneId}`
}

// ── Alta ────────────────────────────────────────────────────────────────
function emptyForm(zoneId: number | ''): AdminCameraCreateForm {
  return {
    zoneId, nodeId: '', name: '', location: '', active: true,
    mac: '', rotation: 0, capture: { ...CAPTURE_DEFAULTS },
  }
}

const showCreate  = ref(false)
const form        = ref<AdminCameraCreateForm>(emptyForm(''))
const formError   = ref<string | null>(null)
const createTried = ref(false)

function openCreate() {
  form.value        = emptyForm(zonesStore.zones[0]?.id ?? '')
  formError.value   = null
  createTried.value = false
  showCreate.value  = true
}

async function handleCreate() {
  createTried.value = true
  formError.value   = null
  if (form.value.zoneId === '') {
    formError.value = 'Elige una zona'
    return
  }
  if (hasDeviceErrors(deviceFieldErrors(form.value.mac, form.value.capture, true))) {
    formError.value = 'Revisa los campos marcados'
    return
  }
  if (!(await store.createCamera(form.value))) {
    formError.value = store.actionError ?? 'Ocurrió un error, intenta de nuevo'
    return
  }
  toast.success('Cámara creada')
  showCreate.value = false
}

// ── Detalle ─────────────────────────────────────────────────────────────
const detailId   = ref<number | null>(null)
const showDetail = ref(false)

function openDetail(id: number) {
  detailId.value   = id
  showDetail.value = true
}

// ── Baja ────────────────────────────────────────────────────────────────
const confirmId   = ref<number | null>(null)
const deleteError = ref<string | null>(null)

function openDelete(id: number) {
  deleteError.value = null
  confirmId.value = id
}

async function handleDelete(id: number) {
  if (await store.deleteCamera(id)) {
    confirmId.value = null
  } else {
    deleteError.value = store.actionError
  }
}

onMounted(async () => {
  await Promise.all([store.fetchCameras(), zonesStore.fetchZones(), nodesStore.fetchNodes()])
})
</script>

<template>
  <AdminPage title="Cámaras" :sub="subtitle">
    <template #actions>
      <Button :disabled="zonesStore.zones.length === 0" :title="zonesStore.zones.length === 0 ? 'Crea primero una zona' : undefined" @click="openCreate">
        <Plus /> Nueva cámara
      </Button>
    </template>

    <AdminSearch v-model="search" placeholder="Buscar por nombre, código o MAC..." />

    <AdminStateBox v-if="store.loading">Cargando cámaras...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['Nombre', 'Zona', 'Código', 'MAC', 'Firmware', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      :empty-text="store.cameras.length === 0 ? 'No hay cámaras registradas' : 'No se encontraron cámaras'"
    >
      <TableRow v-for="c in filtered" :key="c.id">
        <TableCell class="font-semibold text-navy">{{ c.name }}</TableCell>
        <TableCell>{{ zoneName(c.zoneId) }}</TableCell>
        <TableCell class="font-mono text-xs font-semibold text-navy">{{ c.code }}</TableCell>
        <TableCell>
          <span v-if="c.mac" class="font-mono text-xs">{{ c.mac }}</span>
          <Badge v-else variant="warning" size="status" title="Cárgala en Configurar → Dispositivo: sin MAC el Fog no podrá dar de alta esta placa">
            Sin MAC
          </Badge>
        </TableCell>
        <TableCell>
          <FirmwareStatusBadge :status="c.firmware.status" :target="c.firmware.target" :reported="c.firmware.reported" show-versions />
        </TableCell>
        <TableCell>
          <Badge :variant="c.active ? 'success' : 'neutral'" size="status">
            {{ c.active ? 'Activa' : 'Inactiva' }}
          </Badge>
        </TableCell>
        <TableCell>
          <div class="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline-primary" @click="openDetail(c.id)">Configurar</Button>
            <Button size="sm" variant="outline-destructive" @click="openDelete(c.id)">Eliminar</Button>
          </div>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <ConfirmDialog
      :open="confirmId !== null"
      title="Eliminar cámara"
      confirm-label="Eliminar"
      destructive
      :error="deleteError"
      @cancel="confirmId = null"
      @confirm="handleDelete(confirmId!)"
    >
      ¿Eliminar esta cámara?
    </ConfirmDialog>

    <CameraDetailSheet v-model:open="showDetail" :camera-id="detailId" />

    <Dialog v-model:open="showCreate">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nueva cámara</DialogTitle>
          <DialogDescription>El código (CAM-001, CAM-002…) lo asigna el sistema al crearla.</DialogDescription>
        </DialogHeader>

        <form class="grid gap-3.5" @submit.prevent="handleCreate">
          <h3 class="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">General</h3>
          <AdminField v-slot="{ id }" label="Zona" required>
            <NativeSelect :id="id" v-model="form.zoneId">
              <NativeSelectOption v-for="z in zonesStore.zones" :key="z.id" :value="z.id">{{ z.name }}</NativeSelectOption>
            </NativeSelect>
          </AdminField>

          <AdminField v-slot="{ id }" label="Nombre" optional>
            <Input :id="id" v-model="form.name" maxlength="200" placeholder="Cámara entrada norte" />
          </AdminField>

          <div class="grid gap-3 sm:grid-cols-2">
            <AdminField v-slot="{ id }" label="Ubicación" optional>
              <Input :id="id" v-model="form.location" maxlength="300" placeholder="Poste central" />
            </AdminField>
            <AdminField v-slot="{ id }" label="Nodo Fog" optional>
              <NativeSelect :id="id" v-model="form.nodeId">
                <NativeSelectOption value="">Sin nodo</NativeSelectOption>
                <NativeSelectOption v-for="n in nodesStore.nodes" :key="n.id" :value="n.id">{{ n.name }} ({{ n.code }})</NativeSelectOption>
              </NativeSelect>
            </AdminField>
          </div>

          <h3 class="mt-1 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">Dispositivo</h3>
          <CameraDeviceFields v-model="form" mac-required :show-errors="createTried" />

          <FormAlert :message="formError" />

          <DialogFooter>
            <Button type="button" variant="outline" @click="showCreate = false">Cancelar</Button>
            <Button type="submit" :disabled="store.saving">
              {{ store.saving ? 'Guardando...' : 'Crear cámara' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
