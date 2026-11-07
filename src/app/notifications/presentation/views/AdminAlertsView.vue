<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { BellOff, CheckCheck, RefreshCw } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Textarea } from '@/app/shared/presentation/components/ui/textarea'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/app/shared/presentation/components/ui/dialog'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminPage from '../../../admin/presentation/components/AdminPage.vue'
import AdminSegmented from '../../../admin/presentation/components/AdminSegmented.vue'
import AdminStateBox from '../../../admin/presentation/components/AdminStateBox.vue'
import AdminTableCard from '../../../admin/presentation/components/AdminTableCard.vue'
import { useCameraAlertsStore } from '../../application/camera-alerts.store'
import {
  alertStatus, alertTypeLabel, type CameraAlert, type CameraAlertStatus,
} from '../../domain/model/camera-alert.model'
import { formatDateTime } from '../alert-format'

/**
 * Alertas de cámara (HU-17): qué cámara dejó de enviar, de qué zona y la hora de su última imagen.
 * Reconocer = "la estoy viendo" (marca leídos mis avisos de esa alerta). Una caída se cierra sola al
 * volver la cámara; resolver a mano es para cerrar una que no se cerrará sola, con una nota.
 */
const store = useCameraAlertsStore()

type Filter = 'active' | 'resolved' | 'all'
const filter = ref<Filter>('active')
const FILTERS = [
  { value: 'active',   label: 'Abiertas' },
  { value: 'resolved', label: 'Resueltas' },
  { value: 'all',      label: 'Todas' },
] as const

const filtered = computed(() => store.alerts.filter(a => {
  const resolved = alertStatus(a) === 'resolved'
  return filter.value === 'all' || (filter.value === 'resolved' ? resolved : !resolved)
}))

const STATUS: Record<CameraAlertStatus, { label: string; variant: 'danger' | 'warning' | 'success' }> = {
  open:         { label: 'Abierta',    variant: 'danger' },
  acknowledged: { label: 'Reconocida', variant: 'warning' },
  resolved:     { label: 'Resuelta',   variant: 'success' },
}

const resolveTarget = ref<CameraAlert | null>(null)
const resolveNote   = ref('')
const resolveError  = ref<string | null>(null)

function openResolve(alert: CameraAlert) {
  resolveTarget.value = alert
  resolveNote.value   = ''
  resolveError.value  = null
}

async function handleResolve() {
  const target = resolveTarget.value
  if (!target) return
  if (!resolveNote.value.trim()) {
    resolveError.value = 'Escribe qué se hizo (p. ej. «Cambiada la batería»)'
    return
  }
  if (await store.resolve(target.id, resolveNote.value.trim())) {
    resolveTarget.value = null
    toast.success('Alerta resuelta')
  } else {
    resolveError.value = store.actionError
  }
}

async function handleAcknowledge(alert: CameraAlert) {
  if (await store.acknowledge(alert.id)) toast.success('Alerta reconocida')
  else toast.error(store.actionError ?? 'No se pudo reconocer la alerta')
}

async function handleMarkAllRead() {
  if (await store.markAllRead()) toast.success('Avisos marcados como leídos')
}

function refresh() {
  void store.fetchAlerts()
  void store.fetchInbox()
}

onMounted(refresh)
</script>

