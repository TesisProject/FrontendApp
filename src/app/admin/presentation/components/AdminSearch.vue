<script setup lang="ts">
import { Search } from '@lucide/vue'
import { Input } from '@/app/shared/presentation/components/ui/input'

/** AdminSearch — buscador de las tablas del panel. */
defineProps<{ placeholder: string }>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="relative mb-4 max-w-[380px]">
    <Search class="pointer-events-none absolute top-1/2 left-3 size-[15px] -translate-y-1/2 text-muted-foreground/70" />
    <Input
      v-model="model"
      type="search"
      :placeholder="placeholder"
      :aria-label="placeholder"
      class="border-border pl-9"
    />
  </div>
</template>
