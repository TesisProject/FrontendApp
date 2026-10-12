import { defineStore } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { ZoneApi } from '../infrastructure/zone-api'
import { SpaceApi } from '../infrastructure/space-api'
import { AvailabilityApi, type HistoryBucketQuery } from '../infrastructure/availability-api'
import { toZone } from '../infrastructure/zone-assembler'
import { toSpace } from '../infrastructure/space-assembler'
import { toZoneView } from '../infrastructure/zone-view-assembler'
import type { Zone } from '../domain/model/zone.model'
import type { ParkingSpace } from '../domain/model/space.model'
import type { ZoneView } from '../domain/model/zone-view.model'
import type {
  ZoneAvailabilityResponse, ZoneOccupancyHistoryBucketResponse, ZoneOccupancyHistoryPointResponse,
} from '../infrastructure/availability-response'

const zoneApi = new ZoneApi()
const spaceApi = new SpaceApi()
const availabilityApi = new AvailabilityApi()

/** Última disponibilidad conocida por zona (vision). Si vision falla, la zona se pinta sin ocupación. */
const availabilityByZone = new Map<number, ZoneAvailabilityResponse>()

async function loadAllAvailability(): Promise<void> {
  try {
    const all = await availabilityApi.getAll()
    all.forEach(a => availabilityByZone.set(a.zoneId, a))
  } catch {
    // La disponibilidad es progresiva: sin vision se muestran solo los datos estáticos.
  }
}

async function loadZoneAvailability(zoneId: number): Promise<ZoneAvailabilityResponse | undefined> {
  try {
    const availability = await availabilityApi.getByZone(zoneId)
    availabilityByZone.set(zoneId, availability)
    return availability
  } catch {
    return availabilityByZone.get(zoneId)
  }
}

// Margen antes de que caduque la URL presignada de una foto para pedir una nueva.
const IMAGE_URL_MARGIN_MS = 60_000

/**
 * Conserva la foto ya cargada si la cámara no ha tomado otra y su URL sigue vigente: cada respuesta
 * trae una URL presignada distinta y cambiarla sin motivo haría parpadear la imagen en cada refresco.
 */
function keepLoadedImages(prev: ZoneView[], next: ZoneView[], now = Date.now()): ZoneView[] {
  return next.map(view => {
    const old = prev.find(v => v.id === view.id)
    const stillValid = old?.expiresAt == null || old.expiresAt - IMAGE_URL_MARGIN_MS > now
    return old && old.capturedAt === view.capturedAt && old.imageUrl && stillValid
      ? { ...view, imageUrl: old.imageUrl, expiresAt: old.expiresAt }
      : view
  })
}

function occupiedSetOf(availability?: ZoneAvailabilityResponse): Set<number> {
  return new Set((availability?.spaces ?? []).filter(s => s.occupied).map(s => s.parkingSpaceId))
}

