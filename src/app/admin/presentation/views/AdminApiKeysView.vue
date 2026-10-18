<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminApiKeysStore } from '../../application/admin-api-keys.store'
import { useAdminNodesStore } from '../../application/admin-nodes.store'
import { API_KEY_ROLE_LABEL, type AdminApiKey, type AdminApiKeyForm, type ApiKeyRole } from '../../domain/model/admin-api-key.model'
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
import AdminSegmented from '../components/AdminSegmented.vue'

const store      = useAdminApiKeysStore()
const nodesStore = useAdminNodesStore()
const search     = ref('')

const ROLE_OPTIONS = (Object.keys(API_KEY_ROLE_LABEL) as ApiKeyRole[])
  .map(value => ({ value, label: API_KEY_ROLE_LABEL[value] }))

const filtered = computed(() =>
  store.apiKeys.filter(k =>
    k.name.toLowerCase().includes(search.value.toLowerCase()) ||
    k.keyId.toLowerCase().includes(search.value.toLowerCase())
  )
)

const showModal = ref(false)
const form      = ref<AdminApiKeyForm>({ name: '', role: 'FOG', nodeId: '', expiresAt: '' })
const formError = ref<string | null>(null)
const confirmId = ref<number | null>(null)
const revokeError = ref<string | null>(null)
const copied    = ref(false)

const needsNode     = computed(() => form.value.role === 'FOG')
const noNodesForFog = computed(() => needsNode.value && nodesStore.nodes.length === 0)

function nodeName(nodeId: number | null) {
  if (nodeId === null) return '—'
  return nodesStore.nodes.find(n => n.id === nodeId)?.name ?? `Nodo ${nodeId}`
}

