<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clock, ImageOff, LocateFixed, MapPin, Navigation, Route } from '@lucide/vue'
import type { Zone } from '../../domain/model/zone.model'
import type { GooglePlacePhoto } from '../../domain/model/zone-photo.model'
import { describeOpeningHours } from '../../domain/opening-hours'
import { formatZoneAddress } from '../../domain/zone-address'
import { classificationColor } from '../../domain/zone-classification'
import { formatDistance, haversineMeters } from '../../domain/geo'
import { fetchGooglePlacePhotos } from '../../infrastructure/google-place-photos'
import { useUserLocation } from '../composables/useUserLocation'
import { UNKNOWN_TEXT } from '../../../shared/helpers/text'
import ZoneDirections from './ZoneDirections.vue'
import OccupancyMeter from './OccupancyMeter.vue'
import GooglePhotoAttribution from '../../../shared/presentation/components/GooglePhotoAttribution.vue'
import { Skeleton } from '@/app/shared/presentation/components/ui/skeleton'

/**
 * ZoneOverviewAside — columna fija del detalle de zona: lo que el conductor mira de un vistazo
 * mientras recorre el resto de la página.
 *  1. Foto del lugar (HU-09): primero las subidas por el admin, luego las de Google Places.
 *  2. Resumen: los espacios libres mandan; ocupación, ocupados y capacidad acompañan.
 *  3. Dirección, distancia al usuario, horario y "Cómo llegar" (HU-09, HU-29).
 * Todo dato que falte se muestra como "Sin información".
 */
const props = defineProps<{ zone: Zone }>()

const { position, status: locationStatus, blocked: locationBlocked, request: requestLocation } = useUserLocation()

const hasCoords = computed(() => !!props.zone.latitude && !!props.zone.longitude)
const distance = computed(() => {
  if (!position.value || !hasCoords.value) return null
  return formatDistance(haversineMeters(position.value, { lat: props.zone.latitude, lng: props.zone.longitude }))
})

const hours = computed(() => describeOpeningHours(props.zone.openingHours))
const address = computed(() => formatZoneAddress(props.zone))

const occupancyPct = computed(() => Math.round(props.zone.occupancyPercentage))
const hasSpaces = computed(() => props.zone.totalSpaces > 0)
const freeTone = computed(() => (props.zone.freeCount > 0 ? 'text-success' : 'text-destructive'))

/** Fila secundaria del resumen; la capacidad solo aparece si no coincide con los espacios monitoreados. */
const secondary = computed(() => {
  const z = props.zone
  const rows = [
    { label: 'Ocupados', value: String(z.occupiedCount) },
    { label: 'Ocupación', value: `${occupancyPct.value}%` },
  ]
  if (z.totalCapacity > 0 && z.totalCapacity !== z.totalSpaces) {
    rows.push({ label: 'Capacidad', value: String(z.totalCapacity) })
  }
  return rows
})

// ── Fotos: las subidas vienen con la zona; las de Google se piden al navegar (no se guardan) ──
interface Photo { key: string; url: string; alt: string; attributions?: GooglePlacePhoto['attributions']; onError?: () => void }

const googlePhotos = ref<GooglePlacePhoto[]>([])
const googleLoading = ref(false)
let googleRequest = 0

watch(() => props.zone.googlePlaceId, async (placeId) => {
  const request = ++googleRequest
  googlePhotos.value = []
  googleLoading.value = !!placeId
  if (!placeId) return
  const photos = await fetchGooglePlacePhotos(placeId)
  if (request !== googleRequest) return
  googlePhotos.value = photos
  googleLoading.value = false
}, { immediate: true })

/** Las URLs presignadas vencen: una foto que ya no carga se oculta en lugar de verse rota. */
const brokenUploads = ref(new Set<string>())
function markBroken(id: string) {
  brokenUploads.value = new Set(brokenUploads.value).add(id)
}

const photos = computed<Photo[]>(() => [
  ...props.zone.photos
    .filter((p): p is { id: string; url: string } => !!p.url && !brokenUploads.value.has(p.id))
    .map(p => ({ key: p.id, url: p.url, alt: `Foto de ${props.zone.name}`, onError: () => markBroken(p.id) })),
  ...googlePhotos.value.map((p, i) => ({
    key: p.url, url: p.url, alt: `Foto de ${props.zone.name} en Google ${i + 1}`, attributions: p.attributions,
  })),
])

const selected = ref(0)
watch(() => photos.value.length, (n) => { if (selected.value >= n) selected.value = 0 })
const hero = computed(() => photos.value[selected.value] ?? null)

