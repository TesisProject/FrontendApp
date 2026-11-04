import { httpClient } from '../../shared/infrastructure/http-client'
import type { ModelTrainingRun, ModelVersion } from '../domain/model/admin-model-training.model'

/** Reentrenamiento del modelo de predicción (HU-27), todo ADMIN. */
export const adminModelTrainingApi = {
  /** 202 en cuanto GitHub acepta la corrida; 503 MODEL_TRAINING_NOT_CONFIGURED / MODEL_TRAINING_UNAVAILABLE. */
  retrain(dryRun = false): Promise<void> {
    return httpClient.post('/prediction/model/retrain', { dryRun })
  },
  getRuns(limit = 20): Promise<ModelTrainingRun[]> {
    return httpClient.get(`/prediction/model/runs?limit=${limit}`)
  },
  getVersions(limit = 20): Promise<ModelVersion[]> {
    return httpClient.get(`/prediction/model/versions?limit=${limit}`)
  },
}
