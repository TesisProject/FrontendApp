<script setup lang="ts">
/**
 * AuthAlert — mensaje de error a nivel de formulario (p. ej. credenciales
 * inválidas). Se muestra/oculta con la transición auth-msg.
 */
defineProps<{ message?: string | null }>()
</script>

<template>
  <Transition name="auth-msg">
    <p v-if="message" class="auth-alert">{{ message }}</p>
  </Transition>
</template>
