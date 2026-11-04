<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, Trash2 } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
import type { IsoDayOfWeek, OpeningHoursEntry } from '../../../parking/domain/model/opening-hours.model'
import {
  DAY_INITIALS, DAY_NAMES, ISO_DAYS,
  describeOpeningHours, fromOpeningHoursRanges, holidayTimes, openingHoursEntryError,
  sortOpeningHours, toOpeningHoursRanges,
  type OpeningHoursRange,
} from '../../../parking/domain/opening-hours'

/**
 * OpeningHoursEditor — horario de una zona como rangos: cada rango es un tramo inicio–fin aplicado a
 * los días que se marquen (L M X J V S D), más una fila aparte para feriados. Un día pertenece a un
 * solo rango (el backend admite un tramo por día): marcarlo en otro lo mueve. Los días sin rango
 * quedan cerrados; sin ningún rango ni feriados se emite `[]` ("Sin información"). Los errores se
 * muestran en la fila; quien lo usa debe bloquear el guardado con `openingHoursError`.
 */
const model = defineModel<OpeningHoursEntry[]>({ required: true })

interface EditableRange extends OpeningHoursRange {
  id: number
}

const DEFAULT_OPENS = '08:00'
const DEFAULT_CLOSES = '18:00'
const WEEKDAYS: IsoDayOfWeek[] = [1, 2, 3, 4, 5]

let nextId = 0
const withId = (r: OpeningHoursRange): EditableRange => ({ ...r, days: [...r.days], id: nextId++ })

const ranges = ref<EditableRange[]>([])
const holiday = ref({ open: false, opensAt: DEFAULT_OPENS, closesAt: DEFAULT_CLOSES })

function load(entries: readonly OpeningHoursEntry[]) {
  ranges.value = toOpeningHoursRanges(entries).map(withId)
  const h = holidayTimes(entries)
  // Feriados apagados conservan sus últimas horas para cuando se vuelvan a activar.
  holiday.value = h ? { open: true, ...h } : { ...holiday.value, open: false }
}

const entries = computed(() =>
  fromOpeningHoursRanges(
    ranges.value,
    holiday.value.open ? { opensAt: holiday.value.opensAt, closesAt: holiday.value.closesAt } : null,
  ),
)

const sameEntries = (a: readonly OpeningHoursEntry[], b: readonly OpeningHoursEntry[]) =>
  JSON.stringify(sortOpeningHours(a)) === JSON.stringify(sortOpeningHours(b))

load(model.value)

// Cambio desde fuera (abrir otra zona, prellenado de Google): se reconstruyen los rangos. Si es el
// eco de lo que emitió este editor, se conserva la forma en que el admin agrupó los días.
watch(model, (value) => {
  if (!sameEntries(value, entries.value)) load(value)
}, { deep: true })

watch(entries, (value) => {
  if (!sameEntries(value, model.value)) model.value = value
})

/** Rango al que pertenece cada día, para marcar los que ya están tomados por otro. */
const ownerOf = computed(() => {
  const owners = new Map<IsoDayOfWeek, number>()
  for (const r of ranges.value) for (const d of r.days) if (!owners.has(d)) owners.set(d, r.id)
  return owners
})

const rangeErrors = computed(() => ranges.value.map((r) => openingHoursEntryError(r)))
const holidayError = computed(() => (holiday.value.open ? openingHoursEntryError(holiday.value) : null))

const preview = computed(() => describeOpeningHours(model.value))

function toggleDay(range: EditableRange, day: IsoDayOfWeek) {
  if (range.days.includes(day)) {
    range.days = range.days.filter((d) => d !== day)
    return
  }
  for (const other of ranges.value) {
    if (other !== range) other.days = other.days.filter((d) => d !== day)
  }
  range.days = [...range.days, day].sort((a, b) => a - b)
}

function addRange() {
  // El primer rango arranca en Lun–Vie; los siguientes, sin días, para que el admin elija.
  const days = ranges.value.length === 0 ? WEEKDAYS.filter((d) => !ownerOf.value.has(d)) : []
  ranges.value.push(withId({ opensAt: DEFAULT_OPENS, closesAt: DEFAULT_CLOSES, days }))
}

function removeRange(index: number) {
  ranges.value.splice(index, 1)
}

function dayState(range: EditableRange, day: IsoDayOfWeek): 'selected' | 'taken' | 'free' {
  const owner = ownerOf.value.get(day)
  if (owner === range.id) return 'selected'
  return owner === undefined ? 'free' : 'taken'
}

