<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string }>(), { size: 13 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
</template>
