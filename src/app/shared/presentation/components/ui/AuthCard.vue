<script setup lang="ts">
/**
 * AuthCard — tarjeta base del sistema de auth.
 * Provee la animación de entrada, el botón "volver" opcional y la cabecera
 * (eyebrow · título · subtítulo). El contenido (formulario, enlaces) va en el
 * slot por defecto. Estilos: clases .auth-* en src/style.css.
 */
defineProps<{
  eyebrow?: string
  title: string
  sub?: string
  back?: boolean
}>()

defineEmits<{ back: [] }>()
</script>

<template>
  <div class="auth-card">
    <button
      v-if="back"
      type="button"
      class="auth-back"
      aria-label="Volver"
      @click="$emit('back')"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
    </button>

    <p v-if="eyebrow" class="auth-eyebrow">{{ eyebrow }}</p>
    <h1 class="auth-title">{{ title }}</h1>
    <p v-if="sub" class="auth-sub">{{ sub }}</p>

    <slot />
  </div>
</template>
