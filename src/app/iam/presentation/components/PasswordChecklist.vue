<script setup lang="ts">
import { computed } from 'vue'
import { Check, Circle } from '@lucide/vue'
import { PASSWORD_REQUIREMENTS } from '../../domain/password-policy'

/**
 * PasswordChecklist — requisitos de la contraseña marcados en vivo mientras se escribe (HU-02 E3).
 * Mismo orden y texto que la política del backend.
 */
const props = defineProps<{ password: string | null | undefined }>()

const items = computed(() =>
  PASSWORD_REQUIREMENTS.map(r => ({ id: r.id, label: r.label, ok: r.test(props.password ?? '') })),
)
</script>

<template>
  <ul class="-mt-2 grid grid-cols-1 gap-1 text-[12.5px] sm:grid-cols-2" aria-label="Requisitos de la contraseña">
    <li
      v-for="item in items"
      :key="item.id"
      class="flex items-center gap-1.5"
      :class="item.ok ? 'text-success' : 'text-muted-foreground'"
    >
      <Check v-if="item.ok" class="size-3.5 shrink-0" aria-hidden="true" />
      <Circle v-else class="size-3.5 shrink-0" aria-hidden="true" />
      <span>{{ item.label }}</span>
      <span class="sr-only">{{ item.ok ? '(cumplido)' : '(pendiente)' }}</span>
    </li>
  </ul>
</template>
