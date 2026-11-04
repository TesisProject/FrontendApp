/** Una corrida del reentrenamiento (`GET /prediction/model/runs`). */
export interface ModelTrainingRun {
  id:         number
  runNumber:  number | null
  /** `schedule` (cron horario) o `workflow_dispatch` (a pedido). */
  trigger:    string
  status:     string
  conclusion: string | null
  failed:     boolean
  startedAt:  string | null
  finishedAt: string | null
  logsUrl:    string | null
}

/** Una versión publicada del modelo (`GET /prediction/model/versions`). */
export interface ModelVersion {
  id:              number
  modelVersion:    string
  runId:           number | null
  publishedAt:     string
  lastPublishedAt: string
  zonesPublished:  number
}

export type RunTone = 'success' | 'warning' | 'destructive' | 'neutral'

/** Texto y color del estado de una corrida para la tabla. */
export function runStatus(run: Pick<ModelTrainingRun, 'status' | 'conclusion'>): { label: string; tone: RunTone } {
  if (run.status !== 'completed') {
    return run.status === 'in_progress'
      ? { label: 'En curso', tone: 'warning' }
      : { label: 'En cola', tone: 'neutral' }
  }
  switch (run.conclusion) {
    case 'success':         return { label: 'Completada', tone: 'success' }
    case 'failure':         return { label: 'Falló', tone: 'destructive' }
    case 'timed_out':       return { label: 'Tiempo agotado', tone: 'destructive' }
    case 'startup_failure': return { label: 'No pudo iniciar', tone: 'destructive' }
    case 'cancelled':       return { label: 'Cancelada', tone: 'neutral' }
    case 'skipped':         return { label: 'Omitida', tone: 'neutral' }
    default:                return { label: run.conclusion ?? 'Terminada', tone: 'neutral' }
  }
}

export function runTriggerLabel(trigger: string): string {
  if (trigger === 'schedule') return 'Programada'
  if (trigger === 'workflow_dispatch') return 'A pedido'
  return trigger
}

/** `true` mientras alguna corrida no terminó: la vista refresca la lista cada pocos segundos. */
export function hasActiveRun(runs: Pick<ModelTrainingRun, 'status'>[]): boolean {
  return runs.some(r => r.status !== 'completed')
}