const DAY_CHIP: Record<ReturnType<typeof dayState>, string> = {
  selected: 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
  taken:    'border-dashed border-input bg-transparent text-muted-foreground/60 hover:border-primary hover:text-heading',
  free:     'border-transparent bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
}

function dayTitle(range: EditableRange, day: IsoDayOfWeek): string {
  const state = dayState(range, day)
  if (state === 'taken') return `${DAY_NAMES[day]}: ya está en otro rango. Clic para moverlo aquí`
  return DAY_NAMES[day]
}
</script>

<template>
  <div class="grid gap-3">
    <ul v-if="ranges.length" class="grid divide-y rounded-lg border">
      <li v-for="(range, i) in ranges" :key="range.id" class="grid gap-1.5 px-3 py-3 sm:px-4">
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <div class="flex items-center gap-2">
            <Input
              v-model="range.opensAt"
              type="time"
              class="h-9 w-[7.5rem] px-2.5 text-body"
              :aria-label="`Rango ${i + 1}: hora de inicio`"
              :aria-invalid="!!rangeErrors[i]"
            />
            <span class="text-body text-muted-foreground">a</span>
            <Input
              v-model="range.closesAt"
              type="time"
              class="h-9 w-[7.5rem] px-2.5 text-body"
              :aria-label="`Rango ${i + 1}: hora de fin`"
              :aria-invalid="!!rangeErrors[i]"
            />
          </div>

          <div role="group" :aria-label="`Rango ${i + 1}: días`" class="flex flex-wrap gap-1.5">
            <button
              v-for="day in ISO_DAYS"
              :key="day"
              type="button"
              class="flex size-8 items-center justify-center rounded-full border text-caption font-semibold transition-colors
                     focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              :class="DAY_CHIP[dayState(range, day)]"
              :aria-pressed="dayState(range, day) === 'selected'"
              :aria-label="dayTitle(range, day)"
              :title="dayTitle(range, day)"
              @click="toggleDay(range, day)"
            >
              {{ DAY_INITIALS[day] }}
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            class="ml-auto text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
            :aria-label="`Eliminar rango ${i + 1}`"
            @click="removeRange(i)"
          >
            <Trash2 />
          </Button>
        </div>

        <p v-if="rangeErrors[i]" class="text-caption font-medium text-destructive" role="alert">{{ rangeErrors[i] }}</p>
        <p v-else-if="range.days.length === 0" class="text-caption text-muted-foreground">
          Marca los días en que aplica este horario; sin días no se guarda.
        </p>
      </li>
    </ul>

    <p v-else class="rounded-lg border border-dashed px-4 py-3 text-body text-muted-foreground">
      Sin rangos de horario. Si no conoces el horario, déjalo así: se mostrará «Sin información».
    </p>

    <Button
      type="button"
      variant="outline"
      class="justify-self-start border-dashed text-heading"
      @click="addRange"
    >
      <Plus /> Agregar rango de horario
    </Button>

    <div class="grid gap-1.5 rounded-lg border px-3 py-3 sm:px-4">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <span class="w-20 text-body font-semibold text-heading">Feriados</span>
        <label class="flex w-40 items-center gap-2 text-body" :class="holiday.open ? 'text-foreground' : 'text-muted-foreground'">
          <Switch v-model="holiday.open" aria-label="Feriados: abierto" />
          {{ holiday.open ? 'Abierto' : 'Sin información' }}
        </label>
        <div class="flex items-center gap-2">
          <Input
            v-model="holiday.opensAt"
            type="time"
            class="h-9 w-[7.5rem] px-2.5 text-body"
            aria-label="Feriados: hora de inicio"
            :disabled="!holiday.open"
            :aria-invalid="!!holidayError"
          />
          <span class="text-body text-muted-foreground">a</span>
          <Input
            v-model="holiday.closesAt"
            type="time"
            class="h-9 w-[7.5rem] px-2.5 text-body"
            aria-label="Feriados: hora de fin"
            :disabled="!holiday.open"
            :aria-invalid="!!holidayError"
          />
        </div>
      </div>
      <p v-if="holidayError" class="text-caption font-medium text-destructive" role="alert">{{ holidayError }}</p>
    </div>

    <div class="rounded-lg border border-dashed bg-muted/40 px-4 py-3">
      <p class="mb-1 text-micro font-semibold tracking-[0.04em] text-muted-foreground uppercase">Así se verá</p>
      <p class="text-body text-foreground">
        <template v-for="(line, i) in preview" :key="line">
          <span v-if="i > 0" class="mx-2 text-muted-foreground/60" aria-hidden="true">|</span>
          <span>{{ line }}</span>
        </template>
      </p>
    </div>
  </div>
</template>
