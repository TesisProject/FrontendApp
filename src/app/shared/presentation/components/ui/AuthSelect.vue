<script setup lang="ts">
/**
 * AuthSelect — <select> nativo con el estilo del sistema de auth.
 * Mismo contrato que AuthInput: v-model + props `error` / `valid`; los
 * handlers de vee-validate llegan al <select> vía $attrs.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  options: { value: string; label: string }[]
  error?: boolean
  valid?: boolean
}>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="auth-input-wrap">
    <select
      v-model="model"
      v-bind="$attrs"
      class="auth-input auth-select"
      :class="{ 'auth-input--error': error, 'auth-input--valid': valid }"
    >
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
  </div>
</template>
