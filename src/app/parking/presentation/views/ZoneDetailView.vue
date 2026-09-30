<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Heart, Loader2, MapPin } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Skeleton } from '@/app/shared/presentation/components/ui/skeleton'
import { useZoneStore } from '../../application/zone.store'
import { useFavoriteStore } from '../../../favorites/application/favorite.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import { classificationColor } from '../../domain/zone-classification'
import type { ParkingSpace } from '../../domain/model/space.model'
import ZoneRating from '../../../ratings/presentation/components/ZoneRating.vue'
import SectionCard from '../../../shared/presentation/components/SectionCard.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import FilterPills from '../../../shared/presentation/components/FilterPills.vue'
import OccupancyHistoryChart from '../components/OccupancyHistoryChart.vue'
import ZoneForecastCard from '../components/ZoneForecastCard.vue'
import ClassificationBadge from '../components/ClassificationBadge.vue'
import OccupancyMeter from '../components/OccupancyMeter.vue'
import ZoneSpacesPanel from '../components/ZoneSpacesPanel.vue'
import ZoneSpacesSkeleton from '../components/ZoneSpacesSkeleton.vue'
import OccupancyHistorySkeleton from '../components/OccupancyHistorySkeleton.vue'
import {
  HISTORY_RANGE_OPTIONS, bucketLabel, buildHistorySeries, historyQuery, type HistoryRange,
} from '../occupancy-history'

const route = useRoute()
const zoneStore = useZoneStore()
const favoriteStore = useFavoriteStore()
const authStore = useAuthStore()

const zoneId = computed(() => Number(route.params.id))
const userId = computed(() => authStore.user?.id ?? 0)
const isFav = computed(() => favoriteStore.isFavorite(zoneId.value))
const spaces = computed(() => zoneStore.spaces as ParkingSpace[])

async function toggleFavorite() {
  if (isFav.value) {
    await favoriteStore.removeFavorite(userId.value, zoneId.value)
  } else {
    await favoriteStore.addFavorite(userId.value, zoneId.value)
  }
}

const occupancyPct = computed(() =>
  zoneStore.zone ? Math.round(zoneStore.zone.occupancyPercentage) : 0,
)

const stats = computed(() => {
  const z = zoneStore.zone
  if (!z) return []
  return [
    { label: 'Total',    value: z.totalSpaces,   tone: 'text-heading' },
    { label: 'Libres',   value: z.freeCount,     tone: 'text-success' },
    { label: 'Ocupados', value: z.occupiedCount, tone: 'text-destructive' },
  ]
})

const historyRange = ref<HistoryRange>('12h')
// Periodo y "ahora" de los datos en pantalla. Solo cambian cuando llega su respuesta: mientras carga
// otro periodo se sigue viendo el anterior (atenuado), nunca intervalos de uno con el eje de otro.
const shownHistory = ref<{ range: HistoryRange; now: number } | null>(null)

const historySeries = computed(() =>
  shownHistory.value
    ? buildHistorySeries(zoneStore.historyBuckets, shownHistory.value.range, shownHistory.value.now)
    : null,
)

const historySub = computed(() =>
  `Espacios ocupados en promedio cada ${bucketLabel(historyRange.value)}. `
  + 'Los huecos son lapsos sin registros de las cámaras.',
)

async function loadHistoryBuckets(options?: { silent?: boolean }) {
  const range = historyRange.value
  const now = Date.now()
  const applied = await zoneStore.fetchHistoryBuckets(zoneId.value, historyQuery(range, now), options)
  if (applied) shownHistory.value = { range, now }
}

watch(historyRange, () => loadHistoryBuckets())

const statCard ='flex flex-col gap-1 rounded-xl border bg-card px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]'

const REFRESH_MS = 30_000
// Los frames crudos (30 días, solo para comparar el pronóstico por hora) pesan mucho más que el resto:
// basta con refrescarlos cada 5 min.
const RAW_HISTORY_EVERY_TICKS = 10

let refreshTimer: ReturnType<typeof setInterval>

onMounted(async () => {
  await Promise.all([
    zoneStore.fetchZone(zoneId.value),
    zoneStore.fetchSpacesByZone(zoneId.value),
    loadHistoryBuckets(),
    zoneStore.fetchHistory(zoneId.value),
    zoneStore.fetchViews(zoneId.value),
    favoriteStore.fetchFavorites(userId.value),
  ])
  // Re-consulta la disponibilidad viva, las fotos y el historial (vision); el catálogo estático no cambia.
  let ticks = 0
  refreshTimer = setInterval(() => {
    zoneStore.refreshAvailability(zoneId.value)
    zoneStore.fetchViews(zoneId.value, { silent: true })
    loadHistoryBuckets({ silent: true })
    if (++ticks % RAW_HISTORY_EVERY_TICKS === 0) zoneStore.fetchHistory(zoneId.value, { silent: true })
  }, REFRESH_MS)
})

onUnmounted(() => clearInterval(refreshTimer))
</script>

