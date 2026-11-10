<script setup lang="ts">
import { ref, computed, onMounted, markRaw, nextTick } from 'vue'
import { useAdminZonesStore, ZONE_FIELD_LABELS } from '../../application/admin-zones.store'
import type { FieldErrors } from '../../application/admin-field-errors'
import type { ZoneDeletionImpactResponse } from '../../infrastructure/admin-response'
import { useAdminSpacesStore } from '../../application/admin-spaces.store'
import ZoneRoiEditorModal from '../components/ZoneRoiEditorModal.vue'
import ZoneLocationPicker from '../components/ZoneLocationPicker.vue'
import OpeningHoursEditor from '../components/OpeningHoursEditor.vue'
import ZonePhotosField from '../components/ZonePhotosField.vue'
import { fromGooglePeriods } from '../../infrastructure/google-opening-hours'
import { fetchGooglePlacePhotos, toGooglePlacePhotos } from '../../../parking/infrastructure/google-place-photos'
import type { GooglePlacePhoto } from '../../../parking/domain/model/zone-photo.model'
import { formatOpeningHours, openingHoursError } from '../../../parking/domain/opening-hours'
import { formatZoneAddress } from '../../../parking/domain/zone-address'
import { loadGoogleMaps } from '../../../shared/infrastructure/maps-loader'
import type {
  AdminZone,
  AdminZoneForm,
} from '../../domain/model/admin-zone.model'
import { CLASSIFICATION_COLOR } from '../../../parking/domain/zone-classification'
import type { ZoneClassification } from '../../../parking/domain/model/zone.model'
import { Plus, Search, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Badge, type BadgeVariants } from '@/app/shared/presentation/components/ui/badge'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { TableCell, TableRow } from '@/app/shared/presentation/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/shared/presentation/components/ui/dialog'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminPage from '../components/AdminPage.vue'
import AdminSearch from '../components/AdminSearch.vue'
import AdminStateBox from '../components/AdminStateBox.vue'
import AdminTableCard from '../components/AdminTableCard.vue'
import AdminField from '../components/AdminField.vue'
import OccupancyBar from '../components/OccupancyBar.vue'
import AdminSectionNav, { type AdminSection } from '../components/AdminSectionNav.vue'
import AdminFormSection from '../components/AdminFormSection.vue'
import { useScrollSpy } from '../../../shared/presentation/composables/useScrollSpy'

const store = useAdminZonesStore()
const spacesStore = useAdminSpacesStore()

// Spaces modal
const showSpaces = ref(false)
const spaceZoneName = ref('')
const newSpaceNum = ref('')

async function openSpaces(zone: AdminZone) {
  spaceZoneName.value = zone.name
  newSpaceNum.value = ''
  showSpaces.value = true
  await spacesStore.fetchByZone(zone.id)
}

function closeSpaces() {
  showSpaces.value = false
  spacesStore.clear()
}

async function submitSpace() {
  const ok = await spacesStore.addSpace(newSpaceNum.value)
  if (ok) newSpaceNum.value = ''
}

// ROI editor (por zona: todos los espacios sobre un mismo lienzo)
const roiZone = ref<{ id: number; name: string } | null>(null)

function openZoneRoi(zone: AdminZone) {
  roiZone.value = { id: zone.id, name: zone.name }
}
const search = ref('')

const filtered = computed(() =>
  store.zones.filter(
    (z) =>
      z.name.toLowerCase().includes(search.value.toLowerCase()) ||
      z.district.toLowerCase().includes(search.value.toLowerCase()),
  ),
)

// Modal
const showModal = ref(false)
const editTarget = ref<AdminZone | null>(null)
function emptyForm(): AdminZoneForm {
  return {
    name: '',
    street: '',
    district: '',
    city: '',
    latitude: 0,
    longitude: 0,
    totalSpaces: 0,
    totalCapacity: 0,
    openingHours: [],
    googlePlaceId: null,
  }
}
const form = ref<AdminZoneForm>(emptyForm())

// Fotos: las de Google se muestran (no se guardan); las subidas se aplican tras guardar la zona.
const googlePhotos = ref<GooglePlacePhoto[]>([])
const googlePhotosLoading = ref(false)
const pendingFiles = ref<File[]>([])
const removedPhotoIds = ref<string[]>([])
/** Evita que una respuesta tardía de Google pise la de otra zona o dirección. */
let googleRequest = 0

