<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminApiKeysStore } from '../../application/admin-api-keys.store'
import { useAdminNodesStore } from '../../application/admin-nodes.store'
import type { AdminApiKeyForm } from '../../domain/model/admin-api-key.model'

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
const feedback  = ref<{ ok: boolean; msg: string } | null>(null)
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
  feedback.value = null
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  if (!form.value.name.trim()) {
    feedback.value = { ok: false, msg: 'El nombre de la key es obligatorio' }
    return
  }
  const ok = await store.createApiKey(form.value)
  if (ok) {
    // El modal de creación se cierra y se abre el de "key generada" (createdKey).
    copied.value = false
    showModal.value = false
  } else {
    feedback.value = { ok: false, msg: 'Ocurrió un error, intenta de nuevo' }
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
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">API Keys</h1>
        <p class="page-sub">{{ store.apiKeys.length }} keys emitidas · credenciales de los nodos Fog</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nueva API key</button>
    </div>

    <div class="search-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input v-model="search" type="text" placeholder="Buscar por nombre o keyId..." />
    </div>

    <div v-if="store.loading" class="state-box">Cargando API keys...</div>
    <div v-else-if="store.error" class="state-box error">{{ store.error }}</div>

    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th><th>Key ID</th><th>Nodo</th><th>Último uso</th><th>Expira</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="7" class="empty-row">No hay API keys emitidas</td>
          </tr>
          <tr v-for="k in filtered" :key="k.id">
            <td class="td-name">{{ k.name }}</td>
            <td class="td-code">{{ k.keyId }}</td>
            <td>{{ nodeName(k.nodeId) }}</td>
            <td class="td-muted">{{ formatDate(k.lastUsedAt) }}</td>
            <td class="td-muted">{{ formatDate(k.expiresAt) }}</td>
            <td>
              <span class="badge" :style="{ background: (k.active ? '#38a169' : '#888') + '20', color: k.active ? '#38a169' : '#888' }">
                {{ k.active ? 'Activa' : 'Revocada' }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="action-btn delete" @click="confirmId = k.id">Revocar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Confirm revoke -->
    <div v-if="confirmId !== null" class="overlay" @click.self="confirmId = null">
      <div class="confirm-box">
        <p class="confirm-text">¿Revocar esta API key? El nodo que la use dejará de autenticarse.</p>
        <div class="confirm-actions">
          <button class="btn-ghost"  @click="confirmId = null">Cancelar</button>
          <button class="btn-danger" @click="handleRevoke(confirmId!)">Revocar</button>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showModal" class="overlay" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">Nueva API key</h2>

        <div class="form-group">
          <label>Nombre</label>
          <input v-model="form.name" type="text" placeholder="Key nodo central" />
        </div>

        <div class="form-group">
          <label>Nodo Fog <span class="optional">(opcional)</span></label>
          <select v-model="form.nodeId">
            <option value="">Sin nodo asociado</option>
            <option v-for="n in nodesStore.nodes" :key="n.id" :value="n.id">{{ n.name }} ({{ n.code }})</option>
          </select>
        </div>

        <div class="form-group">
          <label>Expiración <span class="optional">(opcional)</span></label>
          <input v-model="form.expiresAt" type="datetime-local" />
        </div>

        <p v-if="feedback" class="feedback" :class="feedback.ok ? 'ok' : 'err'">{{ feedback.msg }}</p>

        <div class="modal-actions">
          <button class="btn-ghost"  @click="closeModal">Cancelar</button>
          <button class="btn-primary" :disabled="store.saving" @click="handleSubmit">
            {{ store.saving ? 'Generando...' : 'Generar key' }}
          </button>
        </div>
      </div>
    </div>

    <!-- One-time key modal -->
    <div v-if="store.createdKey" class="overlay">
      <div class="modal">
        <h2 class="modal-title">API key generada</h2>
        <p class="key-warning">
          Copia esta key ahora. Por seguridad, <strong>no volverá a mostrarse</strong>.
        </p>
        <div class="key-box">
          <code class="key-value">{{ store.createdKey }}</code>
          <button class="btn-primary copy-btn" @click="copyKey">
            {{ copied ? '✓ Copiada' : 'Copiar' }}
          </button>
        </div>
        <p class="key-hint">Configúrala en el nodo Fog como header <code>X-API-Key</code>.</p>
        <div class="modal-actions">
          <button class="btn-primary" @click="store.clearCreatedKey()">Entendido, ya la guardé</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

.td-code { font-family: var(--font-mono); font-size: 12px; color: #092c4c; font-weight: 600; }
.td-muted { color: #888; font-size: 12px; }
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #bbb; }

.key-warning { font-size: 13px; color: #c0392b; margin: 0 0 12px; }

.key-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.key-value {
  flex: 1;
  font-family: monospace;
  font-size: 12px;
  color: #092c4c;
  word-break: break-all;
}

.copy-btn { white-space: nowrap; }

.key-hint { font-size: 12px; color: #888; margin: 0 0 12px; }
.key-hint code { background: #f0f0f0; padding: 1px 5px; border-radius: 4px; font-size: 11px; }
</style>
