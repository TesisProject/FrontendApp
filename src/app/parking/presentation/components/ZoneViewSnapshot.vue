<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ImageOff } from '@lucide/vue'
import { Skeleton } from '@/app/shared/presentation/components/ui/skeleton'
import type { RoiPoint } from '../../domain/model/zone-view.model'

export interface SnapshotSpace {
  id:          number
  spaceNumber: string
  occupied:    boolean
  roi:         RoiPoint[]
}

const props = defineProps<{
  imageUrl: string | null
  rotation: number
  spaces:   SnapshotSpace[]
}>()

/** Espacio resaltado, compartido con las baldosas: pasar el cursor por uno ilumina el otro. */
const activeId = defineModel<number | null>('activeId', { default: null })

const natural = ref<{ w: number; h: number } | null>(null)
const failed = ref(false)

// Hay que conocer el tamaño real de la foto para girarla y encajar los ROI encima.
watch(() => props.imageUrl, (url) => {
  failed.value = false
  if (!url) { natural.value = null; return }
  const img = new Image()
  img.onload = () => { if (props.imageUrl === url) natural.value = { w: img.naturalWidth, h: img.naturalHeight } }
  img.onerror = () => { if (props.imageUrl === url) failed.value = true }
  img.src = url
}, { immediate: true })

/** Tamaño de la foto ya girada (90° / 270° intercambian ancho y alto). */
const display = computed(() => {
  if (!natural.value) return null
  const swapped = props.rotation === 90 || props.rotation === 270
  return swapped
    ? { w: natural.value.h, h: natural.value.w }
    : { w: natural.value.w, h: natural.value.h }
})

const imageTransform = computed(() => {
  if (!display.value || !natural.value) return ''
  const { w, h } = display.value
  return `translate(${w / 2} ${h / 2}) rotate(${props.rotation}) translate(${-natural.value.w / 2} ${-natural.value.h / 2})`
})

const polygons = computed(() => {
  const d = display.value
  if (!d) return []
  return props.spaces
    .filter(s => s.roi.length >= 3)
    .map(s => {
      // El ROI ya está en coordenadas de la foto girada: se dibuja encima sin transformarlo.
      const pts = s.roi.map(p => ({ x: p.x * d.w, y: p.y * d.h }))
      return {
        ...s,
        points: pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
        cx: pts.reduce((a, p) => a + p.x, 0) / pts.length,
        cy: pts.reduce((a, p) => a + p.y, 0) / pts.length,
      }
    })
})

// Tamaños relativos a la foto: el SVG escala con el contenedor y la foto puede ser de cualquier resolución.
const unit = computed(() => (display.value ? Math.max(display.value.w, display.value.h) / 100 : 1))
</script>

<template>
  <!-- Sin bordes propios: el marco (esquinas, superposiciones) lo pone quien la contiene. -->
  <div class="relative" :class="display && !failed && 'bg-black/85'">
    <!-- La altura se limita para que una zona con una sola cámara no muestre una foto gigante: el SVG
         centra la imagen dentro de su caja (preserveAspectRatio por defecto). -->
    <svg
      v-if="display && !failed"
      class="block h-auto max-h-[26rem] w-full"
      :viewBox="`0 0 ${display.w} ${display.h}`"
      role="img"
      aria-label="Última foto de estos espacios con cada espacio marcado según su estado"
    >
      <image :href="imageUrl!" :width="natural!.w" :height="natural!.h" :transform="imageTransform" />
      <g
        v-for="p in polygons"
        :key="p.id"
        class="cursor-default"
        @mouseenter="activeId = p.id"
        @mouseleave="activeId = null"
      >
        <polygon
          :points="p.points"
          :fill="p.occupied ? 'var(--zone-ocupado)' : 'var(--zone-libre)'"
          :fill-opacity="activeId === p.id ? 0.45 : 0.22"
          :stroke="p.occupied ? 'var(--zone-ocupado)' : 'var(--zone-libre)'"
          :stroke-width="(activeId === p.id ? 0.6 : 0.3) * unit"
          stroke-linejoin="round"
          class="transition-[fill-opacity]"
        />
        <text
          :x="p.cx" :y="p.cy"
          text-anchor="middle" dominant-baseline="central"
          :font-size="2.2 * unit" font-weight="700"
          fill="white" stroke="rgba(9,44,76,0.85)" :stroke-width="0.5 * unit" paint-order="stroke"
        >{{ p.spaceNumber }}</text>
      </g>
    </svg>

    <Skeleton v-else-if="imageUrl && !failed" class="aspect-video max-h-[26rem] w-full rounded-none" />

    <div
      v-else
      class="flex aspect-video max-h-[26rem] w-full flex-col items-center justify-center gap-2 bg-muted text-[13px] text-muted-foreground"
    >
      <ImageOff class="size-8 stroke-[1.5] opacity-60" aria-hidden="true" />
      Aún no hay foto de estos espacios
    </div>
  </div>
</template>
