<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { cn } from '@/app/shared/helpers/utils'
import { AUTH_FIELD_KEY, authControlClass } from './auth-field-context'

/**
 * AuthInput — Input de shadcn con el skin de auth.
 * - v-model compatible con vee-validate: el padre usa
 *   `v-model="field" v-bind="fieldAttrs"`; los handlers llegan vía $attrs.
 * - `type="password"` añade el toggle mostrar/ocultar.
 * - Estados visuales con `error` / `valid`; dentro de un AuthField hereda su
 *   id, aria-describedby y aria-invalid.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  type?: string
  error?: boolean
  valid?: boolean
}>(), { type: 'text' })

const model = defineModel<string>({ default: '' })
const field = inject(AUTH_FIELD_KEY, null)

const show      = ref(false)
const isPwd     = computed(() => props.type === 'password')
const inputType = computed(() => (isPwd.value && show.value ? 'text' : props.type))
const invalid   = computed(() => props.error || field?.invalid.value || undefined)
</script>

<template>
  <div class="relative flex">
    <Input
      v-model="model"
      v-bind="$attrs"
      :id="field?.id"
      :type="inputType"
      :aria-invalid="invalid"
      :aria-describedby="field?.describedBy.value"
      :class="cn(authControlClass(valid && !invalid), isPwd && 'pr-11')"
    />
    <button
      v-if="isPwd"
      type="button"
      class="absolute top-1/2 right-[7px] flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#9aa7b6] transition-colors hover:bg-[#f1f4f8] hover:text-[#5a6b80] focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      :aria-pressed="show"
      @click="show = !show"
    >
      <EyeOff v-if="show" class="size-[18px]" />
      <Eye v-else class="size-[18px]" />
    </button>
  </div>
</template>
