<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../../../app/iam/application/auth.store'
import { useNotificationStore } from '../../application/notification.store'
import type { Notification, NotificationType } from '../../domain/model/notification.model'

const router            = useRouter()
const authStore         = useAuthStore()
const notificationStore = useNotificationStore()

const activeTab = ref<'all' | 'unread'>('all')
const userId    = computed(() => authStore.user?.id ?? 0)

const displayed = computed(() =>
  activeTab.value === 'unread'
    ? (notificationStore.notifications as Notification[]).filter(n => !n.isRead)
    : (notificationStore.notifications as Notification[])
)

const typeIconPaths: Record<NotificationType, string> = {
  AVAILABILITY: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  PREDICTION:   'M18 20V10 M12 20V4 M6 20v-6',
  SYSTEM:       'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 8v4 M12 16h.01',
  ALERT:        'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
}

function typeLabel(type: NotificationType): string {
  return { AVAILABILITY: 'Disponibilidad', PREDICTION: 'Predicción', SYSTEM: 'Sistema', ALERT: 'Alerta' }[type]
}

function typeColor(type: NotificationType): string {
  return { AVAILABILITY: '#38a169', PREDICTION: '#3182ce', SYSTEM: '#888', ALERT: '#e53e3e' }[type]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)  return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `Hace ${hrs} h`
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function handleMarkAsRead(n: Notification) {
  if (n.isRead) return
  await notificationStore.markAsRead(n.id)
}

async function handleMarkAllAsRead() {
  await notificationStore.markAllAsRead(userId.value)
}

onMounted(() => notificationStore.fetchAll(userId.value))
</script>

<template>
  <div class="alerts-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Alertas</h1>
        <p class="page-subtitle">Tus notificaciones y avisos del sistema</p>
      </div>
      <button
        v-if="notificationStore.unreadCount > 0"
        class="mark-all-btn"
        @click="handleMarkAllAsRead"
      >
        Marcar todas como leídas
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
        Todas
        <span class="tab-count">{{ notificationStore.notifications.length }}</span>
      </button>
      <button class="tab" :class="{ active: activeTab === 'unread' }" @click="activeTab = 'unread'">
        No leídas
        <span class="tab-count unread" v-if="notificationStore.unreadCount > 0">
          {{ notificationStore.unreadCount }}
        </span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="notificationStore.loading" class="center-state">
      <span class="state-text">Cargando notificaciones...</span>
    </div>

    <!-- Error -->
    <div v-else-if="notificationStore.error" class="center-state">
      <span class="state-text error">{{ notificationStore.error }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="displayed.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <p class="empty-title">{{ activeTab === 'unread' ? 'No tienes notificaciones sin leer' : 'Sin notificaciones' }}</p>
    </div>

    <!-- List -->
    <div v-else class="notifications-list">
      <div
        v-for="n in displayed"
        :key="n.id"
        class="notification-card"
        :class="{ unread: !n.isRead }"
        @click="handleMarkAsRead(n)"
      >
        <div class="notif-left">
          <div class="type-icon" :style="{ background: typeColor(n.type) + '18', color: typeColor(n.type) }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="typeIconPaths[n.type]" />
            </svg>
          </div>
          <div v-if="!n.isRead" class="unread-dot" />
        </div>

        <div class="notif-body">
          <div class="notif-top">
            <span class="type-badge" :style="{ background: typeColor(n.type) + '18', color: typeColor(n.type) }">
              {{ typeLabel(n.type) }}
            </span>
            <span class="notif-date">{{ formatDate(n.sentAt ?? n.createdAt) }}</span>
          </div>
          <p class="notif-message">{{ n.message }}</p>
          <button
            v-if="n.zoneId"
            class="zone-link"
            @click.stop="router.push(`/dashboard/zones/${n.zoneId}`)"
          >
            Ver zona →
          </button>
        </div>

        <div class="notif-right">
          <span v-if="!n.isRead" class="unread-label">Nueva</span>
          <span v-else class="read-label">Leída</span>
          <button class="delete-btn" title="Eliminar" @click.stop="notificationStore.deleteNotification(n.id)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.alerts-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-title);
  margin: 0 0 4px;
}

.page-subtitle {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.mark-all-btn {
  padding: 7px 16px;
  background: none;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;
}
.mark-all-btn:hover { border-color: var(--color-title); color: var(--color-title); }

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  background: var(--color-border-soft);
  padding: 4px;
  border-radius: 10px;
  width: fit-content;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.tab.active { background: var(--color-card); color: var(--color-title); box-shadow: 0 1px 4px rgba(0,0,0,0.08); }

.tab-count {
  background: var(--color-border);
  color: #666;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}
.tab-count.unread { background: #e53e3e; color: white; }

/* States */
.center-state {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}
.state-text       { font-size: 14px; color: var(--color-faint); }
.state-text.error { color: #e53e3e; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 10px;
}
.empty-icon  { margin-bottom: 8px; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--color-muted); margin: 0; }

/* Notifications */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--color-card);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  padding: 14px 16px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
  position: relative;
}
.notification-card:hover    { box-shadow: 0 3px 10px rgba(0,0,0,0.07); }
.notification-card.unread   { border-color: #f2894a44; background: #fffbf8; }

.notif-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.type-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f2894a;
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.type-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.notif-date {
  font-size: 11px;
  color: #bbb;
  margin-left: auto;
}

.notif-message {
  font-size: 13px;
  color: #333;
  margin: 0 0 6px;
  line-height: 1.5;
}

.zone-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 11px;
  font-weight: 600;
  color: #f2894a;
  cursor: pointer;
  transition: color 0.2s;
}
.zone-link:hover { color: #e07a3a; }

.notif-right {
  flex-shrink: 0;
  padding-top: 2px;
}

.unread-label {
  font-size: 10px;
  font-weight: 700;
  color: #f2894a;
  background: #fff5ef;
  padding: 2px 8px;
  border-radius: 8px;
}

.read-label {
  font-size: 10px;
  color: #ccc;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #ccc;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  margin-top: 4px;
  transition: color 0.2s, background 0.2s;
}
.delete-btn:hover { color: #e53e3e; background: #fde8e8; }
</style>
