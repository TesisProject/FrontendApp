import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Prediction, PredictionModel } from '../domain/model/prediction.model'

// Mock data — reemplazar por predictionApi cuando el backend esté listo
function generateMockPredictions(zoneId: string, zoneName: string): Prediction[] {
  const now = new Date()
  const pattern = [0.25, 0.30, 0.55, 0.72, 0.80, 0.78, 0.65, 0.50, 0.60, 0.74, 0.45, 0.28]
  return pattern.map((occ, i) => {
    const target = new Date(now)
    target.setHours(now.getHours() + i + 1, 0, 0, 0)
    return {
      id:                  `mock-${zoneId}-${i}`,
      zoneId,
      zoneName,
      modelId:             'mock-model-1',
      predictedOccupancy:  occ,
      targetDatetime:      target.toISOString(),
      confidenceScore:     0.85 + Math.random() * 0.1,
      createdAt:           now.toISOString(),
    }
  })
}

const MOCK_MODEL: PredictionModel = {
  id:          'mock-model-1',
  version:     '1.3.0',
  algorithm:   'RANDOM_FOREST',
  accuracy:    0.91,
  deployedAt:  '2025-05-10T00:00:00Z',
}

const MOCK_ZONES = [
  { id: 'zone-1', name: 'Zona Norte' },
  { id: 'zone-2', name: 'Zona Centro' },
  { id: 'zone-3', name: 'Zona Sur' },
]

export const usePredictionStore = defineStore('predictions', () => {
  const predictions  = ref<Prediction[]>([])
  const activeModel  = ref<PredictionModel | null>(MOCK_MODEL)
  const zones        = ref(MOCK_ZONES)
  const selectedZone = ref(MOCK_ZONES[0])
  const loading      = ref(false)
  const error        = ref<string | null>(null)

  async function fetchPredictions(zoneId: string) {
    loading.value = true
    error.value   = null
    try {
      // TODO: reemplazar con predictionApi.getPredictions(zoneId) cuando el backend esté listo
      await new Promise(r => setTimeout(r, 600))
      const zone = zones.value.find(z => z.id === zoneId) ?? zones.value[0]
      predictions.value = generateMockPredictions(zone.id, zone.name)
    } catch {
      error.value = 'No se pudo cargar las predicciones'
    } finally {
      loading.value = false
    }
  }

  function selectZone(zoneId: string) {
    const zone = zones.value.find(z => z.id === zoneId)
    if (zone) selectedZone.value = zone
  }

  return { predictions, activeModel, zones, selectedZone, loading, error, fetchPredictions, selectZone }
})
