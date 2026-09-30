<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { Label } from '@/app/shared/presentation/components/ui/label'
import { AUTH_FIELD_KEY } from './auth-field-context'

/**
 * AuthField — label + control (slot) + mensaje.
 * Muestra el error (prioritario) o, en su defecto, un hint, y reserva alto
 * para que el layout no salte al aparecer el mensaje. Enlaza label, mensaje y
 * aria-invalid con el control hijo vía provide/inject.
 */
const props = defineProps<{
  label: string
  error?: string | null
  hint?: string | null
}>()

const id        = useId()
const messageId = `${id}-message`
const message   = computed(() => props.error || props.hint || '')

provide(AUTH_FIELD_KEY, {
  id,
  describedBy: computed(() => (message.value ? messageId : undefined)),
  invalid:     computed(() => !!props.error),
})
</script>

<template>
  <div class="flex min-h-[74px] min-w-0 flex-col gap-1.5">
    <Label :for="id" class="leading-normal text-(--pv-label)">{{ label }}</Label>
    <slot />
    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-100 ease-in"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <span
        v-if="message"
        :id="messageId"
        class="text-xs"
        :class="error ? 'text-destructive' : 'text-muted-foreground'"
        :role="error ? 'alert' : undefined"
      >{{ message }}</span>
    </Transition>
  </div>
</template>
