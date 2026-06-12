<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminZonesStore }   from '../../application/admin-zones.store'
import type { AdminCamera, AdminCameraForm } from '../../domain/model/admin-camera.model'

const store      = useAdminCamerasStore()
const zonesStore = useAdminZonesStore()
const search     = ref('')

const filtered = computed(() =>
  store.cameras.filter(c =>
    c.name.toLowerCase().includes(search.value.toLowerCase()) ||
    c.streamUrl.toLowerCase().includes(search.value.toLowerCase())
  )
)

const showModal  = ref(false)
const editTarget = ref<AdminCamera | null>(null)
const form       = ref<AdminCameraForm>({ zoneId: '', name: '', streamUrl: '', resolution: '', fps: '', detectorVersion: '' })
const feedback   = ref<{ ok: boolean; msg: string } | null>(null)
const confirmId  = ref<number | null>(null)

function zoneName(zoneId: number) {
  return zonesStore.zones.find(z => z.id === zoneId)?.name ?? `Zona ${zoneId}`
}

function openCreate() {
  editTarget.value = null
  form.value = { zoneId: zonesStore.zones[0]?.id ?? '', name: '', streamUrl: '', resolution: '', fps: '', detectorVersion: '' }
  feedback.value = null
  showModal.value = true
}

function openEdit(camera: AdminCamera) {
  editTarget.value = camera
  form.value = {
    zoneId:          camera.zoneId,
    name:            camera.name,
    streamUrl:       camera.streamUrl,
    resolution:      camera.resolution ?? '',
    fps:             camera.fps ?? '',
    detectorVersion: camera.detectorVersion ?? '',
  }
  feedback.value = null
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
  feedback.value = ok
    ? { ok: true,  msg: editTarget.value ? 'Cámara actualizada' : 'Cámara creada' }
    : { ok: false, msg: 'Ocurrió un error, intenta de nuevo' }
  if (ok) setTimeout(closeModal, 1000)
}

async function handleDelete(id: number) {
  await store.deleteCamera(id)
  confirmId.value = null
}

function statusColor(s: string) {
  return ({ ACTIVE: '#38a169', INACTIVE: '#888', ERROR: '#e53e3e' } as Record<string, string>)[s] ?? '#888'
}

function statusLabel(s: string) {
  return ({ ACTIVE: 'Activa', INACTIVE: 'Inactiva', ERROR: 'Error' } as Record<string, string>)[s] ?? s
}

onMounted(() => Promise.all([store.fetchCameras(), zonesStore.fetchZones()]))
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Cámaras</h1>
        <p class="page-sub">{{ store.cameras.length }} cámaras registradas</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nueva cámara</button>
    </div>

    <div class="search-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input v-model="search" type="text" placeholder="Buscar por nombre o stream URL..." />
    </div>

    <div v-if="store.loading" class="state-box">Cargando cámaras...</div>
    <div v-else-if="store.error" class="state-box error">{{ store.error }}</div>

    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre</th><th>Zona</th><th>Stream URL</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="5" class="empty-row">No se encontraron cámaras</td>
          </tr>
          <tr v-for="c in filtered" :key="c.id">
            <td class="td-name">{{ c.name }}</td>
            <td>{{ zoneName(c.zoneId) }}</td>
            <td class="td-url">{{ c.streamUrl }}</td>
            <td>
              <span class="badge" :style="{ background: statusColor(c.status) + '20', color: statusColor(c.status) }">
                {{ statusLabel(c.status) }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="action-btn edit"   @click="openEdit(c)">Editar</button>
                <button class="action-btn delete" @click="confirmId = c.id">Eliminar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Confirm delete -->
    <div v-if="confirmId !== null" class="overlay" @click.self="confirmId = null">
      <div class="confirm-box">
        <p class="confirm-text">¿Eliminar esta cámara?</p>
        <div class="confirm-actions">
          <button class="btn-ghost"  @click="confirmId = null">Cancelar</button>
          <button class="btn-danger" @click="handleDelete(confirmId!)">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="overlay" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">{{ editTarget ? 'Editar cámara' : 'Nueva cámara' }}</h2>

        <div v-if="!editTarget" class="form-group">
          <label>Zona</label>
          <select v-model="form.zoneId">
            <option v-for="z in zonesStore.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Nombre</label>
          <input v-model="form.name" type="text" placeholder="Cámara entrada norte" />
        </div>

        <div class="form-group">
          <label>Stream URL</label>
          <input v-model="form.streamUrl" type="text" placeholder="rtsp://192.168.1.100/stream" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Resolución <span class="optional">(opcional)</span></label>
            <input v-model="form.resolution" type="text" placeholder="1920x1080" />
          </div>
          <div class="form-group">
            <label>FPS <span class="optional">(opcional)</span></label>
            <input v-model.number="form.fps" type="number" min="1" max="120" placeholder="25" />
          </div>
        </div>

        <div class="form-group">
          <label>Versión detector <span class="optional">(opcional)</span></label>
          <input v-model="form.detectorVersion" type="text" placeholder="yolov8-1.2" />
        </div>

        <p v-if="feedback" class="feedback" :class="feedback.ok ? 'ok' : 'err'">{{ feedback.msg }}</p>

        <div class="modal-actions">
          <button class="btn-ghost"  @click="closeModal">Cancelar</button>
          <button class="btn-primary" :disabled="store.saving" @click="handleSubmit">
            {{ store.saving ? 'Guardando...' : (editTarget ? 'Actualizar' : 'Crear cámara') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

.td-url { color: #888; font-size: 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #bbb; }
</style>
