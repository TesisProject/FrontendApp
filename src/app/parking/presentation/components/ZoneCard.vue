<script setup lang="ts">
import { ArrowRight, Heart, MapPin } from '@lucide/vue'
import { classificationColor } from '../../domain/zone-classification'
import type { Zone } from '../../domain/model/zone.model'
import ClassificationBadge from './ClassificationBadge.vue'
import OccupancyMeter from './OccupancyMeter.vue'

defineProps<{
  zone: Zone
  selected: boolean
  isFavorite: boolean
}>()

defineEmits<{
  focus: []
  'toggle-favorite': []
  'view-detail': []
}>()
</script>

<template>
  <article
    class="relative flex overflow-hidden rounded-xl border-[1.5px] bg-card shadow-[0_1px_3px_rgba(10,30,60,0.05)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(10,30,60,0.12)]"
    :class="selected ? 'border-primary shadow-[0_6px_18px_rgba(242,137,74,0.22)]' : 'border-border/70'"
  >
    <span class="w-1 shrink-0" :style="{ background: classificationColor(zone.classification) }" />

    <div class="flex min-w-0 flex-1 flex-col gap-3 px-[15px] py-3.5">
      <div class="flex items-start justify-between gap-2.5">
        <div class="min-w-0">
          <!-- Stretched button: the whole card focuses the zone on the map. -->
          <button
            type="button"
            class="mb-1 text-left text-[15px] leading-tight font-bold text-heading after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/40"
            :aria-pressed="selected"
            @click="$emit('focus')"
          >
            {{ zone.name }}
          </button>
          <p class="flex items-center gap-[5px] text-xs text-muted-foreground">
            <MapPin class="size-[11px] shrink-0 opacity-70" aria-hidden="true" />
            <span class="truncate">{{ zone.street }}, {{ zone.district }}</span>
          </p>
        </div>
        <button
          type="button"
          class="relative z-10 flex shrink-0 rounded-md p-[3px] transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          :class="isFavorite ? 'text-primary' : 'text-muted-foreground/50'"
          :aria-pressed="isFavorite"
          :aria-label="isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
          :title="isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
          @click="$emit('toggle-favorite')"
        >
          <Heart class="size-[15px]" :fill="isFavorite ? 'currentColor' : 'none'" :stroke-width="2.2" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center justify-between gap-2">
        <div class="flex items-baseline gap-2">
          <span
            class="font-display text-[28px] leading-none font-bold tracking-[-0.02em] tabular-nums"
            :style="{ color: classificationColor(zone.classification) }"
          >{{ zone.freeCount }}</span>
          <span class="flex flex-col leading-tight">
            <span class="text-xs font-semibold text-foreground/80">libres</span>
            <span class="text-[11px] text-muted-foreground">de {{ zone.totalSpaces }} espacios</span>
          </span>
        </div>
        <ClassificationBadge :classification="zone.classification" />
      </div>

      <div class="flex items-center gap-[9px]">
        <OccupancyMeter
          :percentage="zone.occupancyPercentage"
          :color="classificationColor(zone.classification)"
          class="h-[7px] flex-1"
        />
        <span class="text-[11px] font-semibold whitespace-nowrap text-muted-foreground">
          {{ Math.round(zone.occupancyPercentage) }}% ocupado
        </span>
      </div>

      <button
        type="button"
        class="group relative z-10 inline-flex items-center gap-[5px] self-start rounded-sm text-xs font-semibold text-link transition-[gap] hover:gap-2 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
        @click="$emit('view-detail')"
      >
        Ver detalle
        <ArrowRight class="size-[13px]" :stroke-width="2.2" aria-hidden="true" />
      </button>
    </div>
  </article>
</template>
