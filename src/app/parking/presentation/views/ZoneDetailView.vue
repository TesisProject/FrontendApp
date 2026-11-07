<script setup lang="ts">
import RemoveFavoriteDialog from '../../../favorites/presentation/components/RemoveFavoriteDialog.vue'
import { useFavoriteToggle } from '../../../favorites/presentation/composables/useFavoriteToggle'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChartLine, Heart, Loader2, MessageSquareText, Sparkles } from '@lucide/vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/shared/presentation/components/ui/tabs'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Skeleton } from '@/app/shared/presentation/components/ui/skeleton'
import { useZoneStore } from '../../application/zone.store'
import { useFavoriteStore } from '../../../favorites/application/favorite.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import type { ParkingSpace } from '../../domain/model/space.model'
import ZoneRating from '../../../ratings/presentation/components/ZoneRating.vue'
import SectionCard from '../../../shared/presentation/components/SectionCard.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import FilterPills from '../../../shared/presentation/components/FilterPills.vue'
import OccupancyHistoryChart from '../components/OccupancyHistoryChart.vue'
import ZoneForecastCard from '../components/ZoneForecastCard.vue'
import ZoneOverviewAside from '../components/ZoneOverviewAside.vue'
import ClassificationBadge from '../components/ClassificationBadge.vue'
import StaleBadge from '../components/StaleBadge.vue'
import ConnectivityNotice from '../components/ConnectivityNotice.vue'
import { useNetworkStatus } from '../../../shared/presentation/composables/useNetworkStatus'
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
const { online } = useNetworkStatus()
const userId = computed(() => authStore.user?.id ?? 0)
const isFav = computed(() => favoriteStore.isFavorite(zoneId.value))
const spaces = computed(() => zoneStore.spaces as ParkingSpace[])

// HU-28: quitar pide confirmación; guardar es inmediato. Ambos con toast.
const favoriteToggle = useFavoriteToggle()
async function toggleFavorite() {
  await favoriteToggle.toggle(zoneId.value, zoneStore.zone?.name ?? 'Zona')
}

