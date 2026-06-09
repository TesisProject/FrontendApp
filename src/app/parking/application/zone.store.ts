import { defineStore } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { ZoneApi } from '../infrastructure/zone-api'
import { SpaceApi } from '../infrastructure/space-api'
import { toZone } from '../infrastructure/zone-assembler'
import { toSpace } from '../infrastructure/space-assembler'
import type { Zone } from '../domain/model/zone.model'
import type { ParkingSpace } from '../domain/model/space.model'

const zoneApi  = new ZoneApi()
const spaceApi = new SpaceApi()

export const useZoneStore = defineStore('zone', () => {
  const zonesState  = useAsyncState<Zone[]>([])
  const zoneState   = useAsyncState<Zone | null>(null)
  const spacesState = useAsyncState<ParkingSpace[]>([])

  async function fetchZones() {
    zonesState.setLoading()
    try {
      const responses = await zoneApi.getAll()
      zonesState.setData(responses.map(toZone))
    } catch (err: any) {
      zonesState.setError(err?.message ?? 'Error al cargar zonas')
    }
  }

  async function fetchZone(id: number) {
    zoneState.reset()
    zoneState.setLoading()
    try {
      const response = await zoneApi.getById(id)
      zoneState.setData(toZone(response))
    } catch (err: any) {
      zoneState.setError(err?.message ?? 'Error al cargar la zona')
    }
  }

  async function fetchSpacesByZone(zoneId: number) {
    spacesState.setLoading()
    try {
      const responses = await spaceApi.getByZone(zoneId)
      spacesState.setData(responses.map(toSpace))
    } catch (err: any) {
      spacesState.setError(err?.message ?? 'Error al cargar espacios')
    }
  }

  return {
    zones:         zonesState.data,
    zonesLoading:  zonesState.loading,
    zonesError:    zonesState.error,
    zone:          zoneState.data,
    zoneLoading:   zoneState.loading,
    spaces:        spacesState.data,
    spacesLoading: spacesState.loading,
    spacesError:   spacesState.error,
    fetchZones,
    fetchZone,
    fetchSpacesByZone,
  }
})
