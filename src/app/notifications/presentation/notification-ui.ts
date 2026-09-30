import type { Component } from 'vue'
import { ChartNoAxesColumn, House, Info, TriangleAlert } from '@lucide/vue'
import type { NotificationType } from '../domain/model/notification.model'

/** Etiqueta, ícono y colores por tipo de notificación (lista de alertas y dashboard). */
export const NOTIFICATION_META: Record<NotificationType, {
  label: string
  icon:  Component
  /** Tinte de fondo + texto para íconos y badges. */
  tone:  string
  /** Color sólido para puntos indicadores. */
  dot:   string
}> = {
  AVAILABILITY: { label: 'Disponibilidad', icon: House,             tone: 'bg-success-soft text-success',                                              dot: 'bg-zone-libre' },
  PREDICTION:   { label: 'Predicción',     icon: ChartNoAxesColumn, tone: 'bg-navy-soft text-[#1a56c4] dark:bg-[#1a56c4]/25 dark:text-[#93c5fd]', dot: 'bg-[#3182ce]' },
  SYSTEM:       { label: 'Sistema',        icon: Info,              tone: 'bg-muted text-muted-foreground',                                            dot: 'bg-muted-foreground' },
  ALERT:        { label: 'Alerta',         icon: TriangleAlert,     tone: 'bg-destructive-soft text-destructive',                                      dot: 'bg-zone-ocupado' },
}
