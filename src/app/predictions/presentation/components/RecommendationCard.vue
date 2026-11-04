<script setup lang="ts">
import { ArrowRight, Navigation } from '@lucide/vue'
import { formatDistance } from '../../../parking/domain/geo'
import ClassificationBadge from '../../../parking/presentation/components/ClassificationBadge.vue'
import StaleBadge from '../../../parking/presentation/components/StaleBadge.vue'
import type { ZoneRecommendation } from '../../domain/model/recommendation.model'

/** RecommendationCard — HU-13: nombre, distancia y % estimado de disponibilidad de una zona sugerida. */
defineProps<{ recommendation: ZoneRecommendation; rank: number }>()
defineEmits<{ 'view-detail': [] }>()
</script>

<template>
  <article class="flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(10,30,60,0.05)]">
    <span
      class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-bold text-heading"
      aria-hidden="true"
    >{{ rank }}</span>

    <div class="min-w-0 flex-1">
      <h3 class="truncate text-[15px] font-bold text-heading">{{ recommendation.zoneName }}</h3>
      <p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
        <Navigation class="size-3 shrink-0" aria-hidden="true" />
        a {{ formatDistance(recommendation.distanceMeters) }}
      </p>
      <p class="mt-1 text-[11px] text-muted-foreground">
        <template v-if="recommendation.currentAvailabilityPct != null">
          Ahora {{ recommendation.currentAvailabilityPct }} % libre
          <template v-if="recommendation.available != null">({{ recommendation.available }} de {{ recommendation.total }})</template>
        </template>
        <template v-else>Sin datos en vivo</template>
        <template v-if="recommendation.nextWindowAvailabilityPct != null">
          · próximos minutos {{ recommendation.nextWindowAvailabilityPct }} %
        </template>
      </p>
      <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
        <ClassificationBadge :classification="recommendation.classification" />
        <StaleBadge :freshness="{ stale: recommendation.stale, lastUpdatedAt: null }" />
      </div>
    </div>

    <div class="flex shrink-0 flex-col items-end gap-1.5">
      <span
        class="font-display text-[26px] leading-none font-bold text-heading tabular-nums"
        :aria-label="`${recommendation.estimatedAvailabilityPct} % de disponibilidad estimada`"
      >{{ recommendation.estimatedAvailabilityPct }}%</span>
      <span class="text-[10px] font-medium text-muted-foreground">disponibilidad estimada</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline"
        @click="$emit('view-detail')"
      >
        Ver detalle <ArrowRight class="size-3" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>
