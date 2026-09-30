<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminZonesStore }   from '../../application/admin-zones.store'
import { useAdminNodesStore }   from '../../application/admin-nodes.store'
import type { AdminCamera, AdminCameraForm } from '../../domain/model/admin-camera.model'
import { Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Label } from '@/app/shared/presentation/components/ui/label'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
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

const store      = useAdminCamerasStore()
const zonesStore = useAdminZonesStore()
const nodesStore = useAdminNodesStore()
const search     = ref('')

const filtered = computed(() =>
  store.cameras.filter(c =>
    c.name.toLowerCase().includes(search.value.toLowerCase()) ||
    c.code.toLowerCase().includes(search.value.toLowerCase())
  )
)

const showModal  = ref(false)
const editTarget = ref<AdminCamera | null>(null)
const form       = ref<AdminCameraForm>({ zoneId: '', nodeId: '', name: '', location: '', active: true })
const formError  = ref<string | null>(null)
const confirmId  = ref<number | null>(null)

function zoneName(zoneId: number) {
  return zonesStore.zones.find(z => z.id === zoneId)?.name ?? `Zona ${zoneId}`
}

function openCreate() {
  editTarget.value = null
  form.value = { zoneId: zonesStore.zones[0]?.id ?? '', nodeId: '', name: '', location: '', active: true }
  formError.value = null
  showModal.value = true
}

function openEdit(camera: AdminCamera) {
  editTarget.value = camera
  form.value = {
    zoneId:   camera.zoneId,
    nodeId:   camera.nodeId ?? '',
    name:     camera.name,
    location: camera.location,
    active:   camera.active,
  }
  formError.value = null
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  let ok: boolean
  if (editTarget.value) {
    ok = await store.updateCamera(editTarget.value.id, form.value)
  } else {
    ok = await store.createCamera(form.value)
  }
  if (!ok) {
    formError.value = store.actionError ?? 'Ocurrió un error, intenta de nuevo'
    return
  }
  toast.success(editTarget.value ? 'Cámara actualizada' : 'Cámara creada')
  closeModal()
}

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

onMounted(() => Promise.all([store.fetchCameras(), zonesStore.fetchZones(), nodesStore.fetchNodes()]))
</script>

<template>
  <AdminPage title="Cámaras" :sub="`${store.cameras.length} cámaras registradas`">
    <template #actions>
      <Button @click="openCreate"><Plus /> Nueva cámara</Button>
    </template>

    <AdminSearch v-model="search" placeholder="Buscar por nombre o código..." />

    <AdminStateBox v-if="store.loading">Cargando cámaras...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['Nombre', 'Zona', 'Código', 'Ubicación', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      empty-text="No se encontraron cámaras"
    >
      <TableRow v-for="c in filtered" :key="c.id">
        <TableCell class="font-semibold text-navy">{{ c.name }}</TableCell>
        <TableCell>{{ zoneName(c.zoneId) }}</TableCell>
        <TableCell class="font-mono text-xs font-semibold text-navy">{{ c.code }}</TableCell>
        <TableCell class="max-w-[200px] truncate text-xs text-muted-foreground">{{ c.location || '—' }}</TableCell>
        <TableCell>
          <Badge :variant="c.active ? 'success' : 'neutral'" size="status">
            {{ c.active ? 'Activa' : 'Inactiva' }}
          </Badge>
        </TableCell>
        <TableCell>
          <div class="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline-primary" @click="openEdit(c)">Editar</Button>
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

    <Dialog v-model:open="showModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editTarget ? 'Editar cámara' : 'Nueva cámara' }}</DialogTitle>
          <DialogDescription v-if="editTarget">
            Código <strong class="font-mono text-foreground">{{ editTarget.code }}</strong>
          </DialogDescription>
          <DialogDescription v-else>
            El código (CAM-001, CAM-002…) lo asigna el sistema al crearla.
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-3.5" @submit.prevent="handleSubmit">
          <AdminField v-slot="{ id }" label="Zona">
            <NativeSelect :id="id" v-model="form.zoneId">
              <NativeSelectOption v-for="z in zonesStore.zones" :key="z.id" :value="z.id">{{ z.name }}</NativeSelectOption>
            </NativeSelect>
          </AdminField>

          <AdminField v-slot="{ id }" label="Nombre" optional>
            <Input :id="id" v-model="form.name" placeholder="Cámara entrada norte" />
          </AdminField>

          <div class="grid gap-3 sm:grid-cols-2">
            <AdminField v-slot="{ id }" label="Ubicación" optional>
              <Input :id="id" v-model="form.location" placeholder="Poste central" />
            </AdminField>
            <AdminField v-slot="{ id }" label="Nodo Fog" optional>
              <NativeSelect :id="id" v-model="form.nodeId">
                <NativeSelectOption value="">Sin nodo</NativeSelectOption>
                <NativeSelectOption v-for="n in nodesStore.nodes" :key="n.id" :value="n.id">{{ n.name }} ({{ n.code }})</NativeSelectOption>
              </NativeSelect>
            </AdminField>
          </div>

          <div v-if="editTarget" class="flex items-center gap-2.5">
            <Switch id="camera-active" v-model="form.active" />
            <Label for="camera-active">Cámara activa</Label>
          </div>

          <FormAlert :message="formError" />

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancelar</Button>
            <Button type="submit" :disabled="store.saving">
              {{ store.saving ? 'Guardando...' : (editTarget ? 'Actualizar' : 'Crear cámara') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
