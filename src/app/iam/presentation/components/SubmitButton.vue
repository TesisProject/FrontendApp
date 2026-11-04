<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'

/**
 * SubmitButton — botón primario de los formularios de auth.
 * Muestra un spinner y el `loadingLabel` mientras `loading` es true. `disabled` bloquea el envío
 * mientras el formulario no cumple sus requisitos (p. ej. la política de contraseña).
 */
defineProps<{
  label: string
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
}>()
</script>

<template>
  <Button
    type="submit"
    size="xl"
    :disabled="loading || disabled"
    :aria-busy="loading"
    class="w-full shadow-brand hover:-translate-y-px hover:shadow-[0_8px_22px_rgba(242,137,74,0.34)] active:translate-y-0 active:scale-100 disabled:opacity-65"
  >
    <Loader2 v-if="loading" class="size-[18px] animate-spin" />
    {{ loading && loadingLabel ? loadingLabel : label }}
  </Button>
</template>
