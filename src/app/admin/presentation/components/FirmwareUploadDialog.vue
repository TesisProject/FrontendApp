<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CircleCheck, TriangleAlert } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAdminFirmwareStore } from '../../application/admin-firmware.store'
import type { AdminFirmwareUploadForm } from '../../domain/model/admin-firmware.model'
import {
  FIRMWARE_NOTES_MAX, OTA_SLOT_BYTES, checkFirmwareImage, otaSlotPercent, validateFirmwareVersion,
  type FirmwareCheck,
} from '../../domain/firmware-image'
import { readFirstByte } from '../../infrastructure/firmware-file'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Textarea } from '@/app/shared/presentation/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminField from './AdminField.vue'

/**
 * FirmwareUploadDialog — publica una versión de firmware. El fichero se comprueba en el navegador
 * (byte mágico, tamaño, fichero equivocado) antes de habilitar "Publicar": una versión publicada no
 * se puede borrar ni reutilizar.
 */
const open  = defineModel<boolean>('open', { required: true })
const store = useAdminFirmwareStore()

const form      = ref<AdminFirmwareUploadForm>({ file: null, version: '', notes: '' })
const check     = ref<FirmwareCheck | null>(null)
const tried     = ref(false)
const inputKey  = ref(0) // remonta el <input type=file> para vaciarlo

watch(open, isOpen => {
  if (!isOpen) return
  form.value  = { file: null, version: (store.latestVersion ?? 0) + 1, notes: '' }
  check.value = null
  tried.value = false
  store.uploadError = null
  inputKey.value++
})

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  form.value.file = file
  check.value = file
    ? checkFirmwareImage({ name: file.name, size: file.size, firstByte: await readFirstByte(file) })
    : null
}

const versionError = computed(() => validateFirmwareVersion(form.value.version, store.versions))
const notesLength  = computed(() => form.value.notes.trim().length)
const notesError   = computed(() => notesLength.value > FIRMWARE_NOTES_MAX ? `Máximo ${FIRMWARE_NOTES_MAX} caracteres` : null)
const fileError    = computed(() => !form.value.file ? 'Elige el archivo .bin' : check.value?.errors[0] ?? null)
const canPublish   = computed(() => !fileError.value && !versionError.value && !notesError.value && !store.uploading)
// Sin fichero se deja pulsar para explicar qué falta; con errores conocidos, no.
const submitDisabled = computed(() =>
  store.uploading || !!check.value?.errors.length || !!versionError.value || !!notesError.value)
const progressPct  = computed(() => Math.round(store.uploadProgress * 100))

async function handleSubmit() {
  tried.value = true
  if (!canPublish.value) return
  const release = await store.uploadRelease(form.value)
  if (!release) return
  toast.success(`Firmware v${release.version} publicado`)
  open.value = false
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[560px]" @interact-outside="store.uploading && $event.preventDefault()">
      <DialogHeader>
        <DialogTitle>Publicar versión de firmware</DialogTitle>
        <DialogDescription>
          La nube calcula el tamaño y el SHA-256 del binario, lo firma y lo guarda. Después se asigna por cámara.
        </DialogDescription>
      </DialogHeader>

      <form class="grid gap-3.5" @submit.prevent="handleSubmit">
        <AdminField
          v-slot="{ id }"
          label="Archivo .bin"
          required
          hint="Sube build/esp32cam.ino.bin, no el .merged.bin ni el .bootloader.bin."
        >
          <!-- Nativo y sin v-model: el v-model de <Input> reescribiría el value del input de fichero. -->
          <input
            :id="id"
            :key="inputKey"
            type="file"
            accept=".bin,application/octet-stream"
            class="h-10 w-full min-w-0 rounded-lg border-[1.5px] border-input bg-card px-3 py-1.5 text-[13px] outline-none
                   file:mr-3 file:h-7 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-[12px] file:font-semibold file:text-secondary-foreground
                   focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15
                   aria-invalid:border-destructive dark:bg-input/30"
            :aria-invalid="tried && !!fileError"
            @change="onFileChange"
          />
          <template v-if="form.file && check">
            <p v-for="err in check.errors" :key="err" class="flex gap-1.5 text-[12px] text-destructive">
              <TriangleAlert class="mt-px size-3.5 shrink-0" />{{ err }}
            </p>
            <p v-for="w in check.warnings" :key="w" class="flex gap-1.5 text-[12px] text-warning">
              <TriangleAlert class="mt-px size-3.5 shrink-0" />{{ w }}
            </p>
            <p v-if="check.errors.length === 0" class="flex gap-1.5 text-[12px] text-success">
              <CircleCheck class="mt-px size-3.5 shrink-0" />
              Imagen ESP32 (0xE9) · {{ form.file.size.toLocaleString('es-PE') }} bytes
              ({{ otaSlotPercent(form.file.size) }} % de la ranura OTA de {{ OTA_SLOT_BYTES.toLocaleString('es-PE') }})
            </p>
          </template>
          <p v-else-if="tried && fileError" class="text-[12px] text-destructive">{{ fileError }}</p>
        </AdminField>

        <AdminField
          v-slot="{ id }"
          label="Versión"
          required
          hint="Entero mayor que las publicadas. Debe coincidir con FW_VERSION compilado en el firmware."
        >
          <Input
            :id="id"
            v-model.number="form.version"
            type="number"
            inputmode="numeric"
            min="1"
            step="1"
            class="max-w-[160px] font-mono"
            :aria-invalid="!!versionError"
          />
          <p v-if="versionError" class="text-[12px] text-destructive">{{ versionError }}</p>
        </AdminField>

        <AdminField v-slot="{ id }" label="Notas" optional :hint="`${notesLength}/${FIRMWARE_NOTES_MAX}`">
          <Textarea :id="id" v-model="form.notes" rows="3" placeholder="Qué cambia en esta versión" :aria-invalid="!!notesError" />
          <p v-if="notesError" class="text-[12px] text-destructive">{{ notesError }}</p>
        </AdminField>

        <p class="flex gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[12px] text-warning">
          <TriangleAlert class="mt-px size-4 shrink-0" />
          <span>Una versión publicada no se puede borrar ni reutilizar, y no se puede bajar de versión: revisa el número antes de publicar.</span>
        </p>

        <div
          v-if="store.uploading"
          class="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Subida del firmware"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="progressPct"
        >
          <div class="h-full bg-primary transition-[width]" :style="{ width: `${progressPct}%` }" />
        </div>

        <FormAlert :message="store.uploadError" />

        <DialogFooter>
          <Button type="button" variant="outline" :disabled="store.uploading" @click="open = false">Cancelar</Button>
          <Button type="submit" :disabled="submitDisabled">
            {{ store.uploading ? `Subiendo... ${progressPct} %` : `Publicar v${form.version || '?'}` }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
