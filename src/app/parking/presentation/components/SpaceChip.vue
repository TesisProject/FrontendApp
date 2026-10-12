<script setup lang="ts">
/** SpaceChip — un espacio de estacionamiento con su estado (libre / ocupado) como chip compacto. */
defineProps<{
  spaceNumber: string
  occupied:    boolean
  /** Resaltado porque el cursor está sobre él o sobre su polígono en la foto. */
  active?:     boolean
}>()
</script>

<template>
  <li
    class="inline-flex h-8 min-w-12 items-center justify-center gap-1.5 rounded-md border-[1.5px] px-2.5 text-xs font-bold text-heading transition-[box-shadow,transform]"
    :class="[
      occupied ? 'border-zone-ocupado bg-destructive-soft' : 'border-zone-libre bg-success-soft',
      active && '-translate-y-px ring-2 ring-ring/60 ring-offset-1 ring-offset-card',
    ]"
    :title="`${spaceNumber} · ${occupied ? 'Ocupado' : 'Libre'}`"
  >
    <span class="size-1.5 rounded-full" :class="occupied ? 'bg-zone-ocupado' : 'bg-zone-libre'" aria-hidden="true" />
    {{ spaceNumber }}
    <span class="sr-only">{{ occupied ? 'ocupado' : 'libre' }}</span>
  </li>
</template>