const label = 'flex items-center gap-1.5 text-caption font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const value = 'text-body text-foreground'
const unknown = (text: string) => text === UNKNOWN_TEXT && 'text-muted-foreground italic'
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-[var(--pv-shadow-sm)]"
    :aria-label="`Resumen de ${zone.name}`"
  >
    <!-- 1. Foto del lugar -->
    <figure class="m-0">
      <Skeleton v-if="!hero && googleLoading" class="aspect-[16/10] w-full rounded-none" />
      <a
        v-else-if="hero"
        :href="hero.url"
        target="_blank"
        rel="noopener noreferrer"
        class="block aspect-[16/10] overflow-hidden bg-muted"
      >
        <img
          :src="hero.url"
          :alt="hero.alt"
          class="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10"
          @error="hero.onError?.()"
        />
      </a>
      <div
        v-else
        class="flex h-24 items-center justify-center gap-2 bg-muted text-body text-muted-foreground"
      >
        <ImageOff class="size-4 opacity-70" aria-hidden="true" /> Sin fotos del lugar
      </div>

      <figcaption v-if="hero?.attributions?.length" class="px-4 pt-1.5">
        <GooglePhotoAttribution :attributions="hero.attributions" />
      </figcaption>

      <ul v-if="photos.length > 1" class="flex gap-1.5 overflow-x-auto px-4 pt-2.5" aria-label="Más fotos">
        <li v-for="(p, i) in photos" :key="p.key" class="shrink-0">
          <button
            type="button"
            class="block size-12 overflow-hidden rounded-md ring-offset-2 ring-offset-card transition-[opacity,box-shadow] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            :class="i === selected ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'"
            :aria-label="`Ver foto ${i + 1}`"
            :aria-pressed="i === selected"
            @click="selected = i"
          >
            <img :src="p.url" alt="" loading="lazy" class="size-full object-cover" @error="p.onError?.()" />
          </button>
        </li>
      </ul>
    </figure>

    <!-- 2. Resumen: los libres son el dato que decide si vale la pena ir -->
    <div class="px-4 pt-4 pb-4">
      <p class="flex items-baseline gap-2">
        <span class="font-display text-display-lg font-bold tabular-nums" :class="hasSpaces ? freeTone : 'text-muted-foreground'">
          {{ hasSpaces ? zone.freeCount : '—' }}
        </span>
        <span class="text-body font-medium text-muted-foreground">
          {{ hasSpaces ? `libres de ${zone.totalSpaces} espacios` : 'Sin espacios monitoreados' }}
        </span>
      </p>
      <OccupancyMeter
        v-if="hasSpaces"
        :percentage="occupancyPct"
        :color="classificationColor(zone.classification)"
        class="mt-2.5 h-1.5"
      />
      <dl v-if="hasSpaces" class="mt-3 flex gap-6">
        <div v-for="s in secondary" :key="s.label" class="grid gap-0.5">
          <dt class="text-caption text-muted-foreground">{{ s.label }}</dt>
          <dd class="text-body font-semibold text-heading tabular-nums">{{ s.value }}</dd>
        </div>
      </dl>
    </div>

    <!-- 3. Cómo encontrarla -->
    <dl class="grid gap-4 border-t px-4 pt-4 pb-5">
      <div class="grid gap-1">
        <dt :class="label"><MapPin class="size-3.5" aria-hidden="true" /> Dirección</dt>
        <dd :class="[value, unknown(address)]">{{ address }}</dd>
      </div>

      <div class="grid gap-1">
        <dt :class="label"><Navigation class="size-3.5" aria-hidden="true" /> Distancia</dt>
        <dd v-if="distance" :class="value">
          <span class="font-semibold">{{ distance }}</span>
          <span class="text-muted-foreground"> en línea recta</span>
        </dd>
        <dd v-else-if="locationStatus === 'locating'" class="text-body text-muted-foreground">Obteniendo tu ubicación...</dd>
        <dd v-else class="grid gap-1">
          <template v-if="hasCoords && locationStatus !== 'unsupported'">
            <button
              type="button"
              class="flex w-fit items-center gap-1 text-body font-medium text-link underline-offset-2 hover:underline"
              @click="requestLocation"
            >
              <LocateFixed class="size-3.5" aria-hidden="true" /> Activar ubicación
            </button>
            <span v-if="locationStatus === 'denied' && locationBlocked" class="text-caption text-muted-foreground">
              Está bloqueada en tu navegador: toca el ícono a la izquierda de la dirección web y, en «Ubicación»,
              elige «Permitir». Se activará sola.
            </span>
            <span v-else-if="locationStatus === 'denied'" class="text-caption text-muted-foreground">
              No compartiste tu ubicación. Actívala y elige «Permitir» para ver la distancia.
            </span>
            <span v-else-if="locationStatus === 'unavailable'" class="text-caption text-muted-foreground">
              No se pudo obtener tu ubicación. Revisa que el GPS esté activo e inténtalo de nuevo.
            </span>
          </template>
          <span v-else :class="[value, unknown(UNKNOWN_TEXT)]">{{ UNKNOWN_TEXT }}</span>
        </dd>
      </div>

      <div class="grid gap-1">
        <dt :class="label"><Clock class="size-3.5" aria-hidden="true" /> Horario de atención</dt>
        <dd>
          <p v-for="line in hours" :key="line" :class="[value, unknown(line)]">{{ line }}</p>
        </dd>
      </div>

      <div class="grid gap-1.5">
        <dt :class="label"><Route class="size-3.5" aria-hidden="true" /> Cómo llegar</dt>
        <dd>
          <ZoneDirections :latitude="zone.latitude" :longitude="zone.longitude" :origin="position" />
        </dd>
      </div>
    </dl>
  </section>
</template>