// Pestaña activa en ?tab=: sobrevive a recargar y se puede compartir; "Atrás" no la recorre (replace).
const DETAIL_TABS = [
  { value: 'history',  label: 'Historial',    icon: ChartLine },
  { value: 'forecast', label: 'Predicciones', icon: Sparkles },
  { value: 'reviews',  label: 'Reseñas',      icon: MessageSquareText },
] as const
type DetailTab = typeof DETAIL_TABS[number]['value']
const router = useRouter()
const activeTab = computed<DetailTab>({
  get: () => DETAIL_TABS.find(t => t.value === route.query.tab)?.value ?? 'history',
  set: (tab) => { router.replace({ query: { ...route.query, tab: tab === 'history' ? undefined : tab } }) },
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
  <div class="mx-auto flex w-full max-w-page flex-col gap-5">
    <div>
      <Button as-child variant="ghost" class="h-auto px-2.5 py-1.5 text-sm font-medium text-heading">
        <RouterLink to="/dashboard/zones"><ArrowLeft class="size-[18px]" :stroke-width="2.5" /> Zonas</RouterLink>
      </Button>
    </div>

    <ConnectivityNotice :online="online" />

    <div v-if="zoneStore.zoneError" class="flex flex-col items-center gap-3">
      <StateMessage tone="error">{{ zoneStore.zoneError }}</StateMessage>
      <Button as-child variant="outline" size="sm">
        <RouterLink to="/dashboard/zones">Ver todas las zonas</RouterLink>
      </Button>
    </div>

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
        <h1 class="min-w-0 font-display text-page font-bold text-balance text-heading">{{ zoneStore.zone.name }}</h1>
        <div class="mt-1 flex flex-wrap items-center gap-2.5">
          <StaleBadge :freshness="zoneStore.zone" class="px-3 py-[5px] text-caption" />
          <ClassificationBadge :classification="zoneStore.zone.classification" class="px-3.5 py-[5px] text-caption" />
          <Button
            variant="outline"
            size="sm"
            class="rounded-full px-3.5 text-caption font-semibold hover:border-primary hover:bg-primary/10 hover:text-link"
            :class="isFav && 'border-primary bg-primary/10 text-link'"
            :aria-pressed="isFav"
            @click="toggleFavorite"
          >
            <Heart class="size-4" :fill="isFav ? 'currentColor' : 'none'" aria-hidden="true" />
            {{ isFav ? 'Guardado' : 'Guardar' }}
          </Button>
        </div>
      </div>

      <!-- Dos columnas en desktop: a la izquierda, fija al hacer scroll, lo que se mira de un vistazo
           (foto, libres, dirección, cómo llegar); a la derecha, lo que se consulta en detalle. -->
      <div class="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside
          class="lg:sticky lg:top-6 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto lg:[scrollbar-width:thin]"
        >
          <ZoneOverviewAside v-if="zoneStore.zone" :zone="zoneStore.zone" />
          <div v-else class="overflow-hidden rounded-xl border bg-card" role="status" aria-label="Cargando resumen">
            <Skeleton class="aspect-[16/10] w-full rounded-none" />
            <div class="grid gap-3 p-4">
              <Skeleton class="h-9 w-40" />
              <Skeleton class="h-1.5 w-full" />
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-2/3" />
            </div>
          </div>
        </aside>

        <div class="flex min-w-0 flex-col gap-5">
      <!-- Spaces, agrupados por lo que ve cada cámara -->
      <SectionCard
        title="Espacios"
        :sub="zoneStore.views.length ? 'Pasa el cursor por un espacio para ubicarlo en la foto.' : undefined"
      >
        <template #actions>
          <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 pt-0.5 text-body text-muted-foreground">
            <StaleBadge v-if="zoneStore.zone" :freshness="zoneStore.zone" />
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-zone-libre" /> Libre</span>
            <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-zone-ocupado" /> Ocupado</span>
          </div>
        </template>
        <ZoneSpacesSkeleton v-if="zoneStore.spacesLoading || zoneStore.viewsLoading" />
        <StateMessage v-else-if="zoneStore.spacesError" tone="error" compact>{{ zoneStore.spacesError }}</StateMessage>
        <StateMessage v-else-if="spaces.length === 0" tone="empty" compact>Sin espacios registrados.</StateMessage>
        <ZoneSpacesPanel v-else :spaces="spaces" :views="zoneStore.views" />
      </SectionCard>

      <!-- Historial, predicciones y reseñas en pestañas: la página no crece hacia abajo con tres
           secciones largas. Se montan una vez y quedan vivas (unmount-on-hide=false) para no
           volver a pedir datos ni perder el periodo elegido al cambiar de pestaña. -->
      <Tabs v-model="activeTab" :unmount-on-hide="false" class="gap-3.5">
        <TabsList aria-label="Más sobre esta zona" class="w-full sm:w-fit">
          <TabsTrigger v-for="t in DETAIL_TABS" :key="t.value" :value="t.value">
            <component :is="t.icon" aria-hidden="true" /> {{ t.label }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
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
        </TabsContent>

        <TabsContent value="forecast">
          <ZoneForecastCard
            v-if="zoneStore.zone"
            :zone-id="zoneId"
            :history="zoneStore.history"
            :history-unavailable="!!zoneStore.historyError"
          />
        </TabsContent>

        <TabsContent value="reviews">
          <ZoneRating v-if="zoneStore.zone" :zone-id="zoneId" />
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </template>
    <RemoveFavoriteDialog
      :open="favoriteToggle.confirmOpen.value"
      :zone-name="favoriteToggle.pending.value?.zoneName"
      :loading="favoriteToggle.removing.value"
      @confirm="favoriteToggle.confirmRemove"
      @cancel="favoriteToggle.cancelRemove"
    />
  </div>
</template>
