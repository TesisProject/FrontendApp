<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAdminCameraAlertsStore } from '../../application/admin-camera-alerts.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import { alertStatus } from '../../domain/model/admin-camera-alert.model'
import type { AlertStatus, AdminCameraAlert } from '../../domain/model/admin-camera-alert.model'

const store    = useAdminCameraAlertsStore()
const authStore = useAuthStore()
const userId   = computed(() => authStore.user?.id ?? 0)

type FilterTab = 'ALL' | AlertStatus
const activeTab = ref<FilterTab>('ALL')

const tabCounts = computed(() => ({
  ALL:          store.alerts.length,
  PENDING:      store.pending.length,
  ACKNOWLEDGED: store.acknowledged.length,
  RESOLVED:     store.resolved.length,
}))

const filtered = computed(() => {
  if (activeTab.value === 'ALL') return store.alerts
  return store.alerts.filter(a => alertStatus(a) === activeTab.value)
})

// Resolve modal
const showResolve  = ref(false)
const resolveAlert = ref<AdminCameraAlert | null>(null)
const resolveNote  = ref('')

function openResolve(a: AdminCameraAlert) {
  resolveAlert.value = a
  resolveNote.value  = ''
  showResolve.value  = true
}

async function confirmResolve() {
  if (!resolveAlert.value || !resolveNote.value.trim()) return
  await store.resolve(resolveAlert.value.id, resolveNote.value.trim())
  showResolve.value = false
}

// Labels & colors
const typeLabel: Record<string, string> = {
  CAMERA_OFFLINE:        'Cámara offline',
  OBSTRUCTION_DETECTED:  'Obstrucción detectada',
  UNAUTHORIZED_VEHICLE:  'Vehículo no autorizado',
  SYSTEM_ERROR:          'Error de sistema',
}

const severityColor: Record<string, string> = {
  LOW:      '#38a169',
  MEDIUM:   '#f2894a',
  HIGH:     '#e53e3e',
  CRITICAL: '#7b2d8b',
}

const statusColor: Record<AlertStatus, string> = {
  PENDING:      '#e53e3e',
  ACKNOWLEDGED: '#f2894a',
  RESOLVED:     '#38a169',
}

const statusLabel: Record<AlertStatus, string> = {
  PENDING:      'Pendiente',
  ACKNOWLEDGED: 'Reconocida',
  RESOLVED:     'Resuelta',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

let refreshTimer: ReturnType<typeof setInterval>

onMounted(() => {
  store.fetchAlerts()
  refreshTimer = setInterval(() => store.fetchAlerts(), 30_000)
})

onUnmounted(() => clearInterval(refreshTimer))
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Alertas de cámaras</h1>
        <p class="page-sub">{{ store.alerts.length }} alertas registradas · actualización cada 30s</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="filter-pills">
      <button
        v-for="tab in (['ALL', 'PENDING', 'ACKNOWLEDGED', 'RESOLVED'] as const)"
        :key="tab"
        class="pill"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab === 'ALL' ? 'Todas' : statusLabel[tab as AlertStatus] }}
        <span class="pill-count">{{ tabCounts[tab] }}</span>
      </button>
    </div>

    <div v-if="store.loading" class="state-box">Cargando alertas...</div>
    <div v-else-if="store.error" class="state-box error">{{ store.error }}</div>

    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tipo</th>
            <th>Severidad</th>
            <th>Cámara</th>
            <th>Zona</th>
            <th>Detectada</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="8" class="empty-row">No hay alertas en esta categoría</td>
          </tr>
          <tr v-for="a in filtered" :key="a.id">
            <td class="td-id">#{{ a.id }}</td>
            <td class="td-type">{{ typeLabel[a.alertType] ?? a.alertType }}</td>
            <td>
              <span
                class="badge"
                :style="{ background: severityColor[a.severity] + '22', color: severityColor[a.severity] }"
              >{{ a.severity }}</span>
            </td>
            <td class="td-id">#{{ a.cameraId }}</td>
            <td class="td-id">#{{ a.zoneId }}</td>
            <td class="td-date">{{ formatDate(a.detectedAt) }}</td>
            <td>
              <span
                class="badge"
                :style="{ background: statusColor[alertStatus(a)] + '22', color: statusColor[alertStatus(a)] }"
              >{{ statusLabel[alertStatus(a)] }}</span>
            </td>
            <td>
              <div class="action-btns">
                <button
                  v-if="alertStatus(a) === 'PENDING'"
                  class="action-btn acknowledge"
                  :disabled="store.acting"
                  @click="store.acknowledge(a.id, userId)"
                >
                  Reconocer
                </button>
                <button
                  v-if="alertStatus(a) === 'ACKNOWLEDGED'"
                  class="action-btn resolve"
                  :disabled="store.acting"
                  @click="openResolve(a)"
                >
                  Resolver
                </button>
                <span v-if="alertStatus(a) === 'RESOLVED'" class="resolved-tag">✓ Cerrada</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Resolve modal -->
    <Transition name="modal">
      <div v-if="showResolve" class="overlay" @click.self="showResolve = false">
        <div class="modal">
          <h2 class="modal-title">Resolver alerta #{{ resolveAlert?.id }}</h2>
          <p class="modal-sub">{{ typeLabel[resolveAlert?.alertType ?? ''] }} · Cámara #{{ resolveAlert?.cameraId }}</p>

          <div class="form-group">
            <label>Nota de resolución <span class="required">*</span></label>
            <textarea
              v-model="resolveNote"
              class="resolve-textarea"
              placeholder="Describe cómo se resolvió el problema..."
              rows="3"
              maxlength="500"
            />
          </div>

          <div class="modal-actions">
            <button class="btn-ghost" @click="showResolve = false">Cancelar</button>
            <button
              class="btn-primary"
              :disabled="!resolveNote.trim() || store.acting"
              @click="confirmResolve"
            >
              {{ store.acting ? 'Guardando...' : 'Marcar como resuelta' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

.filter-pills {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid #e0e0e0;
  background: white;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.pill:hover    { border-color: #092c4c; color: #092c4c; }
.pill.active   { background: #092c4c; border-color: #092c4c; color: white; }
.pill-count    { background: rgba(0,0,0,0.1); border-radius: 8px; padding: 1px 6px; font-size: 11px; font-weight: 700; }
.pill.active .pill-count { background: rgba(255,255,255,0.25); }

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

.td-type  { font-size: 13px; color: #333; max-width: 180px; }
.td-date  { font-size: 12px; color: #666; white-space: nowrap; }

.action-btns { display: flex; gap: 6px; }

.action-btn {
  padding: 4px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: 1.5px solid;
  transition: all 0.15s;
  white-space: nowrap;
}
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.action-btn.acknowledge {
  border-color: #f2894a;
  color: #f2894a;
  background: white;
}
.action-btn.acknowledge:hover:not(:disabled) { background: #f2894a; color: white; }

.action-btn.resolve {
  border-color: #38a169;
  color: #38a169;
  background: white;
}
.action-btn.resolve:hover:not(:disabled) { background: #38a169; color: white; }

.resolved-tag { font-size: 12px; color: #38a169; font-weight: 600; }

.modal-sub   { font-size: 13px; color: #888; margin: -8px 0 4px; }
.required    { color: #e53e3e; }

.resolve-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.resolve-textarea:focus { border-color: #092c4c; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .modal { transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1), opacity 0.2s ease; }
.modal-leave-active .modal { transition: transform 0.15s ease, opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal { transform: translateY(20px) scale(0.97); opacity: 0; }
.modal-leave-to   .modal { transform: translateY(8px)  scale(0.98); opacity: 0; }
</style>
