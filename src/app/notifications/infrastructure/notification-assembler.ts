import type { Notification, NotificationType } from '../domain/model/notification.model'
import type { NotificationResponse } from './notification-response'

export function toNotification(r: NotificationResponse): Notification {
  return {
    id:        r.id,
    userId:    r.userId,
    zoneId:    r.zoneId,
    type:      r.type as NotificationType,
    message:   r.message,
    isRead:    r.isRead,
    sentAt:    r.sentAt,
    createdAt: r.createdAt,
  }
}
