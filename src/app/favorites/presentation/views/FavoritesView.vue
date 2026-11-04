<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Heart, Trash2 } from '@lucide/vue'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useFavoriteStore } from '../../application/favorite.store'
import { useZoneStore } from '../../../parking/application/zone.store'
import type { Zone } from '../../../parking/domain/model/zone.model'
import ClassificationBadge from '../../../parking/presentation/components/ClassificationBadge.vue'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import { formatShortDate } from '../../../shared/helpers/date'
import RemoveFavoriteDialog from '../components/RemoveFavoriteDialog.vue'
import { useFavoriteToggle } from '../composables/useFavoriteToggle'

/**
 * Mis favoritos (HU-28). Nombre y estado actual vienen del propio favorito (el backend los resuelve
 * por ACL), así la lista se ve completa aunque el catálogo de zonas no esté cargado; la dirección se
 * completa con el catálogo si ya está en memoria. Quitar pide confirmación y actualiza la lista al
 * momento.
 */
const authStore      = useAuthStore()
const favoriteStore  = useFavoriteStore()
const zoneStore      = useZoneStore()
const favoriteToggle = useFavoriteToggle()

const userId = computed(() => authStore.user?.id ?? 0)

const zonesById = computed(() => new Map((zoneStore.zones as Zone[]).map(z => [z.id, z])))

function address(zoneId: number): string | null {
  const z = zonesById.value.get(zoneId)
  return z ? [z.street, z.district].filter(Boolean).join(', ') : null
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
      <template v-if="favoriteStore.favorites.length > 0" #actions>
        <Badge variant="neutral" class="mt-1 px-3 py-1 text-xs font-semibold text-heading">
          {{ favoriteStore.favorites.length }} {{ favoriteStore.favorites.length === 1 ? 'zona' : 'zonas' }}
        </Badge>
      </template>
    </PageHeader>

    <StateMessage v-if="favoriteStore.loading && favoriteStore.favorites.length === 0">Cargando favoritos...</StateMessage>
    <StateMessage v-else-if="favoriteStore.error" tone="error">{{ favoriteStore.error }}</StateMessage>

    <StateMessage v-else-if="favoriteStore.favorites.length === 0" tone="empty" :icon="Heart" title="Sin zonas guardadas">
      Guarda zonas desde el mapa o el detalle para acceder a ellas rápidamente.
      <template #action>
        <Button as-child variant="emphasis">
          <RouterLink to="/dashboard/zones">Explorar zonas</RouterLink>
        </Button>
      </template>
    </StateMessage>

    <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      <li
        v-for="fav in favoriteStore.favorites"
        :key="fav.zoneId"
        class="flex flex-col gap-2.5 rounded-xl border bg-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
      >
        <div class="flex items-start justify-between gap-2.5">
          <div class="min-w-0">
            <p class="mb-0.5 truncate text-sm font-bold text-heading">{{ fav.zoneName ?? 'Zona no disponible' }}</p>
            <p v-if="address(fav.zoneId)" class="text-xs text-muted-foreground">{{ address(fav.zoneId) }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <ClassificationBadge v-if="fav.classification" :classification="fav.classification" />
            <Badge v-else-if="fav.zoneName" variant="neutral" size="pill">Sin datos</Badge>
            <Button
              variant="ghost"
              size="icon-sm"
              class="size-7 text-muted-foreground/60 hover:bg-destructive-soft hover:text-destructive"
              :aria-label="`Quitar ${fav.zoneName ?? 'zona'} de favoritos`"
              title="Quitar de favoritos"
              @click="favoriteToggle.askRemove(fav.zoneId, fav.zoneName ?? 'Zona')"
            >
              <Trash2 class="size-[15px]" />
            </Button>
          </div>
        </div>

        <p v-if="fav.available !== null && fav.total !== null" class="text-xs text-muted-foreground">
          <span class="font-semibold text-heading tabular-nums">{{ fav.available }}</span>
          de {{ fav.total }} espacios libres ahora
        </p>
        <p v-else-if="!fav.zoneName" class="text-xs text-muted-foreground">
          Esta zona ya no existe. Puedes quitarla de tus favoritos.
        </p>

        <div class="flex items-center justify-between border-t border-border/60 pt-2">
          <span class="text-[11px] text-muted-foreground">
            Guardado el {{ formatShortDate(fav.savedAt) }}
          </span>
          <RouterLink
            v-if="fav.zoneName"
            :to="`/dashboard/zones/${fav.zoneId}`"
            class="ml-auto rounded-sm text-xs font-semibold text-link hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Ver detalle →
          </RouterLink>
        </div>
      </li>
    </ul>

    <RemoveFavoriteDialog
      :open="favoriteToggle.confirmOpen.value"
      :zone-name="favoriteToggle.pending.value?.zoneName"
      :loading="favoriteToggle.removing.value"
      @confirm="favoriteToggle.confirmRemove"
      @cancel="favoriteToggle.cancelRemove"
    />
  </div>
</template>
