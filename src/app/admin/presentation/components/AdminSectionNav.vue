<script lang="ts">
export interface AdminSection {
  id:    string
  label: string
  hint?: string
  /** La sección tiene campos con error: se marca para guiar la corrección. */
  invalid?: boolean
}
</script>

<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

/**
 * AdminSectionNav — índice lateral de un formulario largo. No oculta secciones: cada ítem
 * desplaza el contenido hasta la suya (ver `useScrollSpy`) y resalta la que se está leyendo.
 * En pantallas angostas pasa a ser una fila horizontal desplazable sobre el contenido.
 */
defineProps<{
  sections: readonly AdminSection[]
  active:   string
  label?:   string
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <nav :aria-label="label ?? 'Secciones del formulario'">
    <ol class="flex gap-1 overflow-x-auto [scrollbar-width:none] md:flex-col md:overflow-visible">
      <li v-for="(s, i) in sections" :key="s.id" class="shrink-0">
        <button
          type="button"
          :aria-current="active === s.id ? 'step' : undefined"
          class="group relative flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors
                 hover:bg-card/70 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none
                 aria-[current=step]:bg-card aria-[current=step]:shadow-sm
                 md:py-2.5
                 before:absolute before:inset-y-2 before:left-0 before:hidden before:w-[3px] before:rounded-full before:bg-primary
                 md:aria-[current=step]:before:block"
          @click="emit('select', s.id)"
        >
          <span
            class="mt-px flex size-5 shrink-0 items-center justify-center rounded-[5px] border font-mono text-micro font-semibold
                   text-muted-foreground transition-colors
                   group-aria-[current=step]:border-primary group-aria-[current=step]:bg-primary group-aria-[current=step]:text-primary-foreground"
            aria-hidden="true"
          >{{ i + 1 }}</span>
          <span class="flex min-w-0 flex-col">
            <span class="flex items-center gap-1.5 text-body font-medium whitespace-nowrap text-muted-foreground transition-colors group-hover:text-foreground group-aria-[current=step]:font-semibold group-aria-[current=step]:text-heading">
              {{ s.label }}
              <CircleAlert v-if="s.invalid" class="size-3.5 text-destructive" aria-label="Con errores" />
            </span>
            <span v-if="s.hint" class="hidden text-caption text-muted-foreground md:block">{{ s.hint }}</span>
          </span>
        </button>
      </li>
    </ol>
  </nav>
</template>