/** Key FOG activa sin nodo: anterior a las keys ligadas a nodo, hay que sustituirla. */
function isLegacyFogKey(k: AdminApiKey) {
  return k.role === 'FOG' && k.nodeId === null && k.active
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

function openCreate() {
  form.value = { name: '', role: 'FOG', nodeId: nodesStore.nodes.length === 1 ? nodesStore.nodes[0].id : '', expiresAt: '' }
  formError.value = null
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  if (!form.value.name.trim()) {
    formError.value = 'El nombre de la key es obligatorio'
    return
  }
  if (needsNode.value && form.value.nodeId === '') {
    formError.value = 'Elige el nodo Fog de esta key'
    return
  }
  const ok = await store.createApiKey(form.value)
  if (ok) {
    // El modal de creación se cierra y se abre el de "key generada" (createdKey).
    copied.value = false
    showModal.value = false
  } else {
    formError.value = store.actionError ?? 'Ocurrió un error, intenta de nuevo'
  }
}

async function copyKey() {
  if (!store.createdKey) return
  await navigator.clipboard.writeText(store.createdKey)
  copied.value = true
}

function openRevoke(id: number) {
  revokeError.value = null
  confirmId.value = id
}

async function handleRevoke(id: number) {
  if (await store.revokeApiKey(id)) {
    confirmId.value = null
  } else {
    revokeError.value = store.actionError
  }
}

onMounted(() => Promise.all([store.fetchApiKeys(), nodesStore.fetchNodes()]))
</script>

<template>
  <AdminPage title="API Keys" :sub="`${store.apiKeys.length} keys emitidas · credenciales de los nodos Fog y del prediction-engine`">
    <template #actions>
      <Button @click="openCreate"><Plus /> Nueva API key</Button>
    </template>

    <AdminSearch v-model="search" placeholder="Buscar por nombre o keyId..." />

    <AdminStateBox v-if="store.loading">Cargando API keys...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['Nombre', 'Key ID', 'Rol', 'Nodo', 'Último uso', 'Expira', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      empty-text="No hay API keys emitidas"
    >
      <TableRow v-for="k in filtered" :key="k.id">
        <TableCell class="font-semibold text-navy">{{ k.name }}</TableCell>
        <TableCell class="font-mono text-xs font-semibold text-navy">{{ k.keyId }}</TableCell>
        <TableCell>
          <Badge :variant="k.role === 'FOG' ? 'info' : 'neutral'" size="status">{{ k.role }}</Badge>
        </TableCell>
        <TableCell>
          <Badge v-if="isLegacyFogKey(k)" variant="warning" size="status" title="Key FOG anterior a las keys ligadas a nodo: emite otra con nodo y revoca esta">
            Sin nodo — sustituir
          </Badge>
          <template v-else>{{ k.role === 'FOG' ? nodeName(k.nodeId) : '—' }}</template>
        </TableCell>
        <TableCell class="text-xs text-muted-foreground">{{ formatDate(k.lastUsedAt) }}</TableCell>
        <TableCell class="text-xs text-muted-foreground">{{ formatDate(k.expiresAt) }}</TableCell>
        <TableCell>
          <Badge :variant="k.active ? 'success' : 'neutral'" size="status">
            {{ k.active ? 'Activa' : 'Revocada' }}
          </Badge>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="outline-destructive" @click="openRevoke(k.id)">Revocar</Button>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <ConfirmDialog
      :open="confirmId !== null"
      title="Revocar API key"
      confirm-label="Revocar"
      destructive
      :error="revokeError"
      @cancel="confirmId = null"
      @confirm="handleRevoke(confirmId!)"
    >
      ¿Revocar esta API key? El proceso que la use (nodo Fog o prediction-engine) dejará de autenticarse.
    </ConfirmDialog>

    <!-- Create -->
    <Dialog v-model:open="showModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva API key</DialogTitle>
        </DialogHeader>

        <form class="grid gap-3.5" @submit.prevent="handleSubmit">
          <AdminField v-slot="{ id }" label="Nombre" required>
            <Input :id="id" v-model="form.name" placeholder="fog-001" />
          </AdminField>

          <AdminField label="Rol" required>
            <AdminSegmented v-model="form.role" :options="ROLE_OPTIONS" label="Rol de la key" />
          </AdminField>

          <AdminField
            v-if="needsNode"
            v-slot="{ id }"
            label="Nodo Fog"
            required
            hint="La key solo podrá leer y escribir los datos de este nodo: sus cámaras, eventos, fotos y firmware."
          >
            <NativeSelect :id="id" v-model="form.nodeId" :disabled="noNodesForFog" required>
              <NativeSelectOption value="" disabled>{{ noNodesForFog ? 'No hay nodos registrados' : 'Elige un nodo' }}</NativeSelectOption>
              <NativeSelectOption v-for="n in nodesStore.nodes" :key="n.id" :value="n.id">{{ n.name }} ({{ n.code }})</NativeSelectOption>
            </NativeSelect>
          </AdminField>
          <p v-else class="text-[12px] text-muted-foreground">
            La key del prediction-engine no se liga a ningún nodo: lee zonas e historial y publica el pronóstico.
          </p>
          <p v-if="noNodesForFog" class="text-[12px] text-muted-foreground">
            Registra antes un nodo en <RouterLink to="/admin/nodes" class="font-semibold text-link underline-offset-4 hover:underline">Nodos</RouterLink>.
          </p>

          <AdminField v-slot="{ id }" label="Expiración" optional>
            <Input :id="id" v-model="form.expiresAt" type="datetime-local" />
          </AdminField>

          <FormAlert :message="formError" />

          <DialogFooter>
            <Button type="button" variant="outline" @click="closeModal">Cancelar</Button>
            <Button type="submit" :disabled="store.saving || noNodesForFog">
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
        <p v-if="store.createdMetadata?.role === 'PREDICTION'" class="text-xs text-muted-foreground">
          Configúrala en el prediction-engine como header
          <code class="rounded bg-muted px-1.5 py-px font-mono text-[11px]">X-API-Key</code>.
        </p>
        <p v-else class="text-xs text-muted-foreground">
          Configúrala en el nodo Fog como
          <code class="rounded bg-muted px-1.5 py-px font-mono text-[11px]">CLOUD_API_KEY</code>
          (se envía en el header
          <code class="rounded bg-muted px-1.5 py-px font-mono text-[11px]">X-API-Key</code>).
        </p>

        <DialogFooter>
          <Button @click="store.clearCreatedKey()">Entendido, ya la guardé</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
