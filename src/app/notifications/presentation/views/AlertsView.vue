<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Bell, Trash2 } from '@lucide/vue'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/app/shared/presentation/components/ui/tabs'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useNotificationStore } from '../../application/notification.store'
import type { Notification } from '../../domain/model/notification.model'
import { NOTIFICATION_META } from '../notification-ui'
import PageHeader from '../../../shared/presentation/components/PageHeader.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'
import { formatRelative } from '../../../shared/helpers/date'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const activeTab = ref<'all' | 'unread'>('all')
const userId = computed(() => authStore.user?.id ?? 0)

const notifications = computed(() => notificationStore.notifications as Notification[])
const displayed = computed(() =>
  activeTab.value === 'unread' ? notifications.value.filter(n => !n.isRead) : notifications.value,
)

async function handleMarkAsRead(n: Notification) {
  if (n.isRead) return
  await notificationStore.markAsRead(n.id)
}

onMounted(() => notificationStore.fetchAll(userId.value))
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader title="Alertas" sub="Tus notificaciones y avisos del sistema">
      <template v-if="notificationStore.unreadCount > 0" #actions>
        <Button variant="outline" size="sm" class="mt-1 h-8 text-xs" @click="notificationStore.markAllAsRead()">
          Marcar todas como leídas
        </Button>
      </template>
    </PageHeader>

    <Tabs v-model="activeTab">
      <TabsList aria-label="Filtrar notificaciones">
        <TabsTrigger value="all">
          Todas
          <span class="rounded-[10px] bg-border px-[7px] py-px text-[11px] font-bold text-muted-foreground">{{ notifications.length }}</span>
        </TabsTrigger>
        <TabsTrigger value="unread">
          No leídas
          <span
            v-if="notificationStore.unreadCount > 0"
            class="rounded-[10px] bg-zone-ocupado px-[7px] py-px text-[11px] font-bold text-white"
          >{{ notificationStore.unreadCount }}</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <StateMessage v-if="notificationStore.loading">Cargando notificaciones...</StateMessage>
    <StateMessage v-else-if="notificationStore.error" tone="error">{{ notificationStore.error }}</StateMessage>
    <StateMessage
      v-else-if="displayed.length === 0"
      tone="empty"
      :icon="Bell"
      :title="activeTab === 'unread' ? 'No tienes notificaciones sin leer' : 'Sin notificaciones'"
    />

    <ul v-else class="flex flex-col gap-2.5">
      <li
        v-for="n in displayed"
        :key="n.id"
        class="flex cursor-pointer items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-shadow hover:shadow-[0_3px_10px_rgba(0,0,0,0.07)]"
        :class="n.isRead ? 'bg-card' : 'border-primary/30 bg-primary/[0.04]'"
        @click="handleMarkAsRead(n)"
      >
        <div class="flex shrink-0 flex-col items-center gap-1.5">
          <span class="flex size-10 items-center justify-center rounded-[10px]" :class="NOTIFICATION_META[n.type].tone">
            <component :is="NOTIFICATION_META[n.type].icon" class="size-[18px]" aria-hidden="true" />
          </span>
          <span v-if="!n.isRead" class="size-[7px] rounded-full bg-primary" aria-hidden="true" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="mb-1 flex items-center gap-2">
            <Badge variant="neutral" class="px-2 text-[11px] font-semibold" :class="NOTIFICATION_META[n.type].tone">
              {{ NOTIFICATION_META[n.type].label }}
            </Badge>
            <span class="text-[11px] text-muted-foreground first-letter:uppercase">{{ formatRelative(n.sentAt ?? n.createdAt) }}</span>
          </div>
          <p class="mb-1.5 text-[13px] leading-normal text-foreground">{{ n.message }}</p>
          <RouterLink
            v-if="n.zoneId"
            :to="`/dashboard/zones/${n.zoneId}`"
            class="rounded-sm text-[11px] font-semibold text-link hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            @click.stop
          >
            Ver zona →
          </RouterLink>
        </div>

        <div class="flex shrink-0 items-center gap-1 pt-0.5">
          <button
            v-if="!n.isRead"
            type="button"
            class="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-link transition-colors hover:bg-primary/20 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
            title="Marcar como leída"
            @click.stop="handleMarkAsRead(n)"
          >
            Nueva
            <span class="sr-only">· marcar como leída</span>
          </button>
          <span v-else class="px-2 text-[10px] font-medium text-muted-foreground">Leída</span>
          <Button
            variant="ghost"
            size="icon-sm"
            class="size-7 text-muted-foreground/60 hover:bg-destructive-soft hover:text-destructive"
            aria-label="Eliminar notificación"
            title="Eliminar"
            @click.stop="notificationStore.deleteNotification(n.id)"
          >
            <Trash2 class="size-[13px]" />
          </Button>
        </div>
      </li>
    </ul>
  </div>
</template>
