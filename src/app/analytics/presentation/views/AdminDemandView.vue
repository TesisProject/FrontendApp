<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Download, Flame, Printer } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import AdminPage from '../../../admin/presentation/components/AdminPage.vue'
import AdminSegmented from '../../../admin/presentation/components/AdminSegmented.vue'
import AdminStateBox from '../../../admin/presentation/components/AdminStateBox.vue'
import { useAdminZonesStore } from '../../../admin/application/admin-zones.store'
import { useDemandPeaksStore } from '../../application/demand-peaks.store'
import type { DemandGrouping } from '../../domain/model/demand-peaks.model'
import { formatPct } from '../../domain/statistics-format'
import DemandHeatmap from '../components/DemandHeatmap.vue'

/**
 * HU-19: zonas con picos de demanda por hora del día o día de la semana. Los picos los calcula el
 * backend (≥ 80 % o percentil 90). Exporta en CSV (desde la base de datos) o en PDF con la vista
 * imprimible del navegador: se imprime lo mismo que se ve, con el filtro aplicado.
 */
const zonesStore = useAdminZonesStore()
const store      = useDemandPeaksStore()

const groupOptions = [
  { value: 'hour', label: 'Por hora' },
  { value: 'day',  label: 'Por día' },
] as const satisfies readonly { value: DemandGrouping; label: string }[]

