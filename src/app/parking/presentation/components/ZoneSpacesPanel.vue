<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera, TriangleAlert } from '@lucide/vue'
import type { ParkingSpace } from '../../domain/model/space.model'
import type { ZoneView } from '../../domain/model/zone-view.model'
import { formatRelative } from '../../../shared/helpers/date'
import ZoneViewSnapshot, { type SnapshotSpace } from './ZoneViewSnapshot.vue'

const props = defineProps<{
  spaces: ParkingSpace[]
  views:  ZoneView[]
}>()

// Una foto más vieja que esto sugiere que la cámara dejó de reportar: el estado puede no ser actual.
const STALE_AFTER_MS = 15 * 60_000

interface SpaceGroup {
  key:    string
  view:   ZoneView | null
  spaces: SnapshotSpace[]
}

const bySpaceNumber = (a: SnapshotSpace, b: SnapshotSpace) =>
  a.spaceNumber.localeCompare(b.spaceNumber, 'es', { numeric: true })

/**
 * Un grupo por cámara (sin nombrarla: al usuario solo le importan sus espacios). Los espacios que
 * ninguna cámara cubre — o todos, si vision aún no ofrece vistas — van juntos al final, sin foto.
 */
const groups = computed<SpaceGroup[]>(() => {
  const byId = new Map(props.spaces.map(s => [s.id, s]))
  const covered = new Set<number>()

  const withView = props.views.flatMap((view) => {
    const spaces = view.spaces.flatMap(({ spaceId, roi }) => {
      const space = byId.get(spaceId)
      if (!space || covered.has(spaceId)) return []
      covered.add(spaceId)
      return [{ id: space.id, spaceNumber: space.spaceNumber, occupied: space.occupied, roi }]
    })
    return spaces.length ? [{ key: `view-${view.id}`, view, spaces: spaces.sort(bySpaceNumber) }] : []
  })

  const rest = props.spaces
    .filter(s => !covered.has(s.id))
    .map(s => ({ id: s.id, spaceNumber: s.spaceNumber, occupied: s.occupied, roi: [] }))
    .sort(bySpaceNumber)

  return rest.length ? [...withView, { key: 'rest', view: null, spaces: rest }] : withView
})

const activeId = ref<number | null>(null)

function freeCount(spaces: SnapshotSpace[]): number {
  return spaces.filter(s => !s.occupied).length
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > STALE_AFTER_MS
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="flex flex-col gap-3.5">
    <article
      v-for="group in groups"
      :key="group.key"
      class="grid gap-4"
      :class="[
        (group.view || groups.length > 1) && 'rounded-[10px] border p-4',
        group.view && 'md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start',
      ]"
    >
      <div class="flex min-w-0 flex-col gap-3">
        <header class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            <strong class="text-[13px] font-semibold text-heading tabular-nums">{{ freeCount(group.spaces) }}</strong>
            libre{{ freeCount(group.spaces) !== 1 ? 's' : '' }} de {{ group.spaces.length }}
          </span>

          <span
            v-if="group.view?.capturedAt"
            class="flex items-center gap-1"
            :class="isStale(group.view.capturedAt) && 'text-warning'"
            :title="`Foto tomada el ${formatDateTime(group.view.capturedAt)}`"
          >
            <component
              :is="isStale(group.view.capturedAt) ? TriangleAlert : Camera"
              class="size-3.5 shrink-0"
              aria-hidden="true"
            />
            Actualizado {{ formatRelative(group.view.capturedAt) }}
          </span>
          <span v-else-if="groups.length > 1 && !group.view">Sin imagen de cámara</span>
        </header>

        <ul class="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2.5">
          <li
            v-for="space in group.spaces"
            :key="space.id"
            class="flex aspect-square items-center justify-center rounded-lg border-[1.5px] text-[13px] font-bold text-heading transition-[transform,box-shadow] hover:scale-105"
            :class="[
              space.occupied ? 'border-zone-ocupado bg-destructive-soft' : 'border-zone-libre bg-success-soft',
              activeId === space.id && 'scale-105 ring-2 ring-ring/60 ring-offset-2 ring-offset-card',
            ]"
            :title="`${space.spaceNumber} · ${space.occupied ? 'Ocupado' : 'Libre'}`"
            @mouseenter="activeId = space.id"
            @mouseleave="activeId = null"
          >
            {{ space.spaceNumber }}
            <span class="sr-only">{{ space.occupied ? 'ocupado' : 'libre' }}</span>
          </li>
        </ul>
      </div>

      <ZoneViewSnapshot
        v-if="group.view"
        v-model:active-id="activeId"
        :image-url="group.view.imageUrl"
        :rotation="group.view.rotation"
        :spaces="group.spaces"
      />
    </article>
  </div>
</template>
