<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { LocateFixed, Sparkles } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import { useNetworkStatus } from '../../../shared/presentation/composables/useNetworkStatus'
import ConnectivityNotice from '../../../parking/presentation/components/ConnectivityNotice.vue'
import { useUserLocation } from '../../../parking/presentation/composables/useUserLocation'
import { formatUpdatedClock } from '../../../parking/domain/availability-freshness'
import { haversineMeters, type LatLng } from '../../../parking/domain/geo'
import { RECOMMENDATION_RADIUS_KM, useRecommendationStore } from '../../application/recommendation.store'
import RecommendationCard from '../components/RecommendationCard.vue'

/**
 * RecommendationsView — HU-13: las zonas cercanas con más probabilidad de espacio libre. Se actualiza
 * sola cada 30 s y cuando el usuario se mueve más de 100 m, sin que tenga que hacer nada.
 */
const REFRESH_MS = 30_000
const MOVE_THRESHOLD_M = 100

const router = useRouter()
const store = useRecommendationStore()
const { online } = useNetworkStatus()
const { position, status: locationStatus, blocked: locationBlocked, request: requestLocation } = useUserLocation({ watch: true })

// Posición con la que se pidieron las últimas recomendaciones: el GPS reporta movimientos mínimos
// todo el tiempo y no vale la pena pedir otra vez por unos metros.
let lastOrigin: LatLng | null = null

watch(position, (pos) => {
  if (!pos) return
  if (!lastOrigin) {
    lastOrigin = pos
    store.fetchRecommendations(pos)
  } else if (haversineMeters(lastOrigin, pos) > MOVE_THRESHOLD_M) {
    lastOrigin = pos
    store.fetchRecommendations(pos, { silent: true })
  }
})

let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => {
    if (lastOrigin) store.fetchRecommendations(position.value ?? lastOrigin, { silent: true })
  }, REFRESH_MS)
})
onUnmounted(() => clearInterval(timer))

const updatedAt = computed(() => formatUpdatedClock(store.generatedAt))
const waitingLocation = computed(() => !position.value && ['idle', 'locating'].includes(locationStatus.value))
</script>

<template>
  <div class="mx-auto flex w-full max-w-reading flex-col gap-5">
    <PageHeader
      title="Recomendaciones"
      :sub="`Zonas a menos de ${RECOMMENDATION_RADIUS_KM} km con más probabilidad de encontrar espacio`"
    />

    <ConnectivityNotice :online="online" :location-status="locationStatus" :location-blocked="locationBlocked" @retry-location="requestLocation" />

    <StateMessage v-if="!position && locationStatus === 'locating'">Obteniendo tu ubicación...</StateMessage>
    <StateMessage v-else-if="waitingLocation" tone="empty" :icon="LocateFixed" title="Necesitamos tu ubicación">
      Para sugerirte zonas cercanas con espacio libre, activa la ubicación.
      <template #action>
        <Button size="sm" @click="requestLocation"><LocateFixed class="size-4" aria-hidden="true" /> Activar ubicación</Button>
      </template>
    </StateMessage>
    <StateMessage v-else-if="!position" tone="empty" :icon="LocateFixed">
      Sin tu ubicación no podemos calcular recomendaciones cercanas.
    </StateMessage>

    <template v-else>
      <StateMessage v-if="store.loading">Buscando las mejores zonas...</StateMessage>
      <StateMessage v-else-if="store.error" tone="error">{{ store.error }}</StateMessage>
      <StateMessage v-else-if="store.recommendations.length === 0" tone="empty" :icon="Sparkles">
        No hay sugerencias disponibles por el momento. Vuelve a intentarlo en unos minutos.
      </StateMessage>
      <template v-else>
        <div class="flex flex-col gap-3" aria-live="polite">
          <RecommendationCard
            v-for="(r, i) in store.recommendations"
            :key="r.zoneId"
            :recommendation="r"
            :rank="i + 1"
            @view-detail="router.push(`/dashboard/zones/${r.zoneId}`)"
          />
        </div>
        <p class="text-center text-caption text-muted-foreground">
          <template v-if="updatedAt">Actualizado a las {{ updatedAt }} · </template>
          se actualiza cada 30 segundos o al moverte. La disponibilidad estimada combina la ocupación
          actual con la predicción de los próximos minutos.
        </p>
      </template>
    </template>
  </div>
</template>