const existingPhotos = computed(() =>
  editTarget.value ? store.zones.find((z) => z.id === editTarget.value!.id)?.photos ?? editTarget.value.photos : [],
)

async function loadGooglePhotos(placeId: string | null) {
  const request = ++googleRequest
  googlePhotos.value = []
  if (!placeId) {
    googlePhotosLoading.value = false
    return
  }
  googlePhotosLoading.value = true
  const photos = await fetchGooglePlacePhotos(placeId)
  if (request !== googleRequest) return
  googlePhotos.value = photos
  googlePhotosLoading.value = false
}

function unlinkGoogle() {
  form.value.googlePlaceId = null
  googleRequest++
  googlePhotos.value = []
  googlePhotosLoading.value = false
}

function resetPhotos() {
  pendingFiles.value = []
  removedPhotoIds.value = []
}
const formError = ref<string | null>(null)
/** Errores por campo: los del formulario y los que devuelve el backend (VALIDATION_ERROR). */
const fieldErrors = ref<FieldErrors>({})
const photosSyncing = ref(false)
const busy = computed(() => store.saving || photosSyncing.value)

// Secciones del formulario: el índice lateral desplaza el contenido, no oculta secciones.
const ZONE_SECTIONS = [
  { id: 'general',  label: 'General',   hint: 'Nombre de la zona' },
  { id: 'location', label: 'Ubicación', hint: 'Dirección y mapa' },
  { id: 'capacity', label: 'Capacidad', hint: 'Espacios y aforo' },
  { id: 'hours',    label: 'Horario',   hint: 'Días y horas de atención' },
  { id: 'photos',   label: 'Fotos',     hint: 'Galería de la zona' },
] as const satisfies readonly AdminSection[]
type ZoneSectionId = (typeof ZONE_SECTIONS)[number]['id']

/** Sección donde vive cada campo, para marcarla y llevar al usuario al primer error. */
const FIELD_SECTION: Record<string, ZoneSectionId> = {
  name:          'general',
  street:        'location',
  district:      'location',
  city:          'location',
  latitude:      'location',
  longitude:     'location',
  googlePlaceId: 'location',
  totalSpaces:   'capacity',
  totalCapacity: 'capacity',
  openingHours:  'hours',
}

const formScrollEl = ref<HTMLElement | null>(null)
const { active: activeSection, scrollTo: scrollToSection } = useScrollSpy(
  formScrollEl,
  ZONE_SECTIONS.map((s) => s.id),
)

const invalidSections = computed(
  () => new Set(Object.keys(fieldErrors.value).map((field) => FIELD_SECTION[field])),
)
const sectionNav = computed<AdminSection[]>(() =>
  ZONE_SECTIONS.map((s) => ({ ...s, invalid: invalidSections.value.has(s.id) })),
)

/** Lleva el contenido a la primera sección (en orden visual) que tenga errores. */
async function revealFirstError() {
  const first = ZONE_SECTIONS.find((s) => invalidSections.value.has(s.id))
  if (!first) return
  await nextTick()
  scrollToSection(first.id)
}

const confirmId = ref<number | null>(null)
/** Segunda confirmación (HU-22): la zona tiene datos asociados y estos son sus conteos. */
const deleteImpact = ref<ZoneDeletionImpactResponse | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

// Places autocomplete
const addrQuery = ref('')
const addrSuggestions = ref<
  { mainText: string; secondaryText: string; _raw: any }[]
>([])
const showAddrDrop = ref(false)
let placesLib: any = null
let sessionToken: any = null
let suggestTimer: ReturnType<typeof setTimeout> | null = null

async function ensurePlacesLib() {
  if (placesLib) return
  await loadGoogleMaps()
  placesLib = await google.maps.importLibrary('places')
}

async function fetchAddrSuggestions(input: string) {
  if (input.trim().length < 2) {
    addrSuggestions.value = []
    showAddrDrop.value = false
    return
  }
  await ensurePlacesLib()
  if (!sessionToken) sessionToken = new placesLib.AutocompleteSessionToken()
  try {
    const result =
      await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken,
        includedRegionCodes: ['pe'],
      })
    addrSuggestions.value = (result.suggestions ?? []).map((s: any) => {
      const pred = s.placePrediction
      return {
        mainText: pred.mainText?.toString() ?? pred.text?.toString() ?? '',
        secondaryText: pred.secondaryText?.toString() ?? '',
        _raw: markRaw(pred),
      }
    })
    showAddrDrop.value = addrSuggestions.value.length > 0
  } catch {
    addrSuggestions.value = []
    showAddrDrop.value = false
  }
}

