import { httpClient } from '../../shared/infrastructure/http-client'
import type { NotificationResponse } from './notification-response'

export class NotificationApi {
  private base = '/notifications'

  getByUser(userId: number): Promise<NotificationResponse[]> {
    return httpClient.get<NotificationResponse[]>(`${this.base}?userId=${userId}`)
  }

  getUnreadByUser(userId: number): Promise<NotificationResponse[]> {
    return httpClient.get<NotificationResponse[]>(`${this.base}/unread?userId=${userId}`)
  }

  markAsRead(notificationId: number): Promise<void> {
    return httpClient.patch<void>(`${this.base}/${notificationId}/read`)
  }

  delete(notificationId: number): Promise<void> {
    return httpClient.delete<void>(`${this.base}/${notificationId}`)
  }
}
