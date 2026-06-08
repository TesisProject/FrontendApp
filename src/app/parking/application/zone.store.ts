import { defineStore } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { ZoneApi } from '../infrastructure/zone-api'
import { toZone } from '../infrastructure/zone-assembler'
import type { Zone } from '../domain/model/zone.model'

const zoneApi = new ZoneApi()

export const useZoneStore = defineStore('zone', () => {
  const zonesState = useAsyncState<Zone[]>([])
  const zoneState  = useAsyncState<Zone | null>(null)

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
    zoneState.setLoading()
    try {
      const response = await zoneApi.getById(id)
      zoneState.setData(toZone(response))
    } catch (err: any) {
      zoneState.setError(err?.message ?? 'Error al cargar la zona')
    }
  }

  return {
    zones:        zonesState.data,
    zonesLoading: zonesState.loading,
    zonesError:   zonesState.error,
    zone:         zoneState.data,
    zoneLoading:  zoneState.loading,
    fetchZones,
    fetchZone,
  }
})
