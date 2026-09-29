<script setup lang="ts">
import { computed, onMounted, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { ChartNoAxesColumn, CircleUserRound, Users, Video } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { useAdminZonesStore }   from '../../application/admin-zones.store'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminUsersStore }   from '../../application/admin-users.store'
import AdminPage from '../components/AdminPage.vue'

const zonesStore   = useAdminZonesStore()
const camerasStore = useAdminCamerasStore()
const usersStore   = useAdminUsersStore()

const globalOccupancy = computed(() => {
  if (!zonesStore.zones.length) return 0
  const avg = zonesStore.zones.reduce((s, z) => s + z.occupancyPercentage, 0) / zonesStore.zones.length
  return Math.round(avg)
})

const countByClassification = (c: string) => zonesStore.zones.filter(z => z.classification === c).length

interface Metric {
  label: string
  value: string | number
  total?: number
  icon:  Component
  tone:  string
  to?:   string
}

const metrics = computed<Metric[]>(() => [
  { label: 'Zonas registradas',    value: zonesStore.zones.length, icon: CircleUserRound,   tone: 'bg-[#ebf8ff] text-[#3182ce]', to: '/admin/zones' },
  { label: 'Usuarios registrados', value: usersStore.users.length, icon: Users,             tone: 'bg-[#f0fff4] text-[#38a169]', to: '/admin/users' },
  {
    label: 'Cámaras activas',
    value: camerasStore.cameras.filter(c => c.active).length,
    total: camerasStore.cameras.length,
    icon:  Video,
    tone:  'bg-[#fff5eb] text-[#f2894a]',
    to:    '/admin/cameras',
  },
  { label: 'Ocupación global', value: `${globalOccupancy.value}%`, icon: ChartNoAxesColumn, tone: 'bg-[#fff5f5] text-[#e53e3e]' },
])

const classifications = computed(() => [
  { label: 'Libre (<30%)',       count: countByClassification('LIBRE'),    dot: 'bg-zone-libre' },
  { label: 'Moderado (30-70%)',  count: countByClassification('MODERADO'), dot: 'bg-zone-moderado' },
  { label: 'Ocupado (>70%)',     count: countByClassification('OCUPADO'),  dot: 'bg-zone-ocupado' },
])

const shortcuts = [
  { label: 'Gestionar zonas',    to: '/admin/zones',   icon: CircleUserRound },
  { label: 'Gestionar cámaras',  to: '/admin/cameras', icon: Video },
  { label: 'Gestionar usuarios', to: '/admin/users',   icon: Users },
]

const loading = computed(() => zonesStore.loading || camerasStore.loading || usersStore.loading)

const cardBase = 'flex items-center gap-3.5 rounded-xl border bg-card p-5 text-left shadow-[var(--pv-shadow-sm)]'

onMounted(() => Promise.all([
  zonesStore.fetchZones(),
  camerasStore.fetchCameras(),
  usersStore.fetchUsers(),
]))
</script>

<template>
  <AdminPage title="Dashboard" sub="Resumen general del sistema ParkVision" narrow>
    <div class="mb-8 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" :class="cardBase" aria-hidden="true">
          <div class="size-12 shrink-0 animate-pulse rounded-xl bg-muted" />
          <div class="grid gap-1.5">
            <span class="h-6 w-14 animate-pulse rounded-md bg-muted" />
            <span class="h-3 w-28 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </template>

      <template v-else>
        <component
          :is="m.to ? RouterLink : 'div'"
          v-for="m in metrics"
          :key="m.label"
          :to="m.to"
          :class="[
            cardBase,
            m.to && 'transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#c3d4f5] hover:shadow-[0_6px_18px_rgba(9,44,76,0.12)] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none active:translate-y-0 motion-reduce:transition-none',
          ]"
        >
          <span class="flex size-12 shrink-0 items-center justify-center rounded-xl" :class="m.tone">
            <component :is="m.icon" class="size-[22px]" />
          </span>
          <span class="flex flex-col gap-0.5">
            <span class="font-signage text-[34px] leading-none font-semibold text-navy tabular-nums">
              {{ m.value }}<span v-if="m.total !== undefined" class="text-base font-medium text-muted-foreground">/{{ m.total }}</span>
            </span>
            <span class="text-xs text-muted-foreground">{{ m.label }}</span>
          </span>
        </component>
      </template>
    </div>

    <template v-if="!loading">
      <section class="mb-7">
        <h2 class="mb-3.5 text-[11px] font-semibold tracking-[1.2px] text-muted-foreground uppercase">Estado de zonas</h2>
        <div class="grid gap-3.5 sm:grid-cols-3">
          <div v-for="c in classifications" :key="c.label" :class="cardBase">
            <span class="size-3.5 shrink-0 rounded-full" :class="c.dot" />
            <div>
              <p class="mb-0.5 font-signage text-[34px] leading-none font-semibold text-navy tabular-nums">{{ c.count }}</p>
              <p class="text-xs text-muted-foreground">{{ c.label }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mb-7">
        <h2 class="mb-3.5 text-[11px] font-semibold tracking-[1.2px] text-muted-foreground uppercase">Accesos rápidos</h2>
        <div class="flex flex-wrap gap-3">
          <Button
            v-for="s in shortcuts"
            :key="s.to"
            as-child
            variant="outline"
            class="h-10 text-[13px] text-navy"
          >
            <RouterLink :to="s.to"><component :is="s.icon" /> {{ s.label }}</RouterLink>
          </Button>
        </div>
      </section>
    </template>
  </AdminPage>
</template>
