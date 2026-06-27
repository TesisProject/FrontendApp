import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { NotificationApi } from '../infrastructure/notification-api'
import { toNotification } from '../infrastructure/notification-assembler'
import type { Notification } from '../domain/model/notification.model'

const notificationApi = new NotificationApi()

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref<Notification[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const unreadCount = computed(
    () => notifications.value.filter((n) => !n.isRead).length,
  )

  async function fetchAll(userId: number) {
    loading.value = true
    error.value = null
    try {
      const responses = await notificationApi.getByUser(userId)
      notifications.value = responses
        .map(toNotification)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar notificaciones'
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId: number) {
    try {
      await notificationApi.markAsRead(notificationId)
      const n = notifications.value.find((n) => n.id === notificationId)
      if (n) n.isRead = true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al marcar como leída'
    }
  }

  async function markAllAsRead() {
    const unread = notifications.value.filter((n) => !n.isRead)
    await Promise.all(unread.map((n) => markAsRead(n.id)))
  }

  async function deleteNotification(notificationId: number) {
    try {
      await notificationApi.delete(notificationId)
      notifications.value = notifications.value.filter(
        (n) => n.id !== notificationId,
      )
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar notificación'
    }
  }

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchAll,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
})
