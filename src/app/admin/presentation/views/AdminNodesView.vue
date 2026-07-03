<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminNodesStore } from '../../application/admin-nodes.store'
import type { AdminNode, AdminNodeForm } from '../../domain/model/admin-node.model'

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
const form       = ref<AdminNodeForm>({ code: '', name: '', location: '', active: true })
const feedback   = ref<{ ok: boolean; msg: string } | null>(null)
const confirmId  = ref<number | null>(null)

function openCreate() {
  editTarget.value = null
  form.value = { code: '', name: '', location: '', active: true }
  feedback.value = null
  showModal.value = true
}

function openEdit(node: AdminNode) {
  editTarget.value = node
  form.value = {
    code:     node.code,
    name:     node.name,
    location: node.location,
    active:   node.active,
  }
  feedback.value = null
  showModal.value = true
}

function closeModal() { showModal.value = false }

async function handleSubmit() {
  if (!editTarget.value && !form.value.code.trim()) {
    feedback.value = { ok: false, msg: 'El código del nodo es obligatorio' }
    return
  }
  let ok: boolean
  if (editTarget.value) {
    ok = await store.updateNode(editTarget.value.id, form.value)
  } else {
    ok = await store.createNode(form.value)
  }
  feedback.value = ok
    ? { ok: true,  msg: editTarget.value ? 'Nodo actualizado' : 'Nodo registrado' }
    : { ok: false, msg: 'Ocurrió un error, intenta de nuevo' }
  if (ok) setTimeout(closeModal, 1000)
}

async function handleDelete(id: number) {
  await store.deleteNode(id)
  confirmId.value = null
}

function statusColor(active: boolean) {
  return active ? '#38a169' : '#888'
}

function statusLabel(active: boolean) {
  return active ? 'Activo' : 'Inactivo'
}

onMounted(() => store.fetchNodes())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Nodos Fog</h1>
        <p class="page-sub">{{ store.nodes.length }} nodos registrados</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nuevo nodo</button>
    </div>

    <div class="search-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input v-model="search" type="text" placeholder="Buscar por nombre o código..." />
    </div>

    <div v-if="store.loading" class="state-box">Cargando nodos...</div>
    <div v-else-if="store.error" class="state-box error">{{ store.error }}</div>

    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Código</th><th>Nombre</th><th>Ubicación</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="5" class="empty-row">No se encontraron nodos</td>
          </tr>
          <tr v-for="n in filtered" :key="n.id">
            <td class="td-code">{{ n.code }}</td>
            <td class="td-name">{{ n.name }}</td>
            <td class="td-muted">{{ n.location || '—' }}</td>
            <td>
              <span class="badge" :style="{ background: statusColor(n.active) + '20', color: statusColor(n.active) }">
                {{ statusLabel(n.active) }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="action-btn edit"   @click="openEdit(n)">Editar</button>
                <button class="action-btn delete" @click="confirmId = n.id">Eliminar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Confirm delete -->
    <div v-if="confirmId !== null" class="overlay" @click.self="confirmId = null">
      <div class="confirm-box">
        <p class="confirm-text">¿Eliminar este nodo? Las cámaras asignadas quedarán sin nodo.</p>
        <div class="confirm-actions">
          <button class="btn-ghost"  @click="confirmId = null">Cancelar</button>
          <button class="btn-danger" @click="handleDelete(confirmId!)">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="overlay" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">{{ editTarget ? 'Editar nodo' : 'Nuevo nodo Fog' }}</h2>

        <div v-if="!editTarget" class="form-group">
          <label>Código</label>
          <input v-model="form.code" type="text" placeholder="NODE-001" />
        </div>

        <div class="form-group">
          <label>Nombre <span class="optional">(opcional)</span></label>
          <input v-model="form.name" type="text" placeholder="Nodo estacionamiento central" />
        </div>

        <div class="form-group">
          <label>Ubicación <span class="optional">(opcional)</span></label>
          <input v-model="form.location" type="text" placeholder="Caseta de control" />
        </div>

        <div v-if="editTarget" class="form-group">
          <label class="check-label">
            <input v-model="form.active" type="checkbox" />
            Nodo activo
          </label>
        </div>

        <p v-if="feedback" class="feedback" :class="feedback.ok ? 'ok' : 'err'">{{ feedback.msg }}</p>

        <div class="modal-actions">
          <button class="btn-ghost"  @click="closeModal">Cancelar</button>
          <button class="btn-primary" :disabled="store.saving" @click="handleSubmit">
            {{ store.saving ? 'Guardando...' : (editTarget ? 'Actualizar' : 'Registrar nodo') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

.td-code { font-family: monospace; font-size: 12px; color: #092c4c; font-weight: 600; }
.td-muted { color: #888; font-size: 12px; }
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #bbb; }
.check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.check-label input { width: auto; }
</style>
