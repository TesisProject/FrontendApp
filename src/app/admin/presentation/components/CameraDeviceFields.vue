<script setup lang="ts">
import { computed } from 'vue'
import { useAdminCamerasStore } from '../../application/admin-cameras.store'
import type { AdminCameraDeviceForm } from '../../domain/model/admin-camera.model'
import {
  CAMERA_ROTATIONS, CAPTURE_LIMITS, FRAME_SIZES, FRAME_SIZE_LABEL, deviceFieldErrors, normalizeMac,
} from '../../domain/camera-device'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/app/shared/presentation/components/ui/native-select'
import AdminField from './AdminField.vue'
import AdminSegmented from './AdminSegmented.vue'

/**
 * CameraDeviceFields — campos del dispositivo de una cámara (MAC, rotación y captura). La WiFi no
 * está: se graba en cada placa por USB y la nube no la conoce.
 * Se usa en el alta y en la pestaña Dispositivo del detalle. Los errores inline salen de
 * `deviceFieldErrors`, la misma función con la que valida quien envía el formulario.
 */
const props = defineProps<{
  /** Falso solo en cámaras antiguas sin MAC. */
  macRequired: boolean
  /** Cámara que se edita (su propia MAC no cuenta como repetida). */
  cameraId?:   number
  /** Muestra los errores aunque el campo no se haya tocado (tras intentar guardar). */
  showErrors?: boolean
}>()

const form = defineModel<AdminCameraDeviceForm>({ required: true })

const camerasStore = useAdminCamerasStore()

const ROTATION_OPTIONS = CAMERA_ROTATIONS.map(value => ({ value, label: `${value}°` }))

const normalizedMac = computed(() => normalizeMac(form.value.mac))
const errors        = computed(() => deviceFieldErrors(form.value.mac, form.value.capture, props.macRequired))
const macError      = computed(() => props.showErrors || form.value.mac.trim() ? errors.value.mac : null)

/** Aviso (no bloquea, el 409 del backend manda): otra cámara cargada ya tiene esta MAC. */
const macTakenBy = computed(() => {
  const mac = normalizedMac.value
  if (!mac) return null
  return camerasStore.cameras.find(c => c.mac === mac && c.id !== props.cameraId)?.code ?? null
})
</script>

<template>
  <div class="grid gap-3.5">
    <AdminField
      v-slot="{ id }"
      label="MAC de la placa"
      :required="macRequired"
      :optional="!macRequired"
      :hint="normalizedMac ? `Se guardará como ${normalizedMac}` : 'Acepta aa:bb:cc:dd:ee:ff, AA-BB-CC-DD-EE-FF o aabbccddeeff'"
    >
      <Input
        :id="id"
        v-model="form.mac"
        class="font-mono"
        placeholder="24:6F:28:AB:CD:EF"
        autocomplete="off"
        spellcheck="false"
        :aria-invalid="!!macError"
      />
      <p v-if="macError" class="text-[11px] text-destructive">{{ macError }}</p>
      <p v-else-if="macTakenBy" class="text-[11px] text-warning">Ya la usa {{ macTakenBy }}: cada placa tiene una MAC única.</p>
      <p v-else-if="!macRequired && !form.mac.trim()" class="text-[11px] text-warning">
        Sin MAC, el Fog no podrá dar de alta esta placa por MAC.
      </p>
    </AdminField>

    <details class="group rounded-lg border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
      <summary class="cursor-pointer font-semibold text-foreground">¿Dónde encuentro la MAC?</summary>
      <p class="mt-1.5 leading-relaxed">
        Es la MAC de <strong>estación (STA)</strong> de la placa: el firmware la imprime en el monitor serie
        al arrancar, en la línea <code class="font-mono">WIFI: MAC=24:6F:28:AB:CD:EF</code>. No uses la del
        punto de acceso (SoftAP), que es distinta, ni la de la etiqueta del router. Abre el monitor serie a
        115200 baudios con DTR y RTS desactivados (con la ESP32-CAM-MB, si no, la placa se queda en reset).
      </p>
    </details>

    <AdminField label="Rotación" hint="Grados en sentido horario para ver la foto derecha.">
      <AdminSegmented v-model="form.rotation" :options="ROTATION_OPTIONS" label="Rotación de la foto" />
    </AdminField>

    <details class="rounded-lg border px-3 py-2" :open="showErrors && !!(errors.intervalSec || errors.jpegQuality)">
      <summary class="cursor-pointer text-[13px] font-semibold text-foreground">
        Captura
        <span class="font-normal text-muted-foreground">
          · {{ form.capture.intervalSec }} s · {{ form.capture.framesize }} · calidad {{ form.capture.jpegQuality }}
        </span>
      </summary>
      <div class="mt-3 grid gap-3 sm:grid-cols-3">
        <AdminField
          v-slot="{ id }"
          label="Intervalo (s)"
          :hint="`${CAPTURE_LIMITS.intervalSec.min}–${CAPTURE_LIMITS.intervalSec.max}. Tiempo dormida entre fotos: menos = más consumo de pilas`"
        >
          <Input
            :id="id"
            v-model.number="form.capture.intervalSec"
            type="number"
            inputmode="numeric"
            :min="CAPTURE_LIMITS.intervalSec.min"
            :max="CAPTURE_LIMITS.intervalSec.max"
            step="1"
            :aria-invalid="!!errors.intervalSec"
          />
          <p v-if="errors.intervalSec" class="text-[11px] text-destructive">{{ errors.intervalSec }}</p>
        </AdminField>
        <AdminField v-slot="{ id }" label="Resolución" hint="Mayor = más detalle y más tiempo de radio">
          <NativeSelect :id="id" v-model="form.capture.framesize">
            <NativeSelectOption v-for="f in FRAME_SIZES" :key="f" :value="f">{{ FRAME_SIZE_LABEL[f] }}</NativeSelectOption>
          </NativeSelect>
        </AdminField>
        <AdminField
          v-slot="{ id }"
          label="Calidad JPEG"
          :hint="`${CAPTURE_LIMITS.jpegQuality.min} = mejor imagen (más pesada), ${CAPTURE_LIMITS.jpegQuality.max} = peor`"
        >
          <Input
            :id="id"
            v-model.number="form.capture.jpegQuality"
            type="number"
            inputmode="numeric"
            :min="CAPTURE_LIMITS.jpegQuality.min"
            :max="CAPTURE_LIMITS.jpegQuality.max"
            step="1"
            :aria-invalid="!!errors.jpegQuality"
          />
          <p v-if="errors.jpegQuality" class="text-[11px] text-destructive">{{ errors.jpegQuality }}</p>
        </AdminField>
      </div>
    </details>
  </div>
</template>
