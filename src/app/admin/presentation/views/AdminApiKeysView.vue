<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminApiKeysStore } from '../../application/admin-api-keys.store'
import { useAdminNodesStore } from '../../application/admin-nodes.store'
import type { AdminApiKeyForm } from '../../domain/model/admin-api-key.model'
import { Check, Copy, Plus, TriangleAlert } from '@lucide/vue'
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

const store      = useAdminApiKeysStore()
const nodesStore = useAdminNodesStore()
const search     = ref('')

const filtered = computed(() =>
  store.apiKeys.filter(k =>
    k.name.toLowerCase().includes(search.value.toLowerCase()) ||
    k.keyId.toLowerCase().includes(search.value.toLowerCase())
  )
)

const showModal = ref(false)
const form      = ref<AdminApiKeyForm>({ name: '', nodeId: '', expiresAt: '' })
const formError = ref<string | null>(null)
const confirmId = ref<number | null>(null)
const copied    = ref(false)

function nodeName(nodeId: number | null) {
  if (nodeId === null) return '—'
  return nodesStore.nodes.find(n => n.id === nodeId)?.name ?? `Nodo ${nodeId}`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

function openCreate() {
  form.value = { name: '', nodeId: '', expiresAt: '' }
  formError.value = null
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  if (!form.value.name.trim()) {
    formError.value = 'El nombre de la key es obligatorio'
    return
  }
  const ok = await store.createApiKey(form.value)
  if (ok) {
    // El modal de creación se cierra y se abre el de "key generada" (createdKey).
    copied.value = false
    showModal.value = false
  } else {
    formError.value = 'Ocurrió un error, intenta de nuevo'
  }
}

async function copyKey() {
  if (!store.createdKey) return
  await navigator.clipboard.writeText(store.createdKey)
  copied.value = true
}

async function handleRevoke(id: number) {
  await store.revokeApiKey(id)
  confirmId.value = null
}

onMounted(() => Promise.all([store.fetchApiKeys(), nodesStore.fetchNodes()]))
</script>

<template>
  <AdminPage title="API Keys" :sub="`${store.apiKeys.length} keys emitidas · credenciales de los nodos Fog`">
    <template #actions>
      <Button @click="openCreate"><Plus /> Nueva API key</Button>
    </template>

    <AdminSearch v-model="search" placeholder="Buscar por nombre o keyId..." />

    <AdminStateBox v-if="store.loading">Cargando API keys...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['Nombre', 'Key ID', 'Nodo', 'Último uso', 'Expira', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      empty-text="No hay API keys emitidas"
    >
      <TableRow v-for="k in filtered" :key="k.id">
        <TableCell class="font-semibold text-navy">{{ k.name }}</TableCell>
        <TableCell class="font-mono text-xs font-semibold text-navy">{{ k.keyId }}</TableCell>
        <TableCell>{{ nodeName(k.nodeId) }}</TableCell>
        <TableCell class="text-xs text-muted-foreground">{{ formatDate(k.lastUsedAt) }}</TableCell>
        <TableCell class="text-xs text-muted-foreground">{{ formatDate(k.expiresAt) }}</TableCell>
        <TableCell>
          <Badge :variant="k.active ? 'success' : 'neutral'" size="status">
            {{ k.active ? 'Activa' : 'Revocada' }}
          </Badge>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="outline-destructive" @click="confirmId = k.id">Revocar</Button>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <ConfirmDialog
      :open="confirmId !== null"
      title="Revocar API key"
      confirm-label="Revocar"
      destructive
      @cancel="confirmId = null"
      @confirm="handleRevoke(confirmId!)"
    >
      ¿Revocar esta API key? El nodo que la use dejará de autenticarse.
    </ConfirmDialog>

    <!-- Create -->
    <Dialog v-model:open="showModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva API key</DialogTitle>
        </DialogHeader>

        <form class="grid gap-3.5" @submit.prevent="handleSubmit">
          <AdminField v-slot="{ id }" label="Nombre" required>
            <Input :id="id" v-model="form.name" placeholder="Key nodo central" />
          </AdminField>

          <AdminField v-slot="{ id }" label="Nodo Fog" optional>
            <NativeSelect :id="id" v-model="form.nodeId">
              <NativeSelectOption value="">Sin nodo asociado</NativeSelectOption>
              <NativeSelectOption v-for="n in nodesStore.nodes" :key="n.id" :value="n.id">{{ n.name }} ({{ n.code }})</NativeSelectOption>
            </NativeSelect>
          </AdminField>

          <AdminField v-slot="{ id }" label="Expiración" optional>
            <Input :id="id" v-model="form.expiresAt" type="datetime-local" />
          </AdminField>

          <FormAlert :message="formError" />

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancelar</Button>
            <Button type="submit" :disabled="store.saving">
              {{ store.saving ? 'Generando...' : 'Generar key' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- One-time key: must be acknowledged explicitly, so it can't be dismissed -->
    <Dialog :open="!!store.createdKey">
      <DialogContent
        :show-close-button="false"
        @escape-key-down.prevent
        @interact-outside.prevent
      >
        <DialogHeader>
          <DialogTitle>API key generada</DialogTitle>
          <DialogDescription class="flex items-center gap-1.5 text-destructive">
            <TriangleAlert class="size-4 shrink-0" />
            <span>Copia esta key ahora. Por seguridad, <strong>no volverá a mostrarse</strong>.</span>
          </DialogDescription>
        </DialogHeader>

        <div class="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
          <code class="flex-1 font-mono text-xs break-all text-navy">{{ store.createdKey }}</code>
          <Button size="sm" :variant="copied ? 'secondary' : 'default'" @click="copyKey">
            <Check v-if="copied" /><Copy v-else />
            {{ copied ? 'Copiada' : 'Copiar' }}
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          Configúrala en el nodo Fog como header
          <code class="rounded bg-muted px-1.5 py-px font-mono text-[11px]">X-API-Key</code>.
        </p>

        <DialogFooter>
          <Button @click="store.clearCreatedKey()">Entendido, ya la guardé</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
