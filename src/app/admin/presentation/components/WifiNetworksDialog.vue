<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Eye, EyeOff, Plus } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAdminWifiNetworksStore } from '../../application/admin-wifi-networks.store'
import type { AdminNode } from '../../domain/model/admin-node.model'
import type { AdminWifiNetwork, AdminWifiNetworkForm } from '../../domain/model/admin-wifi-network.model'
import { MAX_SSID_BYTES, ssidByteLength, validateSsid, validateWifiPassword } from '../../domain/wifi-credentials'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminField from './AdminField.vue'
import AdminStateBox from './AdminStateBox.vue'
import AdminTableCard from './AdminTableCard.vue'

/**
 * WifiNetworksDialog — redes WiFi de un nodo (alta, edición, baja). La contraseña es de solo
 * escritura: nunca se muestra ni se precarga, solo cuándo se cambió por última vez.
 */
const props = defineProps<{ node: AdminNode | null }>()
const open  = defineModel<boolean>('open', { required: true })

const store = useAdminWifiNetworksStore()

const networks  = computed(() => props.node ? store.networksOf(props.node.id) : [])
const isLoading = computed(() => !!props.node && !!store.loading[props.node.id])
const loadError = computed(() => props.node ? store.errors[props.node.id] ?? null : null)

const editTarget   = ref<AdminWifiNetwork | null>(null)
const form         = ref<AdminWifiNetworkForm>({ ssid: '', password: '' })
const formError    = ref<string | null>(null)
const showPassword = ref(false)
const submitted    = ref(false)

const ssidBytes     = computed(() => ssidByteLength(form.value.ssid))
const ssidError     = computed(() => submitted.value || form.value.ssid ? validateSsid(form.value.ssid) : null)
// Al editar, vacía = conservar la actual: solo se valida si se escribe algo.
const passwordError = computed(() => {
  if (editTarget.value && form.value.password === '') return null
  if (!submitted.value && form.value.password === '') return null
  return validateWifiPassword(form.value.password)
})

const confirmEdit   = ref(false)
const deleteTarget  = ref<AdminWifiNetwork | null>(null)
const deleteError   = ref<string | null>(null)

function resetForm() {
  editTarget.value   = null
  form.value         = { ssid: '', password: '' }
  formError.value    = null
  showPassword.value = false
  submitted.value    = false
}

watch(open, isOpen => {
  if (!isOpen || !props.node) return
  resetForm()
  void store.fetchNetworks(props.node.id)
})

function startEdit(network: AdminWifiNetwork) {
  resetForm()
  editTarget.value = network
  form.value.ssid  = network.ssid
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
}

function handleSubmit() {
  submitted.value = true
  formError.value = null
  if (validateSsid(form.value.ssid) || passwordError.value) return
  const target = editTarget.value
  const changesSomething = target && (form.value.ssid !== target.ssid || form.value.password !== '')
  // Cambiar SSID o contraseña de una red en uso puede dejar a sus cámaras sin conexión.
  if (target && target.cameraCount > 0 && changesSomething) {
    confirmEdit.value = true
    return
  }
  void save()
}

async function save() {
  confirmEdit.value = false
  if (!props.node) return
  const target = editTarget.value
  const ok = target
    ? await store.updateNetwork(props.node.id, target.id, form.value)
    : await store.createNetwork(props.node.id, form.value)
  if (!ok) {
    formError.value = store.actionError
    return
  }
  toast.success(target ? 'Red WiFi actualizada' : 'Red WiFi añadida')
  resetForm()
}

function openDelete(network: AdminWifiNetwork) {
  deleteError.value  = null
  deleteTarget.value = network
}

