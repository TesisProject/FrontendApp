<script setup lang="ts">
/**
 * AuthField — envoltorio de campo: label + control (slot) + mensaje.
 * Muestra el error (prioritario) o, en su defecto, un hint. Reserva alto para
 * que el layout no salte al aparecer el mensaje (min-height en .auth-field).
 */
defineProps<{
  label: string
  error?: string | null
  hint?: string | null
}>()
</script>

<template>
  <div class="auth-field">
    <label class="auth-label">{{ label }}</label>
    <slot />
    <Transition name="auth-msg">
      <span v-if="error" class="auth-field-error">{{ error }}</span>
      <span v-else-if="hint" class="auth-field-hint">{{ hint }}</span>
    </Transition>
  </div>
</template>
