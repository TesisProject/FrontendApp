<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { Alert, AlertDescription } from '@/app/shared/presentation/components/ui/alert'

/** FormAlert — error a nivel de formulario (credenciales inválidas, fallo al guardar…). */
defineProps<{ message?: string | null }>()
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    leave-active-class="transition duration-100 ease-in"
    enter-from-class="opacity-0 -translate-y-1"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <Alert v-if="message" variant="destructive" class="rounded-[9px] py-2.5">
      <CircleAlert />
      <AlertDescription class="text-[13px]">{{ message }}</AlertDescription>
    </Alert>
  </Transition>
</template>