const rangeOptions = [
  { value: 7,  label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
] as const

const groupBy   = ref<DemandGrouping>('hour')
const rangeDays = ref<string>('30')
const zoneId    = ref<string>('')

const zones = computed(() => [...zonesStore.zones].sort((a, b) => a.name.localeCompare(b.name, 'es')))

function apply() {
  const to = new Date()
  const from = new Date(to.getTime() - Number(rangeDays.value) * 86_400_000)
  store.fetchPeaks({
    groupBy: groupBy.value,
    from:    from.toISOString(),
    to:      to.toISOString(),
    zoneId:  zoneId.value ? Number(zoneId.value) : undefined,
  })
}

watch([groupBy, rangeDays, zoneId], apply)

onMounted(() => {
  apply()
  if (!zonesStore.zones.length) zonesStore.fetchZones()
})

const peaks = computed(() => store.peaks)
const peakZones = computed(() => peaks.value?.zones.filter(z => z.peakZone) ?? [])
const hasData = computed(() => !!peaks.value && peaks.value.zones.length > 0)

const dateFmt = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Lima' })
const filterSummary = computed(() => {
  if (!peaks.value) return ''
  const grouping = peaks.value.groupBy === 'hour' ? 'por hora del día' : 'por día de la semana'
  const zone = zoneId.value ? zones.value.find(z => String(z.id) === zoneId.value)?.name ?? 'una zona' : 'todas las zonas'
  return `Demanda ${grouping} · ${zone} · del ${dateFmt.format(peaks.value.from)} al ${dateFmt.format(peaks.value.to)}`
})

async function exportCsv() {
  const err = await store.exportCsv()
  if (err) toast.error(err)
  else toast.success('CSV descargado')
}

const printedAt = ref('')
function exportPdf() {
  printedAt.value = dateFmt.format(new Date())
  // El título del documento es el nombre que el navegador propone al "Guardar como PDF".
  const previous = document.title
  document.title = `picos-demanda-${groupBy.value}`
  window.addEventListener('afterprint', () => { document.title = previous }, { once: true })
  window.print()
}
</script>

<template>
  <AdminPage title="Demanda" sub="Zonas con picos de demanda por hora o día, identificados automáticamente">
    <template #actions>
      <Button variant="outline" class="h-9 text-[13px]" :disabled="!hasData || store.exporting" @click="exportCsv">
        <Download /> {{ store.exporting ? 'Exportando…' : 'Exportar CSV' }}
      </Button>
      <Button variant="outline" class="h-9 text-[13px]" :disabled="!hasData" @click="exportPdf">
        <Printer /> Exportar PDF
      </Button>
    </template>

    <div class="no-print mb-5 flex flex-wrap items-end gap-4">
      <div class="grid gap-1.5 text-xs font-medium text-muted-foreground">
        Agrupar
        <AdminSegmented v-model="groupBy" :options="groupOptions" label="Agrupar demanda" />
      </div>
      <label class="grid gap-1.5 text-xs font-medium text-muted-foreground">
        Rango
        <NativeSelect v-model="rangeDays" wrapper-class="w-44" aria-label="Rango de fechas">
          <NativeSelectOption v-for="o in rangeOptions" :key="o.value" :value="String(o.value)">{{ o.label }}</NativeSelectOption>
        </NativeSelect>
      </label>
      <label class="grid gap-1.5 text-xs font-medium text-muted-foreground">
        Zona
        <NativeSelect v-model="zoneId" wrapper-class="w-56" aria-label="Zona">
          <NativeSelectOption value="">Todas las zonas</NativeSelectOption>
          <NativeSelectOption v-for="z in zones" :key="z.id" :value="String(z.id)">{{ z.name }}</NativeSelectOption>
        </NativeSelect>
      </label>
    </div>

    <AdminStateBox v-if="store.loading && !peaks">Calculando la demanda…</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <div v-else-if="peaks" class="demand-print grid gap-5 transition-opacity" :class="store.loading && 'opacity-60'" :aria-busy="store.loading">
      <!-- Cabecera que solo aparece en el PDF -->
      <header class="hidden print:block">
        <h1 class="font-signage text-2xl font-semibold text-navy">ParkVision · Picos de demanda</h1>
        <p class="text-xs">{{ filterSummary }}</p>
        <p class="text-xs">Generado el {{ printedAt }}. Pico: ocupación promedio ≥ {{ peaks.thresholdPct }} % o percentil 90 ({{ formatPct(peaks.percentile90) }}).</p>
      </header>

      <p class="text-xs text-muted-foreground print:hidden">{{ filterSummary }}</p>

      <div
        v-if="!hasData"
        class="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground"
        role="status"
      >
        <Flame class="size-6" />
        <p class="font-medium text-heading">No hay lecturas de ocupación en este rango</p>
        <p class="text-xs">Amplía el rango o elige otra zona.</p>
      </div>

      <template v-else>
        <section>
          <h2 class="mb-3 text-[11px] font-semibold tracking-[1.2px] text-muted-foreground uppercase">
            Zonas con picos ({{ peakZones.length }})
          </h2>
          <div v-if="peakZones.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <article
              v-for="z in peakZones" :key="z.zoneId"
              class="peak-card rounded-xl border border-destructive/30 bg-destructive-soft p-4"
            >
              <p class="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                <Flame class="size-4" /> {{ z.zoneName }}
              </p>
              <p class="mt-1 font-signage text-[28px] leading-none font-semibold text-navy tabular-nums">{{ formatPct(z.busiestSlot.avgPct) }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                Pico en {{ z.busiestSlot.label }} · {{ z.peakSlots }} {{ z.peakSlots === 1 ? 'franja pico' : 'franjas pico' }}
              </p>
            </article>
          </div>
          <p v-else class="text-sm text-muted-foreground">Ninguna franja llega al umbral de pico en este rango.</p>
        </section>

        <section>
          <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-[11px] font-semibold tracking-[1.2px] text-muted-foreground uppercase">
              Ocupación promedio por {{ peaks.groupBy === 'hour' ? 'hora' : 'día' }} (%)
            </h2>
            <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span class="inline-flex items-center gap-1.5"><span class="heat-legend size-3 rounded-[2px] bg-destructive" /> Pico (≥ {{ peaks.thresholdPct }} % o percentil 90: {{ formatPct(peaks.percentile90) }})</span>
              <span class="inline-flex items-center gap-1.5"><span class="heat-legend size-3 rounded-[2px] bg-chart-1/30" /> Menos</span>
              <span class="inline-flex items-center gap-1.5"><span class="heat-legend size-3 rounded-[2px] bg-chart-1/80" /> Más</span>
            </p>
          </div>
          <DemandHeatmap :peaks="peaks" />
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<style>
/* Vista imprimible (Exportar PDF): solo el bloque de resultados, en horizontal y con sus colores. */
@media print {
  @page { size: A4 landscape; margin: 12mm; }
  body * { visibility: hidden !important; }
  .demand-print, .demand-print * { visibility: visible !important; }
  .demand-print { position: absolute; top: 0; left: 0; width: 100%; opacity: 1 !important; }
  .demand-print .peak-card, .demand-print .heat-legend {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .demand-print .peak-card { break-inside: avoid; }
}
</style>
