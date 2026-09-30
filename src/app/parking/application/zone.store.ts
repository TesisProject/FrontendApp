import { defineStore } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { ZoneApi } from '../infrastructure/zone-api'
import { SpaceApi } from '../infrastructure/space-api'
import { AvailabilityApi } from '../infrastructure/availability-api'
import { toZone } from '../infrastructure/zone-assembler'
import { toSpace } from '../infrastructure/space-assembler'
import type { Zone } from '../domain/model/zone.model'
import type { ParkingSpace } from '../domain/model/space.model'
import type { ZoneAvailabilityResponse, ZoneOccupancyHistoryPointResponse } from '../infrastructure/availability-response'

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

function occupiedSetOf(availability?: ZoneAvailabilityResponse): Set<number> {
  return new Set((availability?.spaces ?? []).filter(s => s.occupied).map(s => s.parkingSpaceId))
}

export const useZoneStore = defineStore('zone', () => {
  const zonesState = useAsyncState<Zone[]>([])
  const zoneState = useAsyncState<Zone | null>(null)
  const spacesState = useAsyncState<ParkingSpace[]>([])
  const historyState = useAsyncState<ZoneOccupancyHistoryPointResponse[]>([])

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
    fetchZones,
    fetchZone,
    fetchSpacesByZone,
    fetchHistory,
    refreshAvailability,
  }
})
