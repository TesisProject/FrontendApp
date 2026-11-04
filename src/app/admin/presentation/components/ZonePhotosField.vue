<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { ImageOff, ImagePlus, Loader2, Undo2, X } from '@lucide/vue'
import { Button } from '@/app/shared/presentation/components/ui/button'
import GooglePhotoAttribution from '../../../shared/presentation/components/GooglePhotoAttribution.vue'
import type { GooglePlacePhoto, ZonePhoto } from '../../../parking/domain/model/zone-photo.model'
import { ZONE_PHOTOS_MAX, ZONE_PHOTO_TYPES, zonePhotoFileError } from '../../domain/model/admin-zone.model'

/**
 * ZonePhotosField — fotos de la zona en el formulario:
 * - las de Google Places (solo lectura, con atribución; se resuelven en el navegador y no se guardan);
 * - las subidas por el administrador: las ya guardadas (`existing`, se pueden marcar para eliminar)
 *   y las nuevas (`pending`). Ambas listas se aplican al guardar la zona.
 */
const props = defineProps<{
  existing:      ZonePhoto[]
  googlePhotos:  GooglePlacePhoto[]
  googleLoading: boolean
  hasGooglePlace: boolean
}>()

const emit = defineEmits<{ 'unlink-google': [] }>()

const pending = defineModel<File[]>('pending', { required: true })
const removed = defineModel<string[]>('removed', { required: true })

const fileError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const keptCount = computed(() => props.existing.filter((p) => !removed.value.includes(p.id)).length)
const total = computed(() => keptCount.value + pending.value.length)
const full = computed(() => total.value >= ZONE_PHOTOS_MAX)

// Vista previa local de los archivos aún no subidos.
const previews = ref<string[]>([])
watch(pending, (files) => {
  previews.value.forEach((url) => URL.revokeObjectURL(url))
  previews.value = files.map((f) => URL.createObjectURL(f))
}, { immediate: true })
onUnmounted(() => previews.value.forEach((url) => URL.revokeObjectURL(url)))

function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  fileError.value = null
  const accepted: File[] = []
  const errors: string[] = []
  for (const file of files) {
    const error = zonePhotoFileError(file)
    if (error) errors.push(error)
    else if (total.value + accepted.length >= ZONE_PHOTOS_MAX) {
      errors.push(`Máximo ${ZONE_PHOTOS_MAX} fotos por zona: no se agregó «${file.name}»`)
    } else accepted.push(file)
  }
  if (accepted.length) pending.value = [...pending.value, ...accepted]
  if (errors.length) fileError.value = errors.join('. ')
}

function removePending(index: number) {
  pending.value = pending.value.filter((_, i) => i !== index)
  fileError.value = null
}

function toggleRemoved(id: string) {
  removed.value = removed.value.includes(id)
    ? removed.value.filter((r) => r !== id)
    : [...removed.value, id]
}

const thumb = 'relative aspect-[4/3] overflow-hidden rounded-md border bg-muted'
</script>

<template>
  <div class="grid gap-3">
    <!-- Google Places -->
    <div class="grid gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">De Google</p>
        <Button
          v-if="hasGooglePlace"
          type="button"
          size="sm"
          variant="ghost"
          class="h-7 text-xs text-muted-foreground"
          @click="emit('unlink-google')"
        >
          No usar las fotos de Google
        </Button>
      </div>
      <p v-if="!hasGooglePlace" class="text-[11px] text-muted-foreground">
        Elige la dirección en «Buscar dirección» para mostrar las fotos de Google del lugar.
      </p>
      <p v-else-if="googleLoading" class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Loader2 class="size-3.5 animate-spin" aria-hidden="true" /> Cargando fotos de Google...
      </p>
      <p v-else-if="googlePhotos.length === 0" class="text-[11px] text-muted-foreground">
        Google no tiene fotos de este lugar.
      </p>
      <ul v-else class="grid grid-cols-3 gap-2">
        <li v-for="(p, i) in googlePhotos" :key="p.url" class="grid gap-0.5">
          <div :class="thumb">
            <img :src="p.url" :alt="`Foto de Google ${i + 1}`" loading="lazy" class="size-full object-cover" />
          </div>
          <GooglePhotoAttribution :attributions="p.attributions" />
        </li>
      </ul>
    </div>

    <!-- Subidas -->
    <div class="grid gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] font-semibold tracking-[0.4px] text-muted-foreground uppercase">
          Subidas <span class="font-normal normal-case tracking-normal">({{ total }}/{{ ZONE_PHOTOS_MAX }})</span>
        </p>
        <Button type="button" size="sm" variant="outline" :disabled="full" @click="fileInput?.click()">
          <ImagePlus /> Agregar fotos
        </Button>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          multiple
          :accept="ZONE_PHOTO_TYPES.join(',')"
          aria-label="Agregar fotos de la zona"
          @change="onFiles"
        />
      </div>
      <p class="text-[11px] text-muted-foreground">JPG, PNG o WebP de hasta 5 MB. Se suben al guardar la zona.</p>
      <p v-if="fileError" class="text-[11px] text-destructive" role="alert">{{ fileError }}</p>

      <ul v-if="existing.length || pending.length" class="grid grid-cols-3 gap-2">
        <li v-for="p in existing" :key="p.id" :class="thumb">
          <img
            v-if="p.url"
            :src="p.url"
            alt="Foto subida de la zona"
            loading="lazy"
            class="size-full object-cover transition-opacity"
            :class="removed.includes(p.id) && 'opacity-30'"
          />
          <span v-else class="flex size-full items-center justify-center text-muted-foreground" title="Sin URL: el almacenamiento no está configurado">
            <ImageOff class="size-5" aria-hidden="true" />
          </span>
          <span
            v-if="removed.includes(p.id)"
            class="absolute inset-x-0 bottom-0 bg-destructive/85 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white"
          >Se eliminará</span>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            class="absolute top-1 right-1 size-6 rounded-full shadow"
            :aria-label="removed.includes(p.id) ? 'Conservar foto' : 'Eliminar foto'"
            @click="toggleRemoved(p.id)"
          >
            <Undo2 v-if="removed.includes(p.id)" class="size-3.5" />
            <X v-else class="size-3.5" />
          </Button>
        </li>
        <li v-for="(f, i) in pending" :key="`${f.name}-${i}`" :class="thumb">
          <img :src="previews[i]" :alt="f.name" class="size-full object-cover" />
          <span class="absolute inset-x-0 bottom-0 bg-primary/85 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">Nueva</span>
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            class="absolute top-1 right-1 size-6 rounded-full shadow"
            :aria-label="`Quitar ${f.name}`"
            @click="removePending(i)"
          >
            <X class="size-3.5" />
          </Button>
        </li>
      </ul>
    </div>
  </div>
</template>