<template>
  <div class="flex flex-col gap-5">
    <div>
      <Button as-child variant="ghost" class="h-auto px-2.5 py-1.5 text-sm font-medium text-heading">
        <RouterLink to="/dashboard/zones"><ArrowLeft class="size-[18px]" :stroke-width="2.5" /> Zonas</RouterLink>
      </Button>
    </div>

    <StateMessage v-if="zoneStore.zoneError" tone="error">{{ zoneStore.zoneError }}</StateMessage>

    <!-- Mientras carga la zona se ve la silueta de la página; cada sección maneja además su propia carga. -->
    <template v-else>
      <!-- Title row -->
      <div v-if="!zoneStore.zone" class="flex flex-wrap items-start justify-between gap-4" role="status" aria-label="Cargando zona">
        <div class="flex flex-col gap-2">
          <Skeleton class="h-8 w-64" />
          <Skeleton class="h-4 w-80 max-w-[70vw]" />
        </div>
        <div class="mt-1 flex gap-2.5">
          <Skeleton class="h-7 w-24 rounded-full" />
          <Skeleton class="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div v-else class="flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0">
          <h1 class="mb-1.5 font-display text-2xl font-bold text-heading">{{ zoneStore.zone.name }}</h1>
          <p class="flex items-center gap-1 text-[13px] text-muted-foreground">
            <MapPin class="size-[13px] shrink-0" aria-hidden="true" />
            {{ zoneStore.zone.street }}, {{ zoneStore.zone.district }} · {{ zoneStore.zone.city }}
          </p>
        </div>
        <div class="mt-1 flex shrink-0 items-center gap-2.5">
          <ClassificationBadge :classification="zoneStore.zone.classification" class="px-3.5 py-[5px] text-xs" />
          <Button
            variant="outline"
            size="sm"
            class="rounded-full px-3.5 text-xs font-semibold hover:border-primary hover:bg-primary/10 hover:text-link"
            :class="isFav && 'border-primary bg-primary/10 text-link'"
            :aria-pressed="isFav"
            @click="toggleFavorite"
          >
            <Heart class="size-4" :fill="isFav ? 'currentColor' : 'none'" aria-hidden="true" />
            {{ isFav ? 'Guardado' : 'Guardar' }}
          </Button>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="!zoneStore.zone" class="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <div v-for="i in 4" :key="i" :class="statCard">
          <Skeleton class="h-[26px] w-14" />
          <Skeleton class="h-3 w-16" />
        </div>
      </div>
      <div v-else class="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <div v-for="s in stats" :key="s.label" :class="statCard">
          <span class="font-display text-[26px] leading-none font-bold tabular-nums" :class="s.tone">{{ s.value }}</span>
          <span class="text-xs font-medium text-muted-foreground">{{ s.label }}</span>
        </div>
        <div :class="statCard">
          <div class="flex flex-col gap-1.5">
            <span class="font-display text-[26px] leading-none font-bold text-heading tabular-nums">{{ occupancyPct }}%</span>
            <OccupancyMeter
              :percentage="occupancyPct"
              :color="classificationColor(zoneStore.zone.classification)"
              class="h-1"
            />
          </div>
          <span class="text-xs font-medium text-muted-foreground">Ocupación</span>
        </div>
      </div>

      <!-- Spaces, agrupados por lo que ve cada cámara -->
      <SectionCard
        title="Espacios"
        :sub="zoneStore.views.length ? 'Pasa el cursor por un espacio para ubicarlo en la foto.' : undefined"
      >
        <template #actions>
          <div class="flex shrink-0 gap-4 pt-0.5 text-xs text-muted-foreground">
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-zone-libre" /> Libre</span>
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-zone-ocupado" /> Ocupado</span>
          </div>
        </template>
        <ZoneSpacesSkeleton v-if="zoneStore.spacesLoading || zoneStore.viewsLoading" />
        <StateMessage v-else-if="zoneStore.spacesError" tone="error" compact>{{ zoneStore.spacesError }}</StateMessage>
        <StateMessage v-else-if="spaces.length === 0" tone="empty" compact>Sin espacios registrados.</StateMessage>
        <ZoneSpacesPanel v-else :spaces="spaces" :views="zoneStore.views" />
      </SectionCard>

      <!-- Occupancy history -->
      <SectionCard title="Historial de ocupación" :sub="historySub">
        <template #actions>
          <div class="flex items-center gap-2">
            <!-- Recarga al cambiar de periodo: el gráfico actual queda atenuado; el hueco del spinner
                 está siempre reservado para que los filtros no se muevan. -->
            <Loader2
              class="size-4 animate-spin text-muted-foreground"
              :class="!(historySeries && zoneStore.historyBucketsLoading) && 'invisible'"
              aria-hidden="true"
            />
            <FilterPills v-model="historyRange" :options="HISTORY_RANGE_OPTIONS" label="Periodo del historial" size="sm" />
          </div>
        </template>
        <StateMessage v-if="zoneStore.historyBucketsError" tone="error" compact>
          {{ zoneStore.historyBucketsError }}
        </StateMessage>
        <OccupancyHistorySkeleton v-else-if="!historySeries" />
        <div
          v-else
          class="transition-opacity"
          :class="zoneStore.historyBucketsLoading && 'opacity-50'"
          :aria-busy="zoneStore.historyBucketsLoading"
        >
          <StateMessage v-if="historySeries.buckets.length === 0" tone="empty" compact>
            Sin registros de ocupación en este periodo.
          </StateMessage>
          <OccupancyHistoryChart v-else :series="historySeries" :range="shownHistory!.range" />
        </div>
      </SectionCard>

      <template v-if="zoneStore.zone">
        <ZoneForecastCard
          :zone-id="zoneId"
          :spot-ids="spaces.map((s) => s.id)"
          :history="zoneStore.history"
          :history-unavailable="!!zoneStore.historyError"
        />

        <ZoneRating :zone-id="zoneId" />
      </template>
    </template>
  </div>
</template>
