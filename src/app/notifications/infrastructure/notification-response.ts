export interface NotificationResponse {
  id:        number
  userId:    number
  zoneId:    number | null
  type:      string
  message:   string
  isRead:    boolean
  sentAt:    string
  createdAt: string
}
