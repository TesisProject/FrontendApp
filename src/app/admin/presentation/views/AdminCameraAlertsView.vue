<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAdminCameraAlertsStore } from '../../application/admin-camera-alerts.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import { alertStatus } from '../../domain/model/admin-camera-alert.model'
import type { AlertSeverity, AlertStatus, AdminCameraAlert } from '../../domain/model/admin-camera-alert.model'
import { CircleCheck } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Badge, type BadgeVariants } from '@/app/shared/presentation/components/ui/badge'
import { Textarea } from '@/app/shared/presentation/components/ui/textarea'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import AdminPage from '../components/AdminPage.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'
import AdminField from '../components/AdminField.vue'
import FilterPills from '../components/FilterPills.vue'

const store    = useAdminCameraAlertsStore()
const authStore = useAuthStore()
const userId   = computed(() => authStore.user?.id ?? 0)

type FilterTab = 'ALL' | AlertStatus
const activeTab = ref<FilterTab>('ALL')

const tabs = computed(() => [
  { value: 'ALL' as const,          label: 'Todas',      count: store.alerts.length },
  { value: 'PENDING' as const,      label: 'Pendiente',  count: store.pending.length },
  { value: 'ACKNOWLEDGED' as const, label: 'Reconocida', count: store.acknowledged.length },
  { value: 'RESOLVED' as const,     label: 'Resuelta',   count: store.resolved.length },
])

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

const severityBadge: Record<AlertSeverity, { variant: BadgeVariants['variant']; class?: string }> = {
  LOW:      { variant: 'success' },
  MEDIUM:   { variant: 'warning' },
  HIGH:     { variant: 'danger' },
  CRITICAL: { variant: 'danger', class: 'bg-[#f3e8f6] text-[#7b2d8b]' },
}

const statusVariant: Record<AlertStatus, BadgeVariants['variant']> = {
  PENDING:      'danger',
  ACKNOWLEDGED: 'warning',
  RESOLVED:     'success',
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
  <AdminPage title="Alertas de cámaras" :sub="`${store.alerts.length} alertas registradas · actualización cada 30s`">
    <FilterPills v-model="activeTab" :options="tabs" label="Filtrar por estado" />

    <AdminStateBox v-if="store.loading">Cargando alertas...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['ID', 'Tipo', 'Severidad', 'Cámara', 'Zona', 'Detectada', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      empty-text="No hay alertas en esta categoría"
    >
      <TableRow v-for="a in filtered" :key="a.id">
        <TableCell class="font-mono text-xs text-muted-foreground">#{{ a.id }}</TableCell>
        <TableCell class="max-w-[180px]">{{ typeLabel[a.alertType] ?? a.alertType }}</TableCell>
        <TableCell>
          <Badge :variant="severityBadge[a.severity].variant" size="status" :class="severityBadge[a.severity].class">
            {{ a.severity }}
          </Badge>
        </TableCell>
        <TableCell class="font-mono text-xs text-muted-foreground">#{{ a.cameraId }}</TableCell>
        <TableCell class="font-mono text-xs text-muted-foreground">#{{ a.zoneId }}</TableCell>
        <TableCell class="text-xs whitespace-nowrap text-muted-foreground">{{ formatDate(a.detectedAt) }}</TableCell>
        <TableCell>
          <Badge :variant="statusVariant[alertStatus(a)]" size="status">{{ statusLabel[alertStatus(a)] }}</Badge>
        </TableCell>
        <TableCell>
          <Button
            v-if="alertStatus(a) === 'PENDING'"
            size="sm"
            variant="outline-primary"
            :disabled="store.acting"
            @click="store.acknowledge(a.id, userId)"
          >
            Reconocer
          </Button>
          <Button
            v-else-if="alertStatus(a) === 'ACKNOWLEDGED'"
            size="sm"
            variant="outline-primary"
            class="border-success text-success hover:bg-success hover:text-white"
            :disabled="store.acting"
            @click="openResolve(a)"
          >
            Resolver
          </Button>
          <span v-else class="inline-flex items-center gap-1 text-xs font-semibold text-success">
            <CircleCheck class="size-3.5" /> Cerrada
          </span>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <Dialog v-model:open="showResolve">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver alerta #{{ resolveAlert?.id }}</DialogTitle>
          <DialogDescription>
            {{ typeLabel[resolveAlert?.alertType ?? ''] }} · Cámara #{{ resolveAlert?.cameraId }}
          </DialogDescription>
        </DialogHeader>

        <form class="grid gap-3.5" @submit.prevent="confirmResolve">
          <AdminField v-slot="{ id }" label="Nota de resolución" required>
            <Textarea
              :id="id"
              v-model="resolveNote"
              placeholder="Describe cómo se resolvió el problema..."
              rows="3"
              maxlength="500"
              class="min-h-20 resize-y"
            />
          </AdminField>

          <DialogFooter>
            <Button type="button" variant="outline" @click="showResolve = false">Cancelar</Button>
            <Button type="submit" :disabled="!resolveNote.trim() || store.acting">
              {{ store.acting ? 'Guardando...' : 'Marcar como resuelta' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