export const useZoneStore = defineStore('zone', () => {
  const zonesState = useAsyncState<Zone[]>([])
  const zoneState = useAsyncState<Zone | null>(null)
  const spacesState = useAsyncState<ParkingSpace[]>([])
  const historyState = useAsyncState<ZoneOccupancyHistoryPointResponse[]>([])
  const viewsState = useAsyncState<ZoneView[]>([])
  const historyBucketsState = useAsyncState<ZoneOccupancyHistoryBucketResponse[]>([])
  // Solo se aplica la respuesta de la última petición: si se cambia de periodo rápido, las viejas se descartan.
  let historyBucketsRequest = 0

  async function fetchZones() {
    zonesState.setLoading()
    try {
      const [responses] = await Promise.all([zoneApi.getAll(), loadAllAvailability()])
      zonesState.setData(responses.map(r => toZone(r, availabilityByZone.get(r.id))))
    } catch (err: any) {
      zonesState.setError(err?.message ?? 'Error al cargar zonas')
    }
  }

  async function fetchZone(id: number) {
    zoneState.reset()
    zoneState.setLoading()
    try {
      const [response, availability] = await Promise.all([
        zoneApi.getById(id),
        loadZoneAvailability(id),
      ])
      zoneState.setData(toZone(response, availability))
    } catch (err: any) {
      zoneState.setError(err?.message ?? 'Error al cargar la zona')
    }
  }

  async function fetchSpacesByZone(zoneId: number) {
    spacesState.setLoading()
    try {
      const [responses, availability] = await Promise.all([
        spaceApi.getByZone(zoneId),
        loadZoneAvailability(zoneId),
      ])
      const occupied = occupiedSetOf(availability)
      spacesState.setData(responses.map(r => toSpace(r, occupied.has(r.id))))
    } catch (err: any) {
      spacesState.setError(err?.message ?? 'Error al cargar espacios')
    }
  }

  async function fetchHistory(zoneId: number, options?: { silent?: boolean }) {
    if (!options?.silent) historyState.setLoading()
    try {
      const points = await availabilityApi.getZoneHistory(zoneId)
      // Orden cronológico garantizado para el gráfico.
      historyState.setData(
        [...points].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)),
      )
    } catch (err: any) {
      if (!options?.silent) {
        historyState.setError(err?.message ?? 'Error al cargar el historial')
      }
    }
  }

  /**
   * Historial agregado por el backend para el gráfico. Mientras carga se conservan los datos previos
   * (el gráfico se atenúa en vez de desaparecer). Devuelve si esta respuesta fue la que se aplicó.
   */
  async function fetchHistoryBuckets(
    zoneId: number,
    query: HistoryBucketQuery,
    options?: { silent?: boolean },
  ): Promise<boolean> {
    const request = ++historyBucketsRequest
    if (!options?.silent) historyBucketsState.setLoading()
    try {
      const buckets = await availabilityApi.getZoneHistoryBuckets(zoneId, query)
      if (request !== historyBucketsRequest) return false
      historyBucketsState.setData(
        [...buckets].sort((a, b) => a.bucketStart.localeCompare(b.bucketStart)),
      )
      return true
    } catch (err: any) {
      if (request !== historyBucketsRequest) return false
      if (options?.silent) historyBucketsState.setLoading(false)
      else historyBucketsState.setError(err?.message ?? 'Error al cargar el historial')
      return false
    }
  }

  /**
   * Vistas de cámara de la zona. Es progresivo: si vision no las ofrece (o falla), quedan vacías y
   * los espacios se muestran sin foto.
   */
  async function fetchViews(zoneId: number, options?: { silent?: boolean }) {
    if (!options?.silent) {
      viewsState.reset()
      viewsState.setLoading()
    }
    try {
      const views = (await availabilityApi.getZoneViews(zoneId)).map(r => toZoneView(r))
      viewsState.setData(keepLoadedImages(viewsState.data.value, views))
    } catch (err: any) {
      if (!options?.silent) viewsState.setError(err?.message ?? 'Error al cargar las vistas')
    }
  }

  /**
   * Refresco ligero para el timer del detalle: re-consulta solo la disponibilidad (vision) y
   * actualiza la zona y el estado de los espacios ya cargados, sin volver a pedir el catálogo.
   */
  async function refreshAvailability(zoneId: number) {
    const availability = await loadZoneAvailability(zoneId)
    if (!availability) return
    const currentZone = zoneState.data.value
    if (currentZone && currentZone.id === zoneId) {
      zoneState.setData({
        ...currentZone,
        occupiedCount:       availability.occupied,
        freeCount:           availability.available,
        occupancyPercentage: availability.occupancyPercentage,
        classification:      availability.classification as Zone['classification'],
      })
    }
    const occupied = occupiedSetOf(availability)
    spacesState.setData(
      spacesState.data.value.map(space =>
        space.zoneId === zoneId ? { ...space, occupied: occupied.has(space.id) } : space,
      ),
    )
  }

  return {
    zones: zonesState.data,
    zonesLoading: zonesState.loading,
    zonesError: zonesState.error,
    zone: zoneState.data,
    zoneLoading: zoneState.loading,
    zoneError: zoneState.error,
    spaces: spacesState.data,
    spacesLoading: spacesState.loading,
    spacesError: spacesState.error,
    history: historyState.data,
    historyLoading: historyState.loading,
    historyError: historyState.error,
    historyBuckets: historyBucketsState.data,
    historyBucketsLoading: historyBucketsState.loading,
    historyBucketsError: historyBucketsState.error,
    views: viewsState.data,
    viewsLoading: viewsState.loading,
    fetchZones,
    fetchZone,
    fetchSpacesByZone,
    fetchHistory,
    fetchHistoryBuckets,
    fetchViews,
    refreshAvailability,
  }
})
