<script setup lang="ts">
import { Table, TableBody, TableEmpty, TableHead, TableHeader, TableRow } from '@/app/shared/presentation/components/ui/table'

/**
 * AdminTableCard — tabla de datos del panel dentro de una tarjeta.
 * `columns` define la cabecera; las filas van en el slot por defecto y, si
 * `empty` es true, se muestra `emptyText` ocupando todas las columnas.
 */
defineProps<{
  columns: string[]
  empty: boolean
  emptyText: string
}>()
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-card shadow-[var(--pv-shadow-sm)]">
    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead v-for="c in columns" :key="c">{{ c }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="empty" :colspan="columns.length">{{ emptyText }}</TableEmpty>
        <slot v-else />
      </TableBody>
    </Table>
  </div>
</template>
