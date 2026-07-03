<script setup lang="ts">
/**
 * SubmitButton — botón primario del sistema de auth (submit de formulario).
 * Muestra un spinner y el `loadingLabel` mientras `loading` es true.
 */
defineProps<{
  label: string
  loading?: boolean
  loadingLabel?: string
}>()
</script>

<template>
  <button class="auth-btn" type="submit" :disabled="loading">
    <svg v-if="loading" class="auth-spinner" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="31.4" stroke-dashoffset="10" />
    </svg>
    {{ loading && loadingLabel ? loadingLabel : label }}
  </button>
</template>
