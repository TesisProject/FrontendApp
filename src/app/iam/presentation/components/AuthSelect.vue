<script setup lang="ts">
import { computed, inject } from 'vue'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import { cn } from '@/app/shared/helpers/utils'
import { AUTH_FIELD_KEY, authControlClass } from './auth-field-context'

/**
 * AuthSelect — NativeSelect de shadcn con el skin de auth (se mantiene nativo
 * para conservar el picker del sistema en móvil). Mismo contrato que
 * AuthInput: v-model + `error` / `valid`; los handlers de vee-validate llegan
 * vía $attrs.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  options: { value: string; label: string }[]
  error?: boolean
  valid?: boolean
}>()

const model   = defineModel<string>({ default: '' })
const field   = inject(AUTH_FIELD_KEY, null)
const invalid = computed(() => props.error || field?.invalid.value || undefined)
</script>

<template>
  <NativeSelect
    v-model="model"
    v-bind="$attrs"
    :id="field?.id"
    :aria-invalid="invalid"
    :aria-describedby="field?.describedBy.value"
    :class="cn(authControlClass(valid && !invalid), 'pr-9')"
  >
    <NativeSelectOption v-for="o in options" :key="o.value" :value="o.value">
      {{ o.label }}
    </NativeSelectOption>
  </NativeSelect>
</template>
