<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Heart, Trash2 } from '@lucide/vue'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useFavoriteStore } from '../../application/favorite.store'
import { useZoneStore } from '../../../parking/application/zone.store'
import { classificationColor } from '../../../parking/domain/zone-classification'
import type { Zone } from '../../../parking/domain/model/zone.model'
import ClassificationBadge from '../../../parking/presentation/components/ClassificationBadge.vue'
import OccupancyMeter from '../../../parking/presentation/components/OccupancyMeter.vue'
import SpaceCounts from '../../../parking/presentation/components/SpaceCounts.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import { formatShortDate } from '../../../shared/helpers/date'

const authStore     = useAuthStore()
const favoriteStore = useFavoriteStore()
const zoneStore     = useZoneStore()

const userId = computed(() => authStore.user?.id ?? 0)

const favoriteZones = computed(() => {
  const ids = favoriteStore.favoriteZoneIds
  return (zoneStore.zones as Zone[]).filter(z => ids.has(z.id))
})

const savedAtMap = computed(() => {
  const map = new Map<number, string>()
  favoriteStore.favorites.forEach(f => map.set(f.zoneId, f.savedAt))
  return map
})

async function handleRemove(zoneId: number) {
  await favoriteStore.removeFavorite(userId.value, zoneId)
}

onMounted(async () => {
  await Promise.all([
    favoriteStore.fetchFavorites(userId.value),
    zoneStore.zones.length === 0 ? zoneStore.fetchZones() : Promise.resolve(),
  ])
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="Mis Favoritos" sub="Zonas que guardaste para acceso rápido">
      <template v-if="favoriteZones.length > 0" #actions>
        <Badge variant="neutral" class="mt-1 px-3 py-1 text-xs font-semibold text-heading">
          {{ favoriteZones.length }} {{ favoriteZones.length === 1 ? 'zona' : 'zonas' }}
        </Badge>
      </template>
    </PageHeader>

    <StateMessage v-if="favoriteStore.loading || zoneStore.zonesLoading">Cargando favoritos...</StateMessage>
    <StateMessage v-else-if="favoriteStore.error" tone="error">{{ favoriteStore.error }}</StateMessage>

    <StateMessage v-else-if="favoriteZones.length === 0" tone="empty" :icon="Heart" title="Sin zonas guardadas">
      Guarda zonas desde el detalle para acceder a ellas rápidamente.
      <template #action>
        <Button as-child variant="emphasis">
          <RouterLink to="/dashboard/zones">Explorar zonas</RouterLink>
        </Button>
      </template>
    </StateMessage>

    <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      <li
        v-for="zone in favoriteZones"
        :key="zone.id"
        class="flex flex-col gap-2.5 rounded-xl border bg-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
      >
        <div class="flex items-start justify-between gap-2.5">
          <div class="min-w-0">
            <p class="mb-0.5 truncate text-sm font-bold text-heading">{{ zone.name }}</p>
            <p class="text-xs text-muted-foreground">{{ zone.street }}, {{ zone.district }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <ClassificationBadge :classification="zone.classification" />
            <Button
              variant="ghost"
              size="icon-sm"
              class="size-7 text-muted-foreground/60 hover:bg-destructive-soft hover:text-destructive"
              :aria-label="`Quitar ${zone.name} de favoritos`"
              title="Quitar de favoritos"
              @click="handleRemove(zone.id)"
            >
              <Trash2 class="size-[15px]" />
            </Button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <OccupancyMeter
            :percentage="zone.occupancyPercentage"
            :color="classificationColor(zone.classification)"
            class="h-[5px] flex-1"
          />
          <span class="text-xs font-semibold text-heading tabular-nums">{{ Math.round(zone.occupancyPercentage) }}%</span>
        </div>

        <SpaceCounts :free="zone.freeCount" :occupied="zone.occupiedCount" :total="zone.totalSpaces" />

        <div class="flex items-center justify-between border-t border-border/60 pt-2">
          <span v-if="savedAtMap.get(zone.id)" class="text-[11px] text-muted-foreground">
            Guardado el {{ formatShortDate(savedAtMap.get(zone.id)!) }}
          </span>
          <RouterLink
            :to="`/dashboard/zones/${zone.id}`"
            class="ml-auto rounded-sm text-xs font-semibold text-link hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Ver detalle →
          </RouterLink>
        </div>
      </li>
    </ul>
  </div>
</template>
