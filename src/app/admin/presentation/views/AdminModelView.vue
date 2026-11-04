<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ExternalLink, RefreshCw } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAdminModelTrainingStore } from '../../application/admin-model-training.store'
import { hasActiveRun, runStatus, runTriggerLabel } from '../../domain/model/admin-model-training.model'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Label } from '@/app/shared/presentation/components/ui/label'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import AdminPage from '../components/AdminPage.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'

/**
 * Modelo IA (HU-27): reentrenar a pedido con los datos de las cámaras guardados en la base, seguir las
 * corridas con enlace a sus logs en GitHub y ver las versiones publicadas con fecha y hora. Si una
 * corrida falla, el backend avisa a los administradores y el modelo anterior sigue publicado.
 */
const store = useAdminModelTrainingStore()
const DATE_TIME = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' })

const confirmOpen = ref(false)
const dryRun = ref(false)
const retrainError = ref<string | null>(null)

function fmt(value: string | null) {
  return value ? DATE_TIME.format(new Date(value)) : '—'
}

async function confirmRetrain() {
  retrainError.value = null
  const error = await store.retrain(dryRun.value)
  if (error) {
    retrainError.value = error
    toast.error(error)
    return
  }
  confirmOpen.value = false
  toast.success(dryRun.value ? 'Prueba de entrenamiento iniciada (sin publicar)' : 'Reentrenamiento iniciado')
  // GitHub tarda unos segundos en listar la corrida nueva.
  setTimeout(() => { void store.fetchRuns({ silent: true }) }, 4000)
}

// Mientras haya una corrida sin terminar, la lista se refresca sola cada 15 s.
let timer: ReturnType<typeof setInterval> | undefined
watch(() => hasActiveRun(store.runs), (active) => {
  clearInterval(timer)
  timer = active
    ? setInterval(() => { void store.fetchRuns({ silent: true }); void store.fetchVersions() }, 15000)
    : undefined
})

function refresh() {
  void store.fetchRuns()
  void store.fetchVersions()
}

onMounted(refresh)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <AdminPage title="Modelo IA" sub="Reentrenamiento del modelo de predicción con los datos de las cámaras">
    <template #actions>
      <Button variant="outline" :disabled="store.runsLoading" @click="refresh">
        <RefreshCw /> Actualizar
      </Button>
      <Button :disabled="store.requesting" @click="retrainError = null; confirmOpen = true">Reentrenar</Button>
    </template>

    <h2 class="mb-2 text-title font-semibold text-navy">Corridas del reentrenamiento</h2>
    <AdminStateBox v-if="store.runsLoading && store.runs.length === 0">Cargando corridas...</AdminStateBox>
    <AdminStateBox v-else-if="store.runsError" tone="error">{{ store.runsError }}</AdminStateBox>
    <AdminTableCard
      v-else
      :columns="['Corrida', 'Origen', 'Estado', 'Inicio', 'Fin', 'Logs']"
      :empty="store.runs.length === 0"
      empty-text="Todavía no hay corridas del reentrenamiento"
    >
      <TableRow v-for="r in store.runs" :key="r.id">
        <TableCell class="font-mono text-body">#{{ r.runNumber ?? r.id }}</TableCell>
        <TableCell class="text-body">{{ runTriggerLabel(r.trigger) }}</TableCell>
        <TableCell>
          <Badge :variant="runStatus(r).tone" size="status">{{ runStatus(r).label }}</Badge>
        </TableCell>
        <TableCell class="text-body whitespace-nowrap">{{ fmt(r.startedAt) }}</TableCell>
        <TableCell class="text-body whitespace-nowrap">{{ fmt(r.finishedAt) }}</TableCell>
        <TableCell>
          <a
            v-if="r.logsUrl"
            :href="r.logsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-body font-medium text-primary hover:underline"
          >
            Ver logs <ExternalLink class="size-3" />
          </a>
          <span v-else class="text-body text-muted-foreground">—</span>
        </TableCell>
      </TableRow>
    </AdminTableCard>
    <p class="mt-2 mb-6 text-caption text-muted-foreground">
      Si una corrida falla, los administradores reciben un correo y una notificación, y el modelo publicado
      sigue siendo el anterior.
    </p>

    <h2 class="mb-2 text-title font-semibold text-navy">Versiones publicadas</h2>
    <AdminStateBox v-if="store.versionsError" tone="error">{{ store.versionsError }}</AdminStateBox>
    <AdminTableCard
      v-else
      :columns="['Publicada', 'Modelo', 'Corrida', 'Zonas publicadas', 'Última zona']"
      :empty="store.versions.length === 0"
      empty-text="Todavía no se publicó ninguna versión del modelo"
    >
      <TableRow v-for="v in store.versions" :key="v.id">
        <TableCell class="text-body whitespace-nowrap">{{ fmt(v.publishedAt) }}</TableCell>
        <TableCell class="font-mono text-body font-semibold text-navy">{{ v.modelVersion }}</TableCell>
        <TableCell class="font-mono text-body">{{ v.runId ?? '—' }}</TableCell>
        <TableCell class="text-body">{{ v.zonesPublished }}</TableCell>
        <TableCell class="text-body whitespace-nowrap">{{ fmt(v.lastPublishedAt) }}</TableCell>
      </TableRow>
    </AdminTableCard>

    <ConfirmDialog
      :open="confirmOpen"
      title="Reentrenar el modelo"
      confirm-label="Iniciar"
      :loading="store.requesting"
      :error="retrainError"
      @cancel="confirmOpen = false"
      @confirm="confirmRetrain"
    >
      Se entrenará el modelo con el historial de ocupación de las cámaras guardado en la base de datos y,
      si termina bien, se publicará el pronóstico nuevo. Tarda unos minutos.
      <template #extra>
        <div class="flex items-center gap-2">
          <Switch id="retrain-dry-run" v-model="dryRun" />
          <Label for="retrain-dry-run">Solo probar (entrenar y evaluar sin publicar)</Label>
        </div>
      </template>
    </ConfirmDialog>
  </AdminPage>
</template>
