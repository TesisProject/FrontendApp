<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAdminAuditStore, emptyAuditFilters, AUDIT_PAGE_SIZE } from '../../application/admin-audit.store'
import { useAdminZonesStore } from '../../application/admin-zones.store'
import { AUDIT_ACTIONS, AUDIT_ACTION_LABEL, auditActionLabel, type AuditFilters } from '../../domain/model/admin-audit.model'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import AdminPage from '../components/AdminPage.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminField from '../components/AdminField.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'

/**
 * Log de auditoría (HU-25): filtros por fecha, zona y tipo de evento; eventos del más reciente al más
 * antiguo, paginados; exportación a CSV con los filtros aplicados.
 */
const store      = useAdminAuditStore()
const zonesStore = useAdminZonesStore()
const filters    = ref<AuditFilters>(emptyAuditFilters())

const DATE_TIME = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium' })

const totalPages = computed(() => Math.max(1, Math.ceil(store.totalElements / AUDIT_PAGE_SIZE)))
const hasFilters = computed(() => Object.values(store.applied).some(v => v !== ''))

function zoneName(zoneId: number | null) {
  if (zoneId === null) return '—'
  return zonesStore.zones.find(z => z.id === zoneId)?.name ?? `Zona ${zoneId} (eliminada)`
}

const rangeError = ref<string | null>(null)

function applyFilters() {
  // Las fechas ISO (YYYY-MM-DD) se comparan bien como texto.
  const { from, to } = filters.value
  if (from && to && from > to) {
    rangeError.value = 'La fecha «Desde» no puede ser posterior a «Hasta»'
    return
  }
  rangeError.value = null
  void store.search(filters.value)
}

function clearFilters() {
  rangeError.value = null
  filters.value = emptyAuditFilters()
  void store.search(filters.value)
}

async function exportCsv() {
  const error = await store.exportCsv()
  if (error) toast.error(error)
  else toast.success('Log exportado a CSV')
}

onMounted(() => {
  void zonesStore.fetchZones({ silent: zonesStore.zones.length > 0 })
  void store.search(filters.value)
})
</script>

<template>
  <AdminPage title="Auditoría" :sub="`${store.totalElements} eventos${hasFilters ? ' con los filtros aplicados' : ''}`">
    <template #actions>
      <Button variant="outline" :disabled="store.exporting || store.loading" @click="exportCsv">
        <Download /> {{ store.exporting ? 'Exportando...' : 'Exportar CSV' }}
      </Button>
    </template>

    <form class="mb-4 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-5 sm:items-end" novalidate @submit.prevent="applyFilters">
      <AdminField v-slot="{ id }" label="Desde">
        <Input :id="id" v-model="filters.from" type="date" />
      </AdminField>
      <AdminField v-slot="{ id }" label="Hasta">
        <Input :id="id" v-model="filters.to" type="date" :min="filters.from || undefined" />
      </AdminField>
      <AdminField v-slot="{ id }" label="Zona">
        <NativeSelect :id="id" v-model="filters.zoneId">
          <NativeSelectOption value="">Todas</NativeSelectOption>
          <NativeSelectOption v-for="z in zonesStore.zones" :key="z.id" :value="z.id">{{ z.name }}</NativeSelectOption>
        </NativeSelect>
      </AdminField>
      <AdminField v-slot="{ id }" label="Tipo de evento">
        <NativeSelect :id="id" v-model="filters.action">
          <NativeSelectOption value="">Todos</NativeSelectOption>
          <NativeSelectOption v-for="a in AUDIT_ACTIONS" :key="a" :value="a">{{ AUDIT_ACTION_LABEL[a] }}</NativeSelectOption>
        </NativeSelect>
      </AdminField>
      <div class="flex gap-2">
        <Button type="submit" :disabled="store.loading">Filtrar</Button>
        <Button type="button" variant="outline" :disabled="store.loading" @click="clearFilters">Limpiar</Button>
      </div>
      <FormAlert :message="rangeError" class="sm:col-span-5" />
    </form>

    <AdminStateBox v-if="store.error" tone="error">{{ store.error }}</AdminStateBox>
    <AdminStateBox v-else-if="store.loading && store.entries.length === 0">Cargando eventos...</AdminStateBox>

    <template v-else>
      <AdminTableCard
        :columns="['Fecha y hora', 'Evento', 'Responsable', 'Zona', 'Entidad', 'Detalle']"
        :empty="store.entries.length === 0"
        :empty-text="hasFilters ? 'No hay eventos para los filtros aplicados' : 'Todavía no hay eventos registrados'"
      >
        <TableRow v-for="e in store.entries" :key="e.id">
          <TableCell class="text-body whitespace-nowrap">{{ DATE_TIME.format(new Date(e.occurredAt)) }}</TableCell>
          <TableCell class="font-semibold text-navy">{{ auditActionLabel(e.action) }}</TableCell>
          <TableCell class="text-body">{{ e.actorEmail ?? 'Sistema' }}</TableCell>
          <TableCell class="text-body">{{ zoneName(e.zoneId) }}</TableCell>
          <TableCell class="font-mono text-body">{{ e.entityType }}{{ e.entityId ? ` #${e.entityId}` : '' }}</TableCell>
          <TableCell class="max-w-[20rem] text-body break-words text-muted-foreground">{{ e.detail ?? '—' }}</TableCell>
        </TableRow>
      </AdminTableCard>

      <nav v-if="store.totalElements > AUDIT_PAGE_SIZE" class="mt-3 flex items-center justify-end gap-2 text-body" aria-label="Paginación">
        <Button size="sm" variant="outline" :disabled="store.page === 0 || store.loading" @click="store.goToPage(store.page - 1)">
          Anterior
        </Button>
        <span>Página {{ store.page + 1 }} de {{ totalPages }}</span>
        <Button size="sm" variant="outline" :disabled="store.page + 1 >= totalPages || store.loading" @click="store.goToPage(store.page + 1)">
          Siguiente
        </Button>
      </nav>
    </template>
  </AdminPage>
</template>