async function selectAddr(item: {
  mainText: string
  secondaryText: string
  _raw: any
}) {
  showAddrDrop.value = false
  addrSuggestions.value = []
  sessionToken = null

  const place = item._raw.toPlace()
  googleRequest++
  googlePhotosLoading.value = true
  try {
    await place.fetchFields({ fields: ['id', 'location', 'addressComponents', 'photos', 'regularOpeningHours'] })
  } finally {
    googlePhotosLoading.value = false
  }

  form.value.googlePlaceId = place.id ?? null
  googlePhotos.value = toGooglePlacePhotos(place.photos)

  // Google numera los días desde el domingo y no informa feriados; el editor queda para revisarlo.
  const googleHours = fromGooglePeriods(place.regularOpeningHours?.periods)
  if (googleHours.length) {
    form.value.openingHours = googleHours
    toast.info('Horario prellenado desde Google: revísalo antes de guardar')
  }

  if (place.location) {
    form.value.latitude = place.location.lat()
    form.value.longitude = place.location.lng()
  }

  const components: { longText: string; types: string[] }[] =
    place.addressComponents ?? []
  const get = (...types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.longText ??
    ''

  const streetNumber = get('street_number')
  const route = get('route')
  form.value.street = route
    ? streetNumber
      ? `${route} ${streetNumber}`
      : route
    : item.mainText
  form.value.district = get('sublocality_level_1', 'sublocality', 'locality')
  form.value.city = get(
    'administrative_area_level_2',
    'administrative_area_level_1',
    'locality',
  )

  addrQuery.value = `${item.mainText}${item.secondaryText ? ', ' + item.secondaryText : ''}`
}

function onAddrInput() {
  if (suggestTimer) clearTimeout(suggestTimer)
  suggestTimer = setTimeout(() => fetchAddrSuggestions(addrQuery.value), 300)
}

function hideAddrDrop() {
  setTimeout(() => {
    showAddrDrop.value = false
  }, 150)
}

function openCreate() {
  editTarget.value = null
  form.value = emptyForm()
  resetPhotos()
  loadGooglePhotos(null)
  addrQuery.value = ''
  formError.value = null
  fieldErrors.value = {}
  showModal.value = true
}

function openEdit(zone: AdminZone) {
  editTarget.value = zone
  form.value = {
    name: zone.name,
    street: zone.street,
    district: zone.district,
    city: zone.city,
    latitude: zone.latitude,
    longitude: zone.longitude,
    totalSpaces: zone.totalSpaces,
    totalCapacity: zone.totalCapacity,
    openingHours: zone.openingHours.map((e) => ({ ...e })),
    googlePlaceId: zone.googlePlaceId,
  }
  resetPhotos()
  loadGooglePhotos(zone.googlePlaceId)
  addrQuery.value = zone.street ? `${zone.street}, ${zone.district}` : ''
  formError.value = null
  fieldErrors.value = {}
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

/** Revisa todos los campos y deja el error de cada uno en `fieldErrors`; devuelve el primero. */
function validate(): string | null {
  const f = form.value
  const errors: FieldErrors = {}
  if (!f.name.trim()) errors.name = ZONE_FIELD_LABELS.name!
  else if (f.name.trim().length > 200) errors.name = 'El nombre no puede pasar de 200 caracteres'
  if (!f.street.trim()) errors.street = ZONE_FIELD_LABELS.street!
  if (!f.district.trim()) errors.district = ZONE_FIELD_LABELS.district!
  if (!f.city.trim()) errors.city = ZONE_FIELD_LABELS.city!
  if (!f.latitude || !f.longitude) {
    errors.latitude = 'Ubica la zona en el mapa o selecciona una dirección del autocompletado'
  } else {
    if (Math.abs(f.latitude) > 90) errors.latitude = ZONE_FIELD_LABELS.latitude!
    if (Math.abs(f.longitude) > 180) errors.longitude = ZONE_FIELD_LABELS.longitude!
  }
  if (!f.totalSpaces || f.totalSpaces < 1 || !Number.isInteger(f.totalSpaces))
    errors.totalSpaces = 'El total de espacios debe ser un entero mayor o igual a 1'
  if (!f.totalCapacity || f.totalCapacity < 1 || !Number.isInteger(f.totalCapacity))
    errors.totalCapacity = 'La capacidad total debe ser un entero mayor o igual a 1'
  const hoursError = openingHoursError(f.openingHours)
  if (hoursError) errors.openingHours = `Horario — ${hoursError}`
  fieldErrors.value = errors
  const first = Object.values(errors)[0]
  return first ? `Corrige los campos marcados: ${first}` : null
}

/**
 * Aplica a la zona ya guardada las fotos marcadas para eliminar y las nuevas. Lo que falla queda en
 * el formulario para reintentar; devuelve los mensajes de error (sin repetir).
 */
async function syncPhotos(zoneId: number): Promise<string[]> {
  const errors = new Set<string>()
  for (const photoId of [...removedPhotoIds.value]) {
    const res = await store.deletePhoto(zoneId, photoId)
    if (res.ok) removedPhotoIds.value = removedPhotoIds.value.filter((id) => id !== photoId)
    else errors.add(res.error)
  }
  const failed: File[] = []
  for (const file of pendingFiles.value) {
    const res = await store.uploadPhoto(zoneId, file)
    if (!res.ok) {
      errors.add(res.error)
      failed.push(file)
    }
  }
  pendingFiles.value = failed
  return [...errors]
}

async function handleSubmit() {
  const err = validate()
  if (err) {
    formError.value = err
    revealFirstError()
    return
  }

  formError.value = null
  const editing = !!editTarget.value
  const saved = editing
    ? await store.updateZone(editTarget.value!.id, form.value)
    : await store.createZone(form.value)
  if (!saved) {
    fieldErrors.value = store.fieldErrors
    formError.value = store.actionError
    revealFirstError()
    toast.error(editing ? 'No se pudo actualizar la zona' : 'No se pudo crear la zona')
    return
  }
  // Si fallan las fotos, el formulario queda abierto en modo edición para reintentar solo eso.
  editTarget.value = saved
  photosSyncing.value = true
  const photoErrors = await syncPhotos(saved.id).finally(() => { photosSyncing.value = false })
  toast.success(editing ? 'Zona actualizada' : 'Zona creada')
  if (photoErrors.length) {
    formError.value = `La zona se guardó, pero hubo un problema con las fotos: ${photoErrors.join('. ')}`
    scrollToSection('photos')
    return
  }
  closeModal()
}


/** Primera confirmación: si la zona tiene espacios o cámaras, se pide una segunda con los conteos. */
async function handleDelete(id: number, confirmed = false) {
  deleting.value = true
  deleteError.value = null
  const result = await store.deleteZone(id, confirmed).finally(() => { deleting.value = false })
  if (result.status === 'deleted') {
    toast.success('Zona eliminada')
    closeDelete()
  } else if (result.status === 'needs-confirmation') {
    deleteImpact.value = result.impact
  } else {
    deleteError.value = result.error
    toast.error(result.error)
  }
}

function closeDelete() {
  confirmId.value = null
  deleteImpact.value = null
  deleteError.value = null
}

function classColor(c: string) {
  return CLASSIFICATION_COLOR[c as ZoneClassification] ?? '#888'
}

const classVariant: Record<string, BadgeVariants['variant']> = {
  LIBRE:    'success',
  MODERADO: 'warning',
  OCUPADO:  'danger',
}

onMounted(() => store.fetchZones())
</script>

<template>
  <AdminPage title="Zonas" :sub="`${store.zones.length} zonas registradas`">
    <template #actions>
      <Button @click="openCreate"><Plus /> Nueva zona</Button>
    </template>

    <AdminSearch v-model="search" placeholder="Buscar por nombre o distrito..." />

    <AdminStateBox v-if="store.loading">Cargando zonas...</AdminStateBox>
    <AdminStateBox v-else-if="store.error" tone="error">{{ store.error }}</AdminStateBox>

    <AdminTableCard
      v-else
      :columns="['ID', 'Nombre', 'Dirección', 'Horario', 'Espacios', 'Ocupación', 'Estado', 'Acciones']"
      :empty="filtered.length === 0"
      empty-text="No se encontraron zonas"
    >
      <TableRow v-for="z in filtered" :key="z.id">
        <TableCell class="font-mono text-body text-muted-foreground">#{{ z.id }}</TableCell>
        <TableCell class="font-semibold text-navy">{{ z.name }}</TableCell>
        <TableCell class="text-muted-foreground">{{ formatZoneAddress({ street: z.street, district: z.district }) }}</TableCell>
        <TableCell class="max-w-[13.75rem] text-body text-muted-foreground">
          <span class="line-clamp-2" :title="formatOpeningHours(z.openingHours)">{{ formatOpeningHours(z.openingHours) }}</span>
        </TableCell>
        <TableCell>{{ z.totalSpaces }}</TableCell>
        <TableCell>
          <OccupancyBar :percentage="z.occupancyPercentage" :color="classColor(z.classification)" />
        </TableCell>
        <TableCell>
          <Badge :variant="classVariant[z.classification] ?? 'neutral'" size="status">{{ z.classification }}</Badge>
        </TableCell>
        <TableCell>
          <div class="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" @click="openSpaces(z)">Espacios</Button>
            <Button size="sm" variant="secondary" @click="openZoneRoi(z)">ROI</Button>
            <Button size="sm" variant="outline-primary" @click="openEdit(z)">Editar</Button>
            <Button size="sm" variant="outline-destructive" @click="confirmId = z.id">Eliminar</Button>
          </div>
        </TableCell>
      </TableRow>
    </AdminTableCard>

    <ConfirmDialog
      :open="confirmId !== null && !deleteImpact"
      title="Eliminar zona"
      confirm-label="Eliminar"
      destructive
      :loading="deleting"
      :error="deleteError"
      @cancel="closeDelete"
      @confirm="handleDelete(confirmId!)"
    >
      ¿Eliminar esta zona? Esta acción no se puede deshacer.
    </ConfirmDialog>

    <ConfirmDialog
      :open="!!deleteImpact"
      title="La zona tiene datos asociados"
      confirm-label="Sí, eliminar todo"
      destructive
      :loading="deleting"
      :error="deleteError"
      @cancel="closeDelete"
      @confirm="handleDelete(confirmId!, true)"
    >
      <template v-if="deleteImpact">
        Al eliminarla se borrarán <strong>{{ deleteImpact.parkingSpaces }} espacio(s)</strong> y
        <strong>{{ deleteImpact.monitoredSpaces }} espacio(s) monitoreado(s)</strong> con su ROI, y
        <strong>{{ deleteImpact.cameras }} cámara(s)</strong>
        ({{ deleteImpact.activeCameras }} activa(s)) quedarán desactivadas y sin zona.
        <template v-if="deleteImpact.occupancyRecords || deleteImpact.ratings || deleteImpact.favorites">
          Además, la zona tiene
          <strong>{{ deleteImpact.occupancyRecords ?? 0 }} lectura(s) de historial</strong>,
          <strong>{{ deleteImpact.ratings ?? 0 }} reseña(s)</strong> y
          <strong>{{ deleteImpact.favorites ?? 0 }} conductor(es) que la guardaron en favoritos</strong>:
          dejarán de mostrarse en la app.
        </template>
        ¿Confirmas la eliminación?
      </template>
    </ConfirmDialog>

    <!-- Create / Edit -->
    <Dialog v-model:open="showModal">
      <DialogContent
        class="flex h-[min(48rem,calc(100dvh-2rem))] max-h-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[60rem]"
        @interact-outside="busy && $event.preventDefault()"
      >
        <DialogHeader class="border-b px-7 pt-6 pb-4 pr-14">
          <DialogTitle>{{ editTarget ? 'Editar zona' : 'Nueva zona' }}</DialogTitle>
          <DialogDescription>
            {{ editTarget ? editTarget.name : 'Completa los datos de la nueva zona de estacionamiento.' }}
          </DialogDescription>
        </DialogHeader>

        <form class="flex min-h-0 flex-1 flex-col" novalidate @submit.prevent="handleSubmit">
          <div class="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[14rem_minmax(0,1fr)] md:grid-rows-1">
            <AdminSectionNav
              :sections="sectionNav"
              :active="activeSection"
              label="Secciones de la zona"
              class="border-b bg-muted/40 px-3 py-2 md:border-r md:border-b-0 md:px-3 md:py-4"
              @select="scrollToSection"
            />

            <div
              ref="formScrollEl"
              class="min-h-0 overflow-y-auto overscroll-contain px-5 pt-5 [scrollbar-width:thin] md:px-7 md:pt-6"
            >
              <!-- General -->
              <AdminFormSection section="general" title="General" sub="Cómo se identifica la zona dentro del panel.">
                <AdminField v-slot="{ id }" label="Nombre de la zona" hint="Nombre interno con el que identificarás esta zona." :error="fieldErrors.name">
                  <Input :id="id" v-model="form.name" placeholder="Ej: Zona Norte, Zona Centro, Estacionamiento Sur" />
                </AdminField>
              </AdminFormSection>

              <!-- Ubicación -->
              <AdminFormSection section="location" title="Ubicación" sub="Busca la dirección y ajusta el pin en el mapa si hace falta.">
                <!-- Places autocomplete -->
                <AdminField
                  v-slot="{ id }"
                  label="Buscar dirección"
                  hint="Al seleccionar, se rellenan automáticamente los campos de abajo."
                  class="relative"
                >
                  <div class="relative">
                    <Search class="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
                    <Input
                      :id="id"
                      v-model="addrQuery"
                      role="combobox"
                      :aria-expanded="showAddrDrop"
                      aria-autocomplete="list"
                      autocomplete="off"
                      class="pl-8"
                      placeholder="Escribe la dirección y selecciona una sugerencia"
                      @input="onAddrInput"
                      @blur="hideAddrDrop"
                      @focus="addrSuggestions.length > 0 && (showAddrDrop = true)"
                    />
                    <ul
                      v-if="showAddrDrop"
                      role="listbox"
                      class="absolute inset-x-0 top-[calc(100%+4px)] z-50 max-h-[200px] overflow-y-auto rounded-lg border bg-popover py-1 shadow-[var(--pv-shadow-md)]"
                    >
                      <li
                        v-for="(s, i) in addrSuggestions"
                        :key="i"
                        role="option"
                        :aria-selected="false"
                        class="flex cursor-pointer flex-col gap-px px-3.5 py-2 transition-colors hover:bg-accent"
                        @mousedown.prevent="selectAddr(s)"
                      >
                        <span class="text-body font-medium text-navy">{{ s.mainText }}</span>
                        <span class="text-caption text-muted-foreground">{{ s.secondaryText }}</span>
                      </li>
                    </ul>
                  </div>
                </AdminField>

                <ZoneLocationPicker
                  v-model:latitude="form.latitude"
                  v-model:longitude="form.longitude"
                />

                <div class="grid gap-3 sm:grid-cols-2">
                  <AdminField v-slot="{ id }" label="Ciudad" :error="fieldErrors.city">
                    <Input :id="id" v-model="form.city" placeholder="Lima" />
                  </AdminField>
                  <AdminField v-slot="{ id }" label="Distrito" :error="fieldErrors.district">
                    <Input :id="id" v-model="form.district" placeholder="San Miguel" />
                  </AdminField>
                </div>

                <AdminField v-slot="{ id }" label="Calle" :error="fieldErrors.street">
                  <Input :id="id" v-model="form.street" placeholder="Av. Ejemplo 123" />
                </AdminField>

                <div class="grid gap-3 sm:grid-cols-2">
                  <AdminField v-slot="{ id }" label="Latitud" :error="fieldErrors.latitude">
                    <Input :id="id" v-model.number="form.latitude" type="number" step="0.000001" />
                  </AdminField>
                  <AdminField v-slot="{ id }" label="Longitud" :error="fieldErrors.longitude">
                    <Input :id="id" v-model.number="form.longitude" type="number" step="0.000001" />
                  </AdminField>
                </div>
              </AdminFormSection>

              <!-- Capacidad -->
              <AdminFormSection section="capacity" title="Capacidad" sub="Espacios de estacionamiento y aforo total de la zona.">
                <div class="grid gap-3 sm:grid-cols-2">
                  <AdminField v-slot="{ id }" label="Total de espacios" :error="fieldErrors.totalSpaces">
                    <Input :id="id" v-model.number="form.totalSpaces" type="number" min="1" />
                  </AdminField>
                  <AdminField v-slot="{ id }" label="Capacidad total" :error="fieldErrors.totalCapacity">
                    <Input :id="id" v-model.number="form.totalCapacity" type="number" min="1" />
                  </AdminField>
                </div>
              </AdminFormSection>

              <!-- Horario -->
              <AdminFormSection section="hours" title="Horario de atención" sub="Días y horas en que la zona está disponible.">
                <OpeningHoursEditor v-model="form.openingHours" />
                <p v-if="fieldErrors.openingHours" class="text-caption font-medium text-destructive" role="alert">{{ fieldErrors.openingHours }}</p>
              </AdminFormSection>

              <!-- Fotos -->
              <AdminFormSection section="photos" title="Fotos" sub="Imágenes que acompañan la ficha de la zona.">
                <ZonePhotosField
                  v-model:pending="pendingFiles"
                  v-model:removed="removedPhotoIds"
                  :existing="existingPhotos"
                  :google-photos="googlePhotos"
                  :google-loading="googlePhotosLoading"
                  :has-google-place="!!form.googlePlaceId"
                  @unlink-google="unlinkGoogle"
                />
              </AdminFormSection>
            </div>
          </div>

          <div class="grid gap-3 border-t px-5 py-4 md:px-7">
            <FormAlert :message="formError" />
            <DialogFooter class="mt-0">
              <Button type="button" variant="outline" :disabled="busy" @click="closeModal">Cancelar</Button>
              <Button type="submit" :disabled="busy">
                {{ photosSyncing ? 'Subiendo fotos...' : store.saving ? 'Guardando...' : editTarget ? 'Actualizar' : 'Crear zona' }}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Spaces -->
    <Dialog :open="showSpaces" @update:open="(v: boolean) => !v && closeSpaces()">
      <DialogContent class="flex max-h-[80vh] flex-col sm:max-w-[28.75rem]">
        <DialogHeader>
          <DialogTitle>Espacios</DialogTitle>
          <DialogDescription>{{ spaceZoneName }}</DialogDescription>
        </DialogHeader>

        <form class="flex gap-2" @submit.prevent="submitSpace">
          <Input
            v-model="newSpaceNum"
            aria-label="Número del nuevo espacio"
            placeholder="Ej: A-01"
            maxlength="10"
            class="h-9 flex-1"
          />
          <Button type="submit" :disabled="!newSpaceNum.trim() || spacesStore.saving">
            <Plus /> {{ spacesStore.saving ? '...' : 'Agregar' }}
          </Button>
        </form>

        <FormAlert :message="spacesStore.error" />

        <p v-if="spacesStore.loading" class="py-6 text-center text-body text-muted-foreground">Cargando espacios...</p>
        <p v-else-if="spacesStore.spaces.length === 0" class="py-6 text-center text-body text-muted-foreground">
          Sin espacios registrados
        </p>
        <ul v-else class="-mr-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-2 [scrollbar-width:thin]">
          <li
            v-for="s in spacesStore.spaces"
            :key="s.id"
            class="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2"
          >
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-body font-semibold tracking-[0.05em] text-foreground">{{ s.spaceNumber }}</span>
              <Badge :variant="s.occupied ? 'danger' : 'success'" size="status">{{ s.occupied ? 'Ocupado' : 'Libre' }}</Badge>
              <Badge :variant="s.monitored ? 'info' : 'neutral'" size="status">{{ s.monitored ? 'Monitoreado' : 'Sin ROI' }}</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              class="text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
              :aria-label="`Eliminar espacio ${s.spaceNumber}`"
              :disabled="spacesStore.saving"
              @click="spacesStore.removeSpace(s.id)"
            >
              <Trash2 />
            </Button>
          </li>
        </ul>

        <DialogFooter class="items-center border-t pt-3 sm:justify-between">
          <span class="text-body text-muted-foreground">
            {{ spacesStore.spaces.length }} espacio{{ spacesStore.spaces.length !== 1 ? 's' : '' }}
          </span>
          <Button variant="outline" @click="closeSpaces">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ROI editor (por zona) -->
    <ZoneRoiEditorModal
      v-if="roiZone"
      :zone-id="roiZone.id"
      :zone-name="roiZone.name"
      @close="roiZone = null"
    />
  </AdminPage>
</template>
