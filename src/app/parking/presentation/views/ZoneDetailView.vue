<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Heart, ImageOff, MapPin } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { useZoneStore } from '../../application/zone.store'
import { useFavoriteStore } from '../../../favorites/application/favorite.store'
import { useAuthStore } from '../../../iam/application/auth.store'
import { classificationColor } from '../../domain/zone-classification'
import type { ParkingSpace } from '../../domain/model/space.model'
import ZoneRating from '../../../ratings/presentation/components/ZoneRating.vue'
import SectionCard from '../../../shared/presentation/components/SectionCard.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import OccupancyHistoryChart from '../components/OccupancyHistoryChart.vue'
import ZoneForecastCard from '../components/ZoneForecastCard.vue'
import ClassificationBadge from '../components/ClassificationBadge.vue'
import OccupancyMeter from '../components/OccupancyMeter.vue'

// Enlace de la imagen de vista previa (snapshot de cámara o foto de la zona). Vacío = sin imagen.
const PREVIEW_IMAGE_URL = ''

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

const statCard = 'flex flex-col gap-1 rounded-xl border bg-card px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)]'

let refreshTimer: ReturnType<typeof setInterval>

onMounted(async () => {
  await Promise.all([
    zoneStore.fetchZone(zoneId.value),
    zoneStore.fetchSpacesByZone(zoneId.value),
    zoneStore.fetchHistory(zoneId.value),
    favoriteStore.fetchFavorites(userId.value),
  ])
  // Re-consulta la disponibilidad viva y el historial (vision); el catálogo estático no cambia.
  refreshTimer = setInterval(() => {
    zoneStore.refreshAvailability(zoneId.value)
    zoneStore.fetchHistory(zoneId.value, { silent: true })
  }, 30_000)
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

    <StateMessage v-if="zoneStore.zoneLoading">Cargando zona...</StateMessage>
    <StateMessage v-else-if="zoneStore.zoneError" tone="error">{{ zoneStore.zoneError }}</StateMessage>

    <template v-else-if="zoneStore.zone">
      <!-- Title row -->
      <div class="flex flex-wrap items-start justify-between gap-4">
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
      <div class="grid grid-cols-2 gap-3.5 md:grid-cols-4">
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

      <div class="grid items-stretch gap-4 md:grid-cols-2">
        <!-- Spaces -->
        <SectionCard title="Espacios" class="flex flex-col">
          <StateMessage v-if="zoneStore.spacesLoading" compact>Cargando espacios...</StateMessage>
          <StateMessage v-else-if="zoneStore.spacesError" tone="error" compact>{{ zoneStore.spacesError }}</StateMessage>
          <StateMessage v-else-if="spaces.length === 0" tone="empty" compact>Sin espacios registrados.</StateMessage>
          <template v-else>
            <ul class="grid flex-1 grid-cols-[repeat(auto-fill,80px)] auto-rows-[80px] content-center justify-center gap-3">
              <li
                v-for="space in spaces"
                :key="space.id"
                class="flex aspect-square items-center justify-center rounded-lg border-[1.5px] text-[13px] font-bold text-heading transition-transform hover:scale-105"
                :class="space.occupied
                  ? 'border-zone-ocupado bg-destructive-soft'
                  : 'border-zone-libre bg-success-soft'"
                :title="`${space.spaceNumber} · ${space.occupied ? 'Ocupado' : 'Libre'}`"
              >
                {{ space.spaceNumber }}
                <span class="sr-only">{{ space.occupied ? 'ocupado' : 'libre' }}</span>
              </li>
            </ul>
            <div class="mt-3.5 flex gap-4 border-t pt-3.5 text-xs text-muted-foreground">
              <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-zone-libre" /> Libre</span>
              <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-zone-ocupado" /> Ocupado</span>
            </div>
          </template>
        </SectionCard>

        <!-- Image preview -->
        <SectionCard title="Vista previa" class="flex flex-col">
          <div class="relative min-h-40 flex-1 overflow-hidden rounded-[10px] bg-muted/50">
            <img
              v-if="PREVIEW_IMAGE_URL"
              :src="PREVIEW_IMAGE_URL"
              alt="Vista previa del estacionamiento"
              class="absolute inset-0 size-full object-cover"
            />
            <div
              v-else
              class="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed text-[13px] text-muted-foreground"
            >
              <ImageOff class="size-10 stroke-[1.5] opacity-60" aria-hidden="true" />
              Sin imagen disponible
            </div>
          </div>
        </SectionCard>
      </div>

      <!-- Occupancy history -->
      <SectionCard
        title="Historial de ocupación"
        sub="Cada punto es un frame registrado por las cámaras — pasa el cursor para ver la hora y la ocupación de ese momento."
      >
        <StateMessage v-if="zoneStore.historyLoading" compact>Cargando historial...</StateMessage>
        <StateMessage v-else-if="zoneStore.historyError" tone="error" compact>{{ zoneStore.historyError }}</StateMessage>
        <StateMessage v-else-if="zoneStore.history.length === 0" tone="empty" compact>
          Aún no hay historial registrado para esta zona.
        </StateMessage>
        <OccupancyHistoryChart v-else :points="zoneStore.history" />
      </SectionCard>

      <ZoneForecastCard
        :zone-id="zoneId"
        :spot-ids="spaces.map((s) => s.id)"
        :history="zoneStore.history"
        :history-unavailable="!!zoneStore.historyError"
      />

      <ZoneRating :zone-id="zoneId" />
    </template>
  </div>
</template>
