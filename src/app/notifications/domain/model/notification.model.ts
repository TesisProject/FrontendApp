export type NotificationType = 'AVAILABILITY' | 'PREDICTION' | 'SYSTEM' | 'ALERT'

export interface Notification {
  id:        number
  userId:    number
  zoneId:    number | null
  type:      NotificationType
  message:   string
  isRead:    boolean
  sentAt:    string
  createdAt: string
}
