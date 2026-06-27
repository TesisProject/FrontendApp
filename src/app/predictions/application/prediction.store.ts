import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  OccupancyForecast,
  DayOfWeek,
  ZoneForecastComparison,
} from '../domain/model/prediction.model'
import { predictionApi } from '../infrastructure/prediction-api'
import { toForecast, toZoneComparison } from '../infrastructure/prediction-assembler'
import { ZoneApi } from '../../parking/infrastructure/zone-api'
import { SpaceApi } from '../../parking/infrastructure/space-api'
import type { ParkingSpace } from '../../parking/domain/model/space.model'

const zoneApi = new ZoneApi()
const spaceApi = new SpaceApi()

const JS_TO_BACKEND_DAY: DayOfWeek[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
]

function todayDayOfWeek(): DayOfWeek {
  return JS_TO_BACKEND_DAY[new Date().getDay()]
}

export const usePredictionStore = defineStore('predictions', () => {
  const zones        = ref<{ id: number; name: string }[]>([])
  const spots        = ref<ParkingSpace[]>([])
  const selectedZoneId = ref<number | null>(null)
  const selectedSpotId = ref<number | null>(null)
  const selectedDay  = ref<DayOfWeek>(todayDayOfWeek())
  const forecasts    = ref<OccupancyForecast[]>([])
  const loading      = ref(false)
  const error        = ref<string | null>(null)

  // Comparación predicción IA vs detección real de cámaras (nivel zona, ventana vigente)
  const comparison          = ref<ZoneForecastComparison | null>(null)
  const comparisonLoading   = ref(false)
  const comparisonUnavailable = ref<string | null>(null)

  const filteredForecasts = computed(() =>
    forecasts.value
      .filter(f => f.dayOfWeek === selectedDay.value)
      .sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay)
  )

  const modelVersion = computed(() => forecasts.value[0]?.modelVersion ?? null)

  async function loadZones() {
    try {
      const res = await zoneApi.getAll()
      zones.value = res.map(z => ({ id: z.id, name: z.name }))
    } catch {
      error.value = 'No se pudieron cargar las zonas'
    }
  }

  async function selectZone(zoneId: number) {
    selectedZoneId.value = zoneId
    selectedSpotId.value = null
    forecasts.value = []
    spots.value = []
    try {
      spots.value = (await spaceApi.getByZone(zoneId)).map(s => ({
        id:          s.id,
        zoneId:      s.zoneId,
        spaceNumber: s.spaceNumber,
        occupied:    s.currentStatus === 'OCCUPIED',
        lastUpdated: s.updatedAt,
      }))
    } catch {
      error.value = 'No se pudieron cargar los espacios'
    }
    await fetchComparison(zoneId)
  }

  /**
   * Carga la comparación predicción vs cámaras de la zona para la ventana vigente.
   * Un 404 (sin predicción de la IA para este bloque horario) no es un error: se trata como
   * "no disponible" para que la vista muestre un estado vacío amable.
   */
  async function fetchComparison(zoneId: number) {
    comparison.value = null
    comparisonUnavailable.value = null
    comparisonLoading.value = true
    try {
      const res = await predictionApi.getZoneComparison(zoneId)
      comparison.value = toZoneComparison(res)
    } catch (e) {
      const status = (e as { status?: number })?.status
      comparisonUnavailable.value = status === 404
        ? 'La IA aún no generó una predicción para la ventana horaria actual de esta zona.'
        : 'No se pudo cargar la comparación predicción vs cámaras.'
    } finally {
      comparisonLoading.value = false
    }
  }

  async function fetchForecasts(spotId: number) {
    selectedSpotId.value = spotId
    loading.value = true
    error.value   = null
    try {
      const res = await predictionApi.getBySpot(spotId)
      forecasts.value = res.map(toForecast)
    } catch {
      error.value = 'No se pudieron cargar las predicciones para este espacio'
    } finally {
      loading.value = false
    }
  }

  function selectDay(day: DayOfWeek) {
    selectedDay.value = day
  }

  return {
    zones, spots, selectedZoneId, selectedSpotId, selectedDay,
    forecasts, filteredForecasts, modelVersion,
    loading, error,
    comparison, comparisonLoading, comparisonUnavailable,
    loadZones, selectZone, fetchForecasts, fetchComparison, selectDay,
  }
})