<template>
  <AdminPage
    title="Alertas"
    :sub="`${store.openCount} ${store.openCount === 1 ? 'abierta' : 'abiertas'} · ${store.unreadCount} ${store.unreadCount === 1 ? 'aviso sin leer' : 'avisos sin leer'}`"
  >
    <template #actions>
      <Button variant="outline" :disabled="store.unreadCount === 0" @click="handleMarkAllRead">
        <CheckCheck /> Marcar leídos
      </Button>
      <Button variant="outline" aria-label="Actualizar" @click="refresh"><RefreshCw /></Button>
    </template>

    <div class="mb-4">
      <AdminSegmented v-model="filter" :options="FILTERS" label="Filtrar alertas" />
    </div>

    <AdminStateBox v-if="store.loading && store.alerts.length === 0">Cargando alertas...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['Cámara', 'Zona', 'Alerta', 'Última imagen', 'Detectada', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      :empty-text="filter === 'active' ? 'No hay alertas abiertas: todas las cámaras envían' : 'No hay alertas'"
    >
      <TableRow
        v-for="a in filtered"
        :key="a.id"
        :class="store.unreadAlertIds.has(a.id) ? 'bg-amber/5' : ''"
        :data-testid="`alert-${a.id}`"
      >
        <TableCell class="font-semibold text-navy">
          <span v-if="store.unreadAlertIds.has(a.id)" class="mr-1.5 inline-block size-2 rounded-full bg-amber" aria-label="Sin leer" />
          {{ a.cameraLabel }}
        </TableCell>
        <TableCell class="text-body">{{ a.zoneLabel }}</TableCell>
        <TableCell>
          <div class="flex flex-col gap-1">
            <span class="text-body font-medium">{{ alertTypeLabel(a.type) }}</span>
            <Badge v-if="a.severity === 'CRITICAL'" variant="danger" size="status">Crítica</Badge>
            <span v-if="a.secondAlertSentAt" class="text-caption text-muted-foreground">2.º aviso enviado</span>
          </div>
        </TableCell>
        <TableCell class="text-body">{{ a.lastFrameAt ? formatDateTime(a.lastFrameAt) : '—' }}</TableCell>
        <TableCell class="text-body text-muted-foreground">{{ formatDateTime(a.detectedAt) }}</TableCell>
        <TableCell>
          <Badge :variant="STATUS[alertStatus(a)].variant" size="status">{{ STATUS[alertStatus(a)].label }}</Badge>
          <p v-if="a.resolutionNote" class="mt-1 max-w-[13.75rem] text-caption text-muted-foreground">{{ a.resolutionNote }}</p>
        </TableCell>
        <TableCell>
          <div v-if="alertStatus(a) !== 'resolved'" class="flex flex-wrap gap-1.5">
            <Button
              v-if="alertStatus(a) === 'open'"
              size="sm" variant="outline-primary"
              :disabled="store.busyId === a.id"
              @click="handleAcknowledge(a)"
            >Reconocer</Button>
            <Button size="sm" variant="outline" :disabled="store.busyId === a.id" @click="openResolve(a)">Resolver</Button>
          </div>
          <span v-else class="text-caption text-muted-foreground">{{ a.resolvedAt ? formatDateTime(a.resolvedAt) : '' }}</span>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <p v-if="!store.loading && store.alerts.length === 0 && !store.error" class="mt-3 flex items-center gap-2 text-body text-muted-foreground">
      <BellOff class="size-4" /> Cuando una cámara deje de enviar imágenes más de 90 s, aparecerá aquí y recibirás un correo.
    </p>

    <Dialog :open="resolveTarget !== null" @update:open="v => { if (!v) resolveTarget = null }">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver alerta</DialogTitle>
          <DialogDescription v-if="resolveTarget">
            {{ alertTypeLabel(resolveTarget.type) }} · {{ resolveTarget.cameraLabel }} · {{ resolveTarget.zoneLabel }}.
            Si la cámara sigue sin señal, no se volverá a avisar de esta misma caída.
          </DialogDescription>
        </DialogHeader>
        <form class="grid gap-3.5" @submit.prevent="handleResolve">
          <Textarea v-model="resolveNote" placeholder="Qué se hizo (p. ej. «Cambiada la batería»)" aria-label="Nota de resolución" />
          <FormAlert :message="resolveError" />
          <DialogFooter>
            <Button type="button" variant="outline" @click="resolveTarget = null">Cancelar</Button>
            <Button type="submit" :disabled="store.busyId !== null">Resolver</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </AdminPage>
</template>
