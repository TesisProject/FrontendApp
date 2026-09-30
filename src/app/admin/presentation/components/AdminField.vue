<script setup lang="ts">
import { useId } from 'vue'
import { Label } from '@/app/shared/presentation/components/ui/label'

/**
 * AdminField — campo de formulario del panel: label técnico (mayúsculas) +
 * control + hint opcional. Expone `id` en el slot para enlazar el label:
 * `<AdminField label="Nombre" v-slot="{ id }"><Input :id="id" /></AdminField>`.
 */
defineProps<{
  label: string
  optional?: boolean
  required?: boolean
  hint?: string
}>()

const id = useId()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <Label :for="id" class="gap-1 text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
      {{ label }}
      <span v-if="optional" class="font-normal tracking-normal normal-case opacity-70">(opcional)</span>
      <span v-if="required" class="text-destructive" aria-hidden="true">*</span>
    </Label>
    <slot :id="id" />
    <p v-if="hint" class="text-[11px] text-muted-foreground">{{ hint }}</p>
  </div>
</template>
