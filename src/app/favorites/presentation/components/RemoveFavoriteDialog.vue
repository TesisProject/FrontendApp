<script setup lang="ts">
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'

/** Confirmación antes de quitar una zona de favoritos (HU-28 E2). */
defineProps<{ open: boolean; zoneName?: string | null; loading?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <ConfirmDialog
    :open="open"
    title="¿Quitar de favoritos?"
    confirm-label="Quitar"
    destructive
    :loading="loading"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  >
    {{ zoneName ? `«${zoneName}»` : 'Esta zona' }} dejará de aparecer en tu lista de favoritos.
  </ConfirmDialog>
</template>
