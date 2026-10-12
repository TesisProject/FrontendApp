<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera, CameraOff, TriangleAlert } from '@lucide/vue'
import type { ParkingSpace } from '../../domain/model/space.model'
import type { ZoneView } from '../../domain/model/zone-view.model'
import { formatRelative } from '../../../shared/helpers/date'
import { cn } from '@/app/shared/helpers/utils'
import SpaceChip from './SpaceChip.vue'
import ZoneViewSnapshot, { type SnapshotSpace } from './ZoneViewSnapshot.vue'

const props = defineProps<{
  spaces: ParkingSpace[]
  views:  ZoneView[]
}>()

// Una foto más vieja que esto sugiere que la cámara dejó de reportar: el estado puede no ser actual.
const STALE_AFTER_MS = 15 * 60_000

interface ViewCard {
  view:   ZoneView
  spaces: SnapshotSpace[]
}

const bySpaceNumber = (a: SnapshotSpace, b: SnapshotSpace) =>
  a.spaceNumber.localeCompare(b.spaceNumber, 'es', { numeric: true })

/**
 * Una tarjeta por cámara (sin nombrarla: al usuario solo le importan sus espacios) y, aparte, los
 * espacios que ninguna cámara cubre — o todos, si vision aún no ofrece vistas.
 */
const layout = computed(() => {
  const byId = new Map(props.spaces.map(s => [s.id, s]))
  const covered = new Set<number>()

  const cards: ViewCard[] = props.views.flatMap((view) => {
    const spaces = view.spaces.flatMap(({ spaceId, roi }) => {
      const space = byId.get(spaceId)
      if (!space || covered.has(spaceId)) return []
      covered.add(spaceId)
      return [{ id: space.id, spaceNumber: space.spaceNumber, occupied: space.occupied, roi }]
    })
    return spaces.length ? [{ view, spaces: spaces.sort(bySpaceNumber) }] : []
  })

  const uncovered: SnapshotSpace[] = props.spaces
    .filter(s => !covered.has(s.id))
    .map(s => ({ id: s.id, spaceNumber: s.spaceNumber, occupied: s.occupied, roi: [] }))
    .sort(bySpaceNumber)

  return { cards, uncovered }
})

const activeId = ref<number | null>(null)

function freeLabel(spaces: SnapshotSpace[]): string {
  const free = spaces.filter(s => !s.occupied).length
  return `${free} de ${spaces.length} libre${free !== 1 ? 's' : ''}`
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > STALE_AFTER_MS
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

// Chip sobre la foto: siempre oscuro para leerse sobre cualquier imagen, así que sus colores son fijos
// (no tokens de tema); el aviso de foto vieja usa un ámbar claro pensado para ese fondo.
const overlayChip = 'inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm'
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <div
      v-if="layout.cards.length"
      class="grid gap-3.5"
      :class="layout.cards.length > 1 && 'md:grid-cols-2'"
    >
      <article
        v-for="card in layout.cards"
        :key="card.view.id"
        class="overflow-hidden rounded-xl border bg-card"
      >
        <div class="relative">
          <ZoneViewSnapshot
            v-model:active-id="activeId"
            :image-url="card.view.imageUrl"
            :rotation="card.view.rotation"
            :spaces="card.spaces"
          />
          <div class="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
            <span :class="overlayChip" class="tabular-nums">{{ freeLabel(card.spaces) }}</span>
            <span
              v-if="card.view.capturedAt"
              :class="cn(overlayChip, isStale(card.view.capturedAt) && 'text-orange-300')"
              :title="`Foto tomada el ${formatDateTime(card.view.capturedAt)}`"
            >
              <component
                :is="isStale(card.view.capturedAt) ? TriangleAlert : Camera"
                class="size-3.5 shrink-0"
                aria-hidden="true"
              />
              {{ formatRelative(card.view.capturedAt) }}
            </span>
          </div>
        </div>

        <ul class="flex flex-wrap gap-1.5 p-3" :aria-label="`Espacios de esta vista: ${freeLabel(card.spaces)}`">
          <SpaceChip
            v-for="space in card.spaces"
            :key="space.id"
            :space-number="space.spaceNumber"
            :occupied="space.occupied"
            :active="activeId === space.id"
            @mouseenter="activeId = space.id"
            @mouseleave="activeId = null"
          />
        </ul>
      </article>
    </div>

    <!-- Espacios sin foto: franja compacta (o la lista completa si vision no ofrece vistas) -->
    <div
      v-if="layout.uncovered.length"
      class="flex flex-wrap items-center gap-x-3 gap-y-2"
      :class="layout.cards.length > 0 && 'rounded-xl border border-dashed px-3.5 py-3'"
    >
      <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CameraOff v-if="layout.cards.length" class="size-3.5" aria-hidden="true" />
        <template v-if="layout.cards.length">Sin foto ·</template>
        <strong class="font-semibold text-heading tabular-nums">{{ freeLabel(layout.uncovered) }}</strong>
      </span>
      <ul class="flex flex-wrap gap-1.5">
        <SpaceChip
          v-for="space in layout.uncovered"
          :key="space.id"
          :space-number="space.spaceNumber"
          :occupied="space.occupied"
        />
      </ul>
    </div>
  </div>
</template>
