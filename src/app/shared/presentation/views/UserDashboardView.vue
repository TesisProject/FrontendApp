<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ChartNoAxesColumn, Check, ChevronRight, CircleX, House } from '@lucide/vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import { useZoneStore } from '../../../parking/application/zone.store'
import { useNotificationStore } from '../../../notifications/application/notification.store'
import { CLASSIFICATION_COLOR, CLASSIFICATION_LABEL } from '../../../parking/domain/zone-classification'
import { NOTIFICATION_META } from '../../../notifications/presentation/notification-ui'
import type { Zone, ZoneClassification } from '../../../parking/domain/model/zone.model'
import ClassificationBadge from '../../../parking/presentation/components/ClassificationBadge.vue'
import OccupancyMeter from '../../../parking/presentation/components/OccupancyMeter.vue'
import OccupancyRing from '../../../parking/presentation/components/OccupancyRing.vue'
import SpaceCounts from '../../../parking/presentation/components/SpaceCounts.vue'
import StateMessage from '../components/StateMessage.vue'
import { formatRelative } from '../../helpers/date'

const authStore  = useAuthStore()
const zoneStore  = useZoneStore()
const notifStore = useNotificationStore()

const userId = computed(() => authStore.user?.id ?? 0)
const zones  = computed(() => zoneStore.zones as Zone[])

const totalFree     = computed(() => zones.value.reduce((sum, z) => sum + z.freeCount, 0))
const totalOccupied = computed(() => zones.value.reduce((sum, z) => sum + z.occupiedCount, 0))

const globalOccupancy = computed(() => {
  const total = totalFree.value + totalOccupied.value
  return total === 0 ? 0 : Math.round((totalOccupied.value / total) * 100)
})

// zones sorted with most available first — surfaces where the user can park now
const sortedZones = computed(() =>
  [...zones.value].sort((a, b) => a.occupancyPercentage - b.occupancyPercentage),
)

const recentNotifications = computed(() => notifStore.notifications.slice(0, 5))

const metrics = computed(() => [
  { label: 'Zonas registradas', value: zones.value.length,   icon: House,             accent: '#3182ce', tint: '#ebf8ff' },
  { label: 'Espacios libres',   value: totalFree.value,      icon: Check,             accent: '#38a169', tint: '#f0fff4' },
  { label: 'Espacios ocupados', value: totalOccupied.value,  icon: CircleX,           accent: '#e53e3e', tint: '#fff5f5' },
  { label: 'Ocupación global',  value: globalOccupancy.value, unit: '%', icon: ChartNoAxesColumn, accent: '#f2894a', tint: '#fffbeb' },
])

const classifications = (['LIBRE', 'MODERADO', 'OCUPADO'] as ZoneClassification[]).map(c => ({
  key:   c,
  label: CLASSIFICATION_LABEL[c],
  color: CLASSIFICATION_COLOR[c],
  count: computed(() => zones.value.filter(z => z.classification === c).length),
}))

const card = 'rounded-2xl border border-border/60 bg-card shadow-card'
const sectionTitle = 'text-base font-semibold tracking-[-0.01em] text-heading'
const stagger = (i: number, base = 0) => ({ animationDelay: `${base + Math.min(i, 4) * 0.06}s` })

onMounted(() => {
  zoneStore.fetchZones()
  if (userId.value) notifStore.fetchAll(userId.value)
})
</script>

