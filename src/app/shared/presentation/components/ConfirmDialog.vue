<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/shared/presentation/components/ui/alert-dialog'
import { Button } from '@/app/shared/presentation/components/ui/button'
import FormAlert from './FormAlert.vue'

/**
 * ConfirmDialog — confirmación de acciones sensibles (eliminar, revocar,
 * cambiar rol…). No se cierra solo al confirmar: el padre decide cuándo
 * (p. ej. mantenerlo abierto mostrando `error` si la acción falla).
 * El mensaje va en el slot por defecto.
 */
withDefaults(defineProps<{
  open: boolean
  title: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  error?: string | null
}>(), { confirmLabel: 'Confirmar' })

const emit = defineEmits<{ confirm: []; cancel: [] }>()

function onOpenChange(value: boolean) {
  if (!value) emit('cancel')
}
</script>

<template>
  <AlertDialog :open="open" @update:open="onOpenChange">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>
          <slot />
        </AlertDialogDescription>
      </AlertDialogHeader>
      <FormAlert :message="error" />
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loading">Cancelar</AlertDialogCancel>
        <Button
          :variant="destructive ? 'destructive' : 'default'"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
