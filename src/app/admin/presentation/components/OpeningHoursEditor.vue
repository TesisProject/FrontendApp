<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Copy } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
import type { IsoDayOfWeek, OpeningHoursEntry } from '../../../parking/domain/model/opening-hours.model'
import {
  DAY_NAMES, ISO_DAYS, describeOpeningHours, openingHoursEntryError,
} from '../../../parking/domain/opening-hours'

/**
 * OpeningHoursEditor — horario de una zona: una fila por día (lunes a domingo) y una de feriados,
 * cada una con su switch "Abierto" y el tramo inicio–fin. Emite solo las filas abiertas; todo
 * apagado = `[]` ("Sin información"). Los errores se muestran en la fila; quien lo usa debe
 * bloquear el guardado con `openingHoursError`.
 */
const model = defineModel<OpeningHoursEntry[]>({ required: true })

interface Row {
  /** 1–7, o 0 para feriados. */
  key:      IsoDayOfWeek | 0
  label:    string
  open:     boolean
  opensAt:  string
  closesAt: string
}

const DEFAULT_OPENS = '08:00'
const DEFAULT_CLOSES = '18:00'

function rowsFrom(entries: readonly OpeningHoursEntry[]): Row[] {
  const find = (key: IsoDayOfWeek | 0) =>
    entries.find((e) => (key === 0 ? e.holiday : !e.holiday && e.dayOfWeek === key))
  const keys: (IsoDayOfWeek | 0)[] = [...ISO_DAYS, 0]
  return keys.map((key) => {
    const e = find(key)
    return {
      key,
      label:    key === 0 ? 'Feriados' : DAY_NAMES[key],
      open:     !!e,
      opensAt:  e?.opensAt ?? DEFAULT_OPENS,
      closesAt: e?.closesAt ?? DEFAULT_CLOSES,
    }
  })
}

function entriesFrom(rows: readonly Row[]): OpeningHoursEntry[] {
  return rows
    .filter((r) => r.open)
    .map((r) => ({
      dayOfWeek: r.key === 0 ? null : r.key,
      holiday:   r.key === 0,
      opensAt:   r.opensAt,
      closesAt:  r.closesAt,
    }))
}

const sameEntries = (a: readonly OpeningHoursEntry[], b: readonly OpeningHoursEntry[]) =>
  JSON.stringify(a) === JSON.stringify(b)

const rows = ref<Row[]>(rowsFrom(model.value))

// Cambio desde fuera (abrir otra zona, prellenado de Google): se reconstruyen las filas. Si es el
// eco de lo que emitió este editor, se conservan las horas de las filas apagadas.
watch(model, (entries) => {
  if (!sameEntries(entries, entriesFrom(rows.value))) rows.value = rowsFrom(entries)
}, { deep: true })

watch(rows, (r) => {
  const entries = entriesFrom(r)
  if (!sameEntries(entries, model.value)) model.value = entries
}, { deep: true })

const errors = computed(() => rows.value.map((r) => (r.open ? openingHoursEntryError(r) : null)))

const preview = computed(() => describeOpeningHours(model.value))

function copyMondayToWeekdays() {
  const monday = rows.value[0]!
  for (const row of rows.value.slice(1, 5)) {
    row.open = monday.open
    row.opensAt = monday.opensAt
    row.closesAt = monday.closesAt
  }
}

function clearAll() {
  for (const row of rows.value) row.open = false
}
</script>

<template>
  <div class="grid gap-2.5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-[11px] text-muted-foreground">
        Deja todo apagado si no conoces el horario: se mostrará «Sin información».
      </p>
      <div class="flex gap-1.5">
        <Button type="button" size="sm" variant="outline" @click="copyMondayToWeekdays">
          <Copy /> Copiar lunes a Lun–Vie
        </Button>
        <Button type="button" size="sm" variant="ghost" @click="clearAll">Limpiar</Button>
      </div>
    </div>

    <ul class="grid gap-1 rounded-lg border bg-muted/30 p-2">
      <li
        v-for="(row, i) in rows"
        :key="row.key"
        class="grid gap-1"
        :class="row.key === 0 && 'mt-1 border-t pt-2'"
      >
        <div class="grid grid-cols-[96px_auto_1fr] items-center gap-2.5 sm:grid-cols-[110px_96px_1fr]">
          <span class="text-[13px] font-medium text-navy">{{ row.label }}</span>
          <label class="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch v-model="row.open" :aria-label="`${row.label}: abierto`" />
            {{ row.open ? 'Abierto' : 'Cerrado' }}
          </label>
          <div v-if="row.open" class="flex items-center gap-1.5">
            <Input
              v-model="row.opensAt"
              type="time"
              class="h-8 min-w-0 px-2 text-[13px]"
              :aria-label="`${row.label}: hora de inicio`"
              :aria-invalid="!!errors[i]"
            />
            <span class="text-xs text-muted-foreground">a</span>
            <Input
              v-model="row.closesAt"
              type="time"
              class="h-8 min-w-0 px-2 text-[13px]"
              :aria-label="`${row.label}: hora de fin`"
              :aria-invalid="!!errors[i]"
            />
          </div>
          <span v-else class="text-xs text-muted-foreground/70">
            {{ row.key === 0 ? 'Sin información' : '—' }}
          </span>
        </div>
        <p v-if="errors[i]" class="text-[11px] text-destructive sm:pl-[220px]" role="alert">{{ errors[i] }}</p>
      </li>
    </ul>

    <div class="rounded-lg border border-dashed px-3 py-2">
      <p class="mb-0.5 text-[10px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">Así se verá</p>
      <p v-for="line in preview" :key="line" class="text-xs text-foreground">{{ line }}</p>
    </div>
  </div>
</template>
