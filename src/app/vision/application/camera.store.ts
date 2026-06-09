import { defineStore } from 'pinia'
import { useAsyncState } from '../../shared/helpers/async-state'
import { CameraApi } from '../infrastructure/camera-api'
import { toCamera } from '../infrastructure/camera-assembler'
import type { Camera } from '../domain/model/camera.model'

const cameraApi = new CameraApi()

export const useCameraStore = defineStore('camera', () => {
  const camerasState = useAsyncState<Camera[]>([])

  async function fetchByZone(zoneId: string | number) {
    camerasState.setLoading()
    try {
      const responses = await cameraApi.getByZone(zoneId)
      camerasState.setData(responses.map(toCamera))
    } catch (err: any) {
      camerasState.setError(err?.message ?? 'Error al cargar cámaras')
    }
  }

  return {
    cameras:        camerasState.data,
    camerasLoading: camerasState.loading,
    camerasError:   camerasState.error,
    fetchByZone,
  }
})
