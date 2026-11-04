<script setup lang="ts">
import { computed, onMounted, onUnmounted, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { ChartNoAxesColumn, CircleUserRound, Users, Video } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { useAdminZonesStore }   from '../../application/admin-zones.store'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import { useAdminUsersStore }   from '../../application/admin-users.store'
import AdminPage from '../components/AdminPage.vue'
import { Download } from '@lucide/vue'
import { toast } from 'vue-sonner'
import OccupancyBar from '../components/OccupancyBar.vue'
import { hasLiveData, levelColor, NO_DATA_LABEL, weightedOccupancy } from '../../../analytics/domain/occupancy-level'
import { analyticsApi } from '../../../analytics/infrastructure/analytics-api'
import { ref } from 'vue'

const zonesStore   = useAdminZonesStore()
const camerasStore = useAdminCamerasStore()
const usersStore   = useAdminUsersStore()

/**
 * HU-20: ocupación global ponderada por capacidad (ocupados / capacidad de las zonas con datos), no
 * el promedio simple de porcentajes. Sin ninguna zona con datos se muestra "—".
 */
const globalOccupancy = computed(() => {
  const pct = weightedOccupancy(zonesStore.zones.map(z => ({
    occupied:       z.occupiedCount,
    capacity:       z.totalCapacity,
    classification: z.classification,
  })))
  return pct === null ? '—' : `${Math.round(pct)}%`
})

/** HU-20: ocupación actual de cada zona; las que no tienen lectura muestran "Sin datos" sin romper la lista. */
const zoneOccupancy = computed(() =>
  [...zonesStore.zones]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map(z => ({
      id:      z.id,
      name:    z.name,
      hasData: hasLiveData(z.classification),
      pct:     z.occupancyPercentage,
      color:   levelColor(z.classification),
      detail:  `${z.occupiedCount} de ${z.totalCapacity} ocupados`,
    })),
)

const exporting = ref(false)
async function exportCsv() {
  exporting.value = true
  try {
    await analyticsApi.exportAvailabilityCsv()
    toast.success('CSV descargado')
  } catch {
    toast.error('No se pudo exportar el CSV')
  } finally {
    exporting.value = false
  }
}

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
  { label: 'Ocupación global', value: globalOccupancy.value, icon: ChartNoAxesColumn, tone: 'bg-[#fff5f5] text-[#e53e3e]' },
])

const classifications = computed(() => [
  { label: 'Libre (<40%)',       count: countByClassification('LIBRE'),    dot: 'bg-zone-libre' },
  { label: 'Moderado (40-80%)',  count: countByClassification('MODERADO'), dot: 'bg-zone-moderado' },
  { label: 'Ocupado (>80%)',     count: countByClassification('OCUPADO'),  dot: 'bg-zone-ocupado' },
])

const shortcuts = [
  { label: 'Gestionar zonas',    to: '/admin/zones',   icon: CircleUserRound },
  { label: 'Gestionar cámaras',  to: '/admin/cameras', icon: Video },
  { label: 'Gestionar usuarios', to: '/admin/users',   icon: Users },
]

const loading = computed(() => zonesStore.loading || camerasStore.loading || usersStore.loading)

const cardBase = 'flex items-center gap-3.5 rounded-xl border bg-card p-5 text-left shadow-[var(--pv-shadow-sm)]'

/** HU-08/20: la ocupación del panel se refresca al mismo ritmo que capturan las cámaras (30 s). */
const REFRESH_MS = 30_000

let refreshTimer: ReturnType<typeof setInterval> | undefined
let disposed = false

onMounted(async () => {
  await Promise.all([
    zonesStore.fetchZones(),
    camerasStore.fetchCameras(),
    usersStore.fetchUsers(),
  ])
  if (disposed) return
  // Solo la ocupación cambia sola; usuarios y cámaras se recargan al entrar en la vista.
  refreshTimer = setInterval(() => zonesStore.fetchZones({ silent: true }), REFRESH_MS)
})

onUnmounted(() => {
  disposed = true
  clearInterval(refreshTimer)
})
</script>

<template>
  <AdminPage title="Dashboard" sub="Resumen general del sistema ParkVision" narrow>
    <template #actions>
      <Button variant="outline" class="h-9 text-[13px]" :disabled="loading || exporting" @click="exportCsv">
        <Download /> {{ exporting ? 'Exportando…' : 'Exportar CSV' }}
      </Button>
    </template>

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
        <h2 class="mb-3.5 text-[11px] font-semibold tracking-[1.2px] text-muted-foreground uppercase">Ocupación por zona</h2>
        <div class="overflow-hidden rounded-xl border bg-card shadow-[var(--pv-shadow-sm)]">
          <p v-if="!zoneOccupancy.length" class="px-5 py-6 text-center text-sm text-muted-foreground">Todavía no hay zonas registradas.</p>
          <ul v-else class="divide-y">
            <li v-for="z in zoneOccupancy" :key="z.id" class="flex items-center justify-between gap-4 px-5 py-3">
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium text-heading">{{ z.name }}</span>
                <span v-if="z.hasData" class="text-[11px] text-muted-foreground tabular-nums">{{ z.detail }}</span>
              </span>
              <OccupancyBar v-if="z.hasData" class="w-40 shrink-0" :percentage="z.pct" :color="z.color" />
              <span
                v-else
                class="shrink-0 rounded-full bg-muted px-2.5 py-[3px] font-mono text-[10px] font-semibold tracking-[0.6px] text-muted-foreground uppercase"
              >{{ NO_DATA_LABEL }}</span>
            </li>
          </ul>
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
