<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clock, ImageOff, LocateFixed, MapPin, Navigation, Route, SquareParking, CircleCheck } from '@lucide/vue'
import type { Zone } from '../../domain/model/zone.model'
import type { GooglePlacePhoto } from '../../domain/model/zone-photo.model'
import { describeOpeningHours } from '../../domain/opening-hours'
import { formatZoneAddress } from '../../domain/zone-address'
import { formatDistance, haversineMeters } from '../../domain/geo'
import { fetchGooglePlacePhotos } from '../../infrastructure/google-place-photos'
import { useUserLocation } from '../composables/useUserLocation'
import { UNKNOWN_TEXT, orUnknown } from '../../../shared/helpers/text'
import SectionCard from '../../../shared/presentation/components/SectionCard.vue'
import ZoneDirections from './ZoneDirections.vue'
import GooglePhotoAttribution from '../../../shared/presentation/components/GooglePhotoAttribution.vue'
import { Skeleton } from '@/app/shared/presentation/components/ui/skeleton'

/**
 * ZoneInfoCard — HU-09: dirección, capacidad, disponibles, distancia al usuario, horario y galería
 * (primero las fotos subidas por el administrador, luego las de Google Places con su atribución).
 * HU-29: "Cómo llegar" con la ruta estimada y los enlaces a Waze y Google Maps.
 * Todo dato que falte se muestra como "Sin información".
 */
const props = defineProps<{ zone: Zone }>()

const { position, status: locationStatus, request: requestLocation } = useUserLocation()

const hasCoords = computed(() => !!props.zone.latitude && !!props.zone.longitude)

const distance = computed(() => {
  if (!position.value || !hasCoords.value) return null
  return formatDistance(haversineMeters(position.value, { lat: props.zone.latitude, lng: props.zone.longitude }))
})

const hours = computed(() => describeOpeningHours(props.zone.openingHours))

const capacity = computed(() => orUnknown(props.zone.totalCapacity > 0 ? props.zone.totalCapacity : null))
const available = computed(() =>
  props.zone.totalSpaces > 0 ? `${props.zone.freeCount} de ${props.zone.totalSpaces} espacios` : UNKNOWN_TEXT,
)

// Galería: las subidas vienen con la zona; las de Google se piden al navegar (no se guardan).
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
const uploadedPhotos = computed(() =>
  props.zone.photos.filter((p): p is { id: string; url: string } => !!p.url && !brokenUploads.value.has(p.id)),
)
function markBroken(id: string) {
  brokenUploads.value = new Set(brokenUploads.value).add(id)
}

const hasPhotos = computed(() => uploadedPhotos.value.length > 0 || googlePhotos.value.length > 0)

const label = 'flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase'
const value = 'text-[13px] text-foreground'
const unknown = (text: string) => text === UNKNOWN_TEXT && 'text-muted-foreground italic'
const thumb = 'block aspect-[4/3] overflow-hidden rounded-lg border bg-muted'
</script>

<template>
  <SectionCard title="Información">
    <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <dl class="grid content-start gap-4">
        <div class="grid gap-1">
          <dt :class="label"><MapPin class="size-3.5" aria-hidden="true" /> Dirección</dt>
          <dd :class="[value, unknown(formatZoneAddress(zone))]">{{ formatZoneAddress(zone) }}</dd>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-1">
            <dt :class="label"><SquareParking class="size-3.5" aria-hidden="true" /> Capacidad total</dt>
            <dd :class="[value, unknown(capacity)]">{{ capacity }}</dd>
          </div>
          <div class="grid gap-1">
            <dt :class="label"><CircleCheck class="size-3.5" aria-hidden="true" /> Disponibles</dt>
            <dd :class="[value, unknown(available)]">{{ available }}</dd>
          </div>
        </div>

        <div class="grid gap-1">
          <dt :class="label"><Navigation class="size-3.5" aria-hidden="true" /> Distancia</dt>
          <dd v-if="distance" :class="value">
            {{ distance }} <span class="text-xs text-muted-foreground">en línea recta desde tu ubicación</span>
          </dd>
          <dd v-else-if="locationStatus === 'locating'" class="text-[13px] text-muted-foreground">Obteniendo tu ubicación...</dd>
          <dd v-else class="grid gap-0.5">
            <span :class="[value, unknown(UNKNOWN_TEXT)]">{{ UNKNOWN_TEXT }}</span>
            <template v-if="hasCoords && locationStatus !== 'unsupported'">
              <button
                type="button"
                class="flex w-fit items-center gap-1 text-xs font-medium text-link underline-offset-2 hover:underline"
                @click="requestLocation"
              >
                <LocateFixed class="size-3.5" aria-hidden="true" /> Activar ubicación
              </button>
              <span v-if="locationStatus === 'denied'" class="text-[11px] text-muted-foreground">
                Bloqueaste el acceso a tu ubicación: permítelo en la configuración del navegador para este sitio.
              </span>
              <span v-else-if="locationStatus === 'unavailable'" class="text-[11px] text-muted-foreground">
                No se pudo obtener tu ubicación. Revisa que el GPS esté activo e inténtalo de nuevo.
              </span>
            </template>
          </dd>
        </div>

        <div class="grid gap-1">
          <dt :class="label"><Route class="size-3.5" aria-hidden="true" /> Cómo llegar</dt>
          <dd>
            <ZoneDirections :latitude="zone.latitude" :longitude="zone.longitude" :origin="position" />
          </dd>
        </div>

        <div class="grid gap-1">
          <dt :class="label"><Clock class="size-3.5" aria-hidden="true" /> Horario de atención</dt>
          <dd>
            <p v-for="line in hours" :key="line" :class="[value, unknown(line)]">{{ line }}</p>
          </dd>
        </div>
      </dl>

      <div class="grid content-start gap-2">
        <p :class="label">Fotos</p>
        <div v-if="!hasPhotos && googleLoading" class="grid grid-cols-3 gap-2" role="status" aria-label="Cargando fotos">
          <Skeleton v-for="i in 3" :key="i" class="aspect-[4/3] rounded-lg" />
        </div>
        <p v-else-if="!hasPhotos" class="flex items-center gap-1.5 text-[13px] text-muted-foreground italic">
          <ImageOff class="size-4" aria-hidden="true" /> {{ UNKNOWN_TEXT }}
        </p>
        <ul v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <li v-for="p in uploadedPhotos" :key="p.id">
            <a :href="p.url" target="_blank" rel="noopener noreferrer" :class="thumb">
              <img
                :src="p.url"
                :alt="`Foto de ${zone.name}`"
                loading="lazy"
                class="size-full object-cover transition-transform hover:scale-[1.03]"
                @error="markBroken(p.id)"
              />
            </a>
          </li>
          <li v-for="(p, i) in googlePhotos" :key="p.url" class="grid gap-0.5">
            <a :href="p.url" target="_blank" rel="noopener noreferrer" :class="thumb">
              <img
                :src="p.url"
                :alt="`Foto de ${zone.name} en Google ${i + 1}`"
                loading="lazy"
                class="size-full object-cover transition-transform hover:scale-[1.03]"
              />
            </a>
            <GooglePhotoAttribution :attributions="p.attributions" />
          </li>
        </ul>
      </div>
    </div>
  </SectionCard>
</template>