<template>
  <div class="mx-auto max-w-[1340px]">
    <header class="mb-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-6">
      <div>
        <span class="mb-2 inline-flex items-center gap-[7px] text-[11px] font-semibold tracking-[0.14em] text-link uppercase">
          <span class="live-dot" aria-hidden="true" />
          Panel en vivo
        </span>
        <h1 class="mb-1.5 font-display text-[27px] font-bold tracking-[-0.02em] text-heading capitalize">
          Hola, {{ authStore.user?.email?.split('@')[0] }}
        </h1>
        <p class="text-[13px] text-muted-foreground">El estado de los estacionamientos, en tiempo real</p>
      </div>
      <div class="flex shrink-0 flex-col items-start leading-none sm:items-end" aria-hidden="true">
        <span class="font-display text-[34px] font-bold tracking-[-0.02em] text-heading tabular-nums">
          {{ globalOccupancy }}<span class="ml-px text-lg text-muted-foreground">%</span>
        </span>
        <span class="mt-1.5 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">ocupación ahora</span>
      </div>
    </header>

    <StateMessage v-if="zoneStore.zonesLoading">Cargando métricas...</StateMessage>

    <template v-else>
      <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="(m, i) in metrics"
          :key="m.label"
          :class="card"
          class="relative flex animate-rise items-center gap-4 overflow-hidden p-5 transition-[transform,box-shadow] duration-200 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-(--accent) before:opacity-85 before:content-[''] hover:-translate-y-[3px] hover:shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
          :style="{ '--accent': m.accent, '--accent-tint': m.tint, ...stagger(i, 0.02) }"
        >
          <span class="flex size-12 shrink-0 items-center justify-center rounded-[13px] bg-(--accent-tint) text-(--accent) dark:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]">
            <component :is="m.icon" class="size-[22px]" aria-hidden="true" />
          </span>
          <span class="flex flex-col gap-[3px]">
            <span class="font-display text-[28px] leading-none font-bold tracking-[-0.02em] text-heading tabular-nums">
              {{ m.value }}<span v-if="m.unit" class="ml-px text-lg text-muted-foreground">{{ m.unit }}</span>
            </span>
            <span class="text-xs text-muted-foreground">{{ m.label }}</span>
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.7fr_1fr]">
        <!-- Main column -->
        <section>
          <div class="mb-3.5 flex items-center justify-between">
            <h2 :class="sectionTitle">Zonas monitoreadas</h2>
            <RouterLink to="/dashboard/zones" class="rounded-md text-[13px] font-semibold text-link hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
              Ver mapa →
            </RouterLink>
          </div>

          <div v-if="sortedZones.length === 0" :class="card" class="px-5 py-8">
            <StateMessage tone="empty" compact>No hay zonas registradas todavía.</StateMessage>
          </div>

          <div v-else class="flex flex-col gap-3">
            <RouterLink
              v-for="(zone, i) in sortedZones"
              :key="zone.id"
              :to="`/dashboard/zones/${zone.id}`"
              :class="card"
              class="group flex animate-rise items-center gap-[18px] px-[18px] py-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_22px_rgba(15,23,42,0.1)] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              :style="stagger(i, 0.1)"
            >
              <OccupancyRing :percentage="zone.occupancyPercentage" :color="CLASSIFICATION_COLOR[zone.classification]" />

              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center gap-2.5">
                  <span class="truncate text-[15px] font-bold text-heading">{{ zone.name }}</span>
                  <ClassificationBadge :classification="zone.classification" />
                </div>
                <span class="mb-2.5 block truncate text-xs text-muted-foreground">{{ zone.street }}, {{ zone.district }}</span>
                <OccupancyMeter
                  :percentage="zone.occupancyPercentage"
                  :color="CLASSIFICATION_COLOR[zone.classification]"
                  class="mb-2"
                />
                <SpaceCounts :free="zone.freeCount" :occupied="zone.occupiedCount" :total="zone.totalSpaces" />
              </div>

              <ChevronRight
                class="size-[18px] shrink-0 text-muted-foreground/60 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden="true"
              />
            </RouterLink>
          </div>
        </section>

        <!-- Side column -->
        <div class="flex flex-col gap-5">
          <section :class="card" class="p-5">
            <h2 :class="sectionTitle" class="mb-3.5">Estado por clasificación</h2>
            <ul class="divide-y divide-border/60">
              <li v-for="c in classifications" :key="c.key" class="flex items-center gap-2.5 py-2">
                <span class="size-2.5 shrink-0 rounded-full" :style="{ background: c.color }" />
                <span class="flex-1 text-[13px] font-semibold text-foreground/80">{{ c.label }}</span>
                <span class="font-display text-xl font-bold text-heading tabular-nums">{{ c.count.value }}</span>
              </li>
            </ul>
          </section>

          <section :class="card" class="p-5">
            <h2 :class="sectionTitle" class="mb-3.5">Ocupación global</h2>
            <div class="mb-3.5 flex items-center gap-3.5">
              <div class="h-3 flex-1 overflow-hidden rounded-lg bg-muted">
                <div
                  class="h-full rounded-lg bg-linear-to-r from-zone-moderado to-zone-ocupado transition-[width] duration-500 ease-out"
                  :style="{ width: `${globalOccupancy}%` }"
                />
              </div>
              <span class="min-w-10 font-display text-lg font-bold text-heading tabular-nums">
                {{ globalOccupancy }}<span class="text-xs text-muted-foreground">%</span>
              </span>
            </div>
            <div class="flex gap-5 text-[13px] text-foreground/80">
              <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-zone-ocupado" />{{ totalOccupied }} ocupados</span>
              <span class="flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-zone-libre" />{{ totalFree }} libres</span>
            </div>
          </section>

          <section :class="card" class="p-5">
            <div class="mb-3.5 flex items-center justify-between">
              <h2 :class="sectionTitle">Alertas recientes</h2>
              <RouterLink to="/dashboard/alerts" class="rounded-md text-[13px] font-semibold text-link hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
                Ver todas →
              </RouterLink>
            </div>

            <StateMessage v-if="notifStore.loading" compact>Cargando alertas...</StateMessage>
            <p v-else-if="recentNotifications.length === 0" class="py-2 text-[13px] text-muted-foreground">
              No tienes alertas recientes.
            </p>
            <ul v-else class="divide-y divide-border/60">
              <li v-for="n in recentNotifications" :key="n.id" class="flex items-start gap-2.5 py-[11px]">
                <span class="mt-1.5 size-2 shrink-0 rounded-full" :class="NOTIFICATION_META[n.type].dot" />
                <div class="flex min-w-0 flex-col gap-0.5">
                  <span class="text-[13px] leading-snug" :class="n.isRead ? 'text-foreground/80' : 'font-semibold text-heading'">
                    {{ n.message }}
                  </span>
                  <span class="text-[11px] text-muted-foreground">
                    {{ NOTIFICATION_META[n.type].label }} · {{ formatRelative(n.createdAt) }}
                  </span>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
