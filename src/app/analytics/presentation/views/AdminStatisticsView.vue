<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChartNoAxesColumn } from '@lucide/vue'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import AdminPage from '../../../admin/presentation/components/AdminPage.vue'
import AdminSegmented from '../../../admin/presentation/components/AdminSegmented.vue'
import AdminStateBox from '../../../admin/presentation/components/AdminStateBox.vue'
import AdminTableCard from '../../../admin/presentation/components/AdminTableCard.vue'
import { useAdminZonesStore } from '../../../admin/application/admin-zones.store'
import { useZoneStatisticsStore } from '../../application/zone-statistics.store'
import type { StatisticsPeriod } from '../../domain/model/zone-statistics.model'
import { bucketLongLabel, formatPct, PERIOD_LABEL } from '../../domain/statistics-format'
import StatisticsBarChart from '../components/StatisticsBarChart.vue'

/** HU-21: estadísticas de ocupación por semana, mes o año y zona. */
const zonesStore = useAdminZonesStore()
const store      = useZoneStatisticsStore()

const periodOptions = [
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year',  label: 'Año' },
] as const satisfies readonly { value: StatisticsPeriod; label: string }[]

const period = ref<StatisticsPeriod>('week')
const zoneId = ref<string>('')

const zones = computed(() => [...zonesStore.zones].sort((a, b) => a.name.localeCompare(b.name, 'es')))
const selectedZone = computed(() => zones.value.find(z => String(z.id) === zoneId.value) ?? null)

function apply() {
  if (selectedZone.value) store.fetchStatistics(selectedZone.value.id, period.value)
}

watch([period, zoneId], apply)

onMounted(async () => {
  if (!zonesStore.zones.length) await zonesStore.fetchZones()
  if (!zoneId.value && zones.value.length) zoneId.value = String(zones.value[0].id)
})

const stats = computed(() => store.statistics)
const hasData = computed(() => !!stats.value?.summary)
const columns = computed(() => [stats.value?.granularity === 'month' ? 'Mes' : stats.value?.granularity === 'week' ? 'Semana' : 'Día',
  'Ocupación promedio', 'Máxima', 'Ocupados (prom.)', 'Lecturas'])
</script>

<template>
  <AdminPage title="Estadísticas" sub="Ocupación histórica por zona: promedio y máximo por día, semana o mes">
    <div class="mb-5 flex flex-wrap items-end gap-4">
      <label class="grid gap-1.5 text-body font-medium text-muted-foreground">
        Zona
        <NativeSelect v-model="zoneId" wrapper-class="w-64" :disabled="!zones.length" aria-label="Zona">
          <NativeSelectOption v-if="!zones.length" value="" disabled>No hay zonas registradas</NativeSelectOption>
          <NativeSelectOption v-for="z in zones" :key="z.id" :value="String(z.id)">{{ z.name }}</NativeSelectOption>
        </NativeSelect>
      </label>
      <div class="grid gap-1.5 text-body font-medium text-muted-foreground">
        Período
        <AdminSegmented v-model="period" :options="periodOptions" label="Período" />
      </div>
      <p v-if="store.elapsedMs !== null && !store.loading" class="ml-auto text-caption text-muted-foreground tabular-nums">
        Cargado en {{ (store.elapsedMs / 1000).toLocaleString('es-PE', { maximumFractionDigits: 2 }) }} s
      </p>
    </div>

    <AdminStateBox v-if="zonesStore.loading || (store.loading && !stats)">Cargando estadísticas…</AdminStateBox>
    <AdminStateBox v-else-if="zonesStore.error" tone="error">{{ zonesStore.error }}</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <div
      v-else-if="!zones.length"
      class="rounded-xl border bg-card px-6 py-12 text-center text-body text-muted-foreground"
      role="status"
    >
      Todavía no hay zonas registradas.
    </div>

    <template v-else-if="stats">
      <section
        class="mb-5 rounded-xl border bg-card p-5 shadow-[var(--pv-shadow-sm)] transition-opacity"
        :class="store.loading && 'opacity-60'"
        :aria-busy="store.loading"
      >
        <header class="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 class="font-signage text-xl font-semibold text-navy">{{ stats.zoneName }}</h2>
            <p class="text-body text-muted-foreground">{{ PERIOD_LABEL[stats.period] }}</p>
          </div>
          <dl v-if="stats.summary" class="flex flex-wrap gap-x-6 gap-y-1 text-body text-muted-foreground">
            <div>
              <dt class="inline">Promedio</dt>
              <dd class="ml-1 inline font-semibold text-heading tabular-nums">{{ formatPct(stats.summary.avgPct) }}</dd>
            </div>
            <div>
              <dt class="inline">Máximo</dt>
              <dd class="ml-1 inline font-semibold text-heading tabular-nums">{{ formatPct(stats.summary.maxPct) }}</dd>
            </div>
            <div v-if="stats.summary.busiestStart !== null">
              <dt class="inline">Mayor demanda</dt>
              <dd class="ml-1 inline font-semibold text-heading">{{ bucketLongLabel(stats.summary.busiestStart, stats.granularity) }}</dd>
            </div>
          </dl>
        </header>

        <StatisticsBarChart v-if="hasData" :statistics="stats" />
        <div
          v-else
          class="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center text-body text-muted-foreground"
          role="status"
        >
          <ChartNoAxesColumn class="size-6" />
          <p class="font-medium text-heading">No hay datos de ocupación para este período</p>
          <p class="text-body">Las cámaras de {{ stats.zoneName }} no registraron lecturas en {{ PERIOD_LABEL[stats.period].toLowerCase() }}. Prueba con otro período o zona.</p>
        </div>
      </section>

      <AdminTableCard v-if="hasData" :columns="columns" :empty="false" empty-text="">
        <TableRow v-for="p in stats.points" :key="p.start">
          <TableCell class="font-medium text-heading">{{ bucketLongLabel(p.start, stats.granularity) }}</TableCell>
          <TableCell class="tabular-nums">{{ formatPct(p.avgPct) }}</TableCell>
          <TableCell class="tabular-nums">{{ formatPct(p.maxPct) }}</TableCell>
          <TableCell class="tabular-nums">{{ p.avgOccupied === null ? '—' : `${p.avgOccupied.toLocaleString('es-PE')} de ${p.totalSpots}` }}</TableCell>
          <TableCell class="tabular-nums text-muted-foreground">{{ p.samples ? p.samples.toLocaleString('es-PE') : 'Sin datos' }}</TableCell>
        </TableRow>
      </AdminTableCard>
    </template>
  </AdminPage>
</template>
