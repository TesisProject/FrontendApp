<script setup lang="ts">
import type { PhotoAttribution } from '../../../parking/domain/model/zone-photo.model'

/**
 * GooglePhotoAttribution — autor de una foto de Google Places, con enlace a su perfil. Las políticas
 * de Google exigen mostrarlo junto a la foto, junto con el origen "Google".
 */
defineProps<{ attributions: PhotoAttribution[] }>()
</script>

<template>
  <p class="truncate text-micro leading-tight text-muted-foreground">
    <template v-if="attributions.length">
      Foto:
      <template v-for="(a, i) in attributions" :key="i">
        <a
          v-if="a.uri"
          :href="a.uri"
          target="_blank"
          rel="noopener noreferrer"
          class="underline-offset-2 hover:text-foreground hover:underline"
        >{{ a.name }}</a>
        <span v-else>{{ a.name }}</span>{{ i < attributions.length - 1 ? ', ' : '' }}
      </template>
      ·
    </template>
    Google
  </p>
</template>