async function handleDelete() {
  if (!props.node || !deleteTarget.value) return
  if (await store.deleteNetwork(props.node.id, deleteTarget.value.id)) {
    deleteTarget.value = null
    toast.success('Red WiFi borrada')
  } else {
    deleteError.value = store.actionError
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[680px]">
      <DialogHeader>
        <DialogTitle>
          Redes WiFi · <span class="font-mono">{{ node?.code }}</span> {{ node?.name }}
        </DialogTitle>
        <DialogDescription>
          Las cámaras de este nodo se conectan a una de estas redes. La contraseña se guarda cifrada y no
          se puede volver a ver.
        </DialogDescription>
      </DialogHeader>

      <AdminStateBox v-if="isLoading && networks.length === 0">Cargando redes...</AdminStateBox>
      <AdminStateBox v-else-if="loadError" tone="error">{{ loadError }}</AdminStateBox>
      <AdminTableCard
        v-else
        :columns="['SSID', 'Cámaras', 'Contraseña', 'Acciones']"
        :empty="networks.length === 0"
        empty-text="Este nodo aún no tiene redes WiFi. Añade la del estacionamiento para poder asignarla a sus cámaras."
      >
        <TableRow v-for="n in networks" :key="n.id" :data-state="editTarget?.id === n.id ? 'selected' : undefined">
          <TableCell class="font-mono text-xs font-semibold text-navy">{{ n.ssid }}</TableCell>
          <TableCell>{{ n.cameraCount }}</TableCell>
          <TableCell class="text-xs text-muted-foreground">cambiada {{ formatDate(n.passwordUpdatedAt) }}</TableCell>
          <TableCell>
            <div class="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline-primary" @click="startEdit(n)">Editar</Button>
              <Button
                size="sm"
                variant="outline-destructive"
                :disabled="n.cameraCount > 0"
                :title="n.cameraCount > 0 ? `La usan ${n.cameraCount} cámaras: asígnales otra red antes` : undefined"
                @click="openDelete(n)"
              >
                Borrar
              </Button>
            </div>
          </TableCell>
        </TableRow>
      </AdminTableCard>

      <form class="grid gap-3.5 rounded-xl border bg-muted/30 p-4" @submit.prevent="handleSubmit">
        <h3 class="text-[13px] font-semibold text-heading">
          {{ editTarget ? `Editar «${editTarget.ssid}»` : 'Nueva red' }}
        </h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <AdminField v-slot="{ id }" label="SSID" required :hint="`${ssidBytes}/${MAX_SSID_BYTES} bytes`">
            <Input :id="id" v-model="form.ssid" autocomplete="off" spellcheck="false" :aria-invalid="!!ssidError" />
            <p v-if="ssidError" class="text-[11px] text-destructive">{{ ssidError }}</p>
          </AdminField>
          <AdminField
            v-slot="{ id }"
            label="Contraseña"
            :required="!editTarget"
            :hint="editTarget ? 'Déjala vacía para conservar la actual' : 'WPA2: 8 a 63 caracteres, o 64 dígitos hex'"
          >
            <div class="relative">
              <Input
                :id="id"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                spellcheck="false"
                class="pr-10"
                :placeholder="editTarget ? 'Sin cambios' : ''"
                :aria-invalid="!!passwordError"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                class="absolute top-1/2 right-1 -translate-y-1/2"
                :aria-pressed="showPassword"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" /><Eye v-else />
              </Button>
            </div>
            <p v-if="passwordError" class="text-[11px] text-destructive">{{ passwordError }}</p>
          </AdminField>
        </div>

        <FormAlert :message="formError" />

        <div class="flex justify-end gap-2">
          <Button v-if="editTarget" type="button" variant="outline" @click="resetForm">Cancelar edición</Button>
          <Button type="submit" :disabled="store.saving || !node">
            <Plus v-if="!editTarget" />
            {{ store.saving ? 'Guardando...' : (editTarget ? 'Guardar cambios' : 'Añadir red') }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <ConfirmDialog
    :open="confirmEdit"
    title="Cambiar una red en uso"
    confirm-label="Guardar"
    :loading="store.saving"
    @cancel="confirmEdit = false"
    @confirm="save"
  >
    {{ editTarget?.cameraCount }} cámaras usan «{{ editTarget?.ssid }}». Recibirán el cambio en la siguiente
    sincronización del Fog. Si el SSID o la contraseña no son correctos, perderán la conexión y habrá que
    darles la WiFi de nuevo por USB.
  </ConfirmDialog>

  <ConfirmDialog
    :open="deleteTarget !== null"
    title="Borrar red WiFi"
    confirm-label="Borrar"
    destructive
    :error="deleteError"
    @cancel="deleteTarget = null"
    @confirm="handleDelete"
  >
    ¿Borrar la red «{{ deleteTarget?.ssid }}» de este nodo?
  </ConfirmDialog>
</template>
