<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * AuthInput — input del sistema de auth.
 * - Soporta v-model (compatible con vee-validate: el padre usa
 *   `v-model="field" v-bind="fieldAttrs"`; los handlers de vee-validate llegan
 *   al <input> nativo vía $attrs).
 * - `type="password"` añade automáticamente el toggle mostrar/ocultar.
 * - Estados visuales con las props `error` / `valid`.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  type?: string
  error?: boolean
  valid?: boolean
}>(), { type: 'text' })

const model = defineModel<string>({ default: '' })

const show = ref(false)
const isPwd = computed(() => props.type === 'password')
const inputType = computed(() =>
  isPwd.value ? (show.value ? 'text' : 'password') : props.type,
)
</script>

<template>
  <div class="auth-input-wrap">
    <input
      v-model="model"
      v-bind="$attrs"
      :type="inputType"
      class="auth-input"
      :class="{
        'auth-input--pwd': isPwd,
        'auth-input--error': error,
        'auth-input--valid': valid,
      }"
    />
    <button
      v-if="isPwd"
      type="button"
      class="auth-eye"
      :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      @click="show = !show"
    >
      <svg v-if="show" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
      </svg>
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  </div>
</template>
