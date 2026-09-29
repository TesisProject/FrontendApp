<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminNodesStore } from '../../application/admin-nodes.store'
import type { AdminNode, AdminNodeForm } from '../../domain/model/admin-node.model'
import { Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Label } from '@/app/shared/presentation/components/ui/label'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminPage from '../components/AdminPage.vue'
import AdminSearch from '../components/AdminSearch.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'
import AdminField from '../components/AdminField.vue'

const store  = useAdminNodesStore()
const search = ref('')

const filtered = computed(() =>
  store.nodes.filter(n =>
    n.name.toLowerCase().includes(search.value.toLowerCase()) ||
    n.code.toLowerCase().includes(search.value.toLowerCase())
  )
)

const showModal  = ref(false)
const editTarget = ref<AdminNode | null>(null)
const form       = ref<AdminNodeForm>({ name: '', location: '', active: true })
const formError  = ref<string | null>(null)
const confirmId  = ref<number | null>(null)

function openCreate() {
  editTarget.value = null
  form.value = { name: '', location: '', active: true }
  formError.value = null
  showModal.value = true
}

function openEdit(node: AdminNode) {
  editTarget.value = node
  form.value = {
    name:     node.name,
    location: node.location,
    active:   node.active,
  }
  formError.value = null
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  let ok: boolean
  if (editTarget.value) {
    ok = await store.updateNode(editTarget.value.id, form.value)
  } else {
    ok = await store.createNode(form.value)
  }
  if (!ok) {
    formError.value = 'Ocurrió un error, intenta de nuevo'
    return
  }
  toast.success(editTarget.value ? 'Nodo actualizado' : 'Nodo registrado')
  closeModal()
}

async function handleDelete(id: number) {
  await store.deleteNode(id)
  confirmId.value = null
}

onMounted(() => store.fetchNodes())
</script>

<template>
  <AdminPage title="Nodos Fog" :sub="`${store.nodes.length} nodos registrados`">
    <template #actions>
      <Button @click="openCreate"><Plus /> Nuevo nodo</Button>
    </template>

    <AdminSearch v-model="search" placeholder="Buscar por nombre o código..." />

    <AdminStateBox v-if="store.loading">Cargando nodos...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['Código', 'Nombre', 'Ubicación', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      empty-text="No se encontraron nodos"
    >
      <TableRow v-for="n in filtered" :key="n.id">
        <TableCell class="font-mono text-xs font-semibold text-navy">{{ n.code }}</TableCell>
        <TableCell class="font-semibold text-navy">{{ n.name }}</TableCell>
        <TableCell class="text-xs text-muted-foreground">{{ n.location || '—' }}</TableCell>
        <TableCell>
          <Badge :variant="n.active ? 'success' : 'neutral'" size="status">
            {{ n.active ? 'Activo' : 'Inactivo' }}
          </Badge>
        </TableCell>
        <TableCell>
          <div class="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline-primary" @click="openEdit(n)">Editar</Button>
            <Button size="sm" variant="outline-destructive" @click="confirmId = n.id">Eliminar</Button>
          </div>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <ConfirmDialog
      :open="confirmId !== null"
      title="Eliminar nodo"
      confirm-label="Eliminar"
      destructive
      @cancel="confirmId = null"
      @confirm="handleDelete(confirmId!)"
    >
      ¿Eliminar este nodo? Las cámaras asignadas quedarán sin nodo.
    </ConfirmDialog>

    <Dialog v-model:open="showModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editTarget ? 'Editar nodo' : 'Nuevo nodo Fog' }}</DialogTitle>
          <DialogDescription v-if="editTarget">
            Código <strong class="font-mono text-foreground">{{ editTarget.code }}</strong>
          </DialogDescription>
          <DialogDescription v-else>
            El código (FOG-001, FOG-002…) lo asigna el sistema al registrarlo.
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-3.5" @submit.prevent="handleSubmit">
          <AdminField v-slot="{ id }" label="Nombre" optional>
            <Input :id="id" v-model="form.name" placeholder="Nodo estacionamiento central" />
          </AdminField>

          <AdminField v-slot="{ id }" label="Ubicación" optional>
            <Input :id="id" v-model="form.location" placeholder="Caseta de control" />
          </AdminField>

          <div v-if="editTarget" class="flex items-center gap-2.5">
            <Switch id="node-active" v-model="form.active" />
            <Label for="node-active">Nodo activo</Label>
          </div>

          <FormAlert :message="formError" />

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancelar</Button>
            <Button type="submit" :disabled="store.saving">
              {{ store.saving ? 'Guardando...' : (editTarget ? 'Actualizar' : 'Registrar nodo') }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
