<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue'
import { useAdminZonesStore } from '../../application/admin-zones.store'
import { useAdminSpacesStore } from '../../application/admin-spaces.store'
import { loadGoogleMaps } from '../../../shared/infrastructure/maps-loader'
import type { AdminZone, AdminZoneForm } from '../../domain/model/admin-zone.model'

const store       = useAdminZonesStore()
const spacesStore = useAdminSpacesStore()

// Spaces modal
const showSpaces    = ref(false)
const spaceZoneName = ref('')
const newSpaceNum   = ref('')

async function openSpaces(zone: AdminZone) {
  spaceZoneName.value = zone.name
  newSpaceNum.value   = ''
  showSpaces.value    = true
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
const search = ref('')

const filtered = computed(() =>
  store.zones.filter(z =>
    z.name.toLowerCase().includes(search.value.toLowerCase()) ||
    z.district.toLowerCase().includes(search.value.toLowerCase())
  )
)

// Modal
const showModal  = ref(false)
const editTarget = ref<AdminZone | null>(null)
const form       = ref<AdminZoneForm>({ name: '', street: '', district: '', city: '', latitude: 0, longitude: 0, totalSpaces: 0, totalCapacity: 0 })
const feedback   = ref<{ ok: boolean; msg: string } | null>(null)
const confirmId  = ref<number | null>(null)

// Places autocomplete
const addrInput       = ref<HTMLInputElement | null>(null)
const addrQuery       = ref('')
const addrSuggestions = ref<{ mainText: string; secondaryText: string; _raw: any }[]>([])
const showAddrDrop    = ref(false)
let placesLib:    any = null
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
    showAddrDrop.value    = false
    return
  }
  await ensurePlacesLib()
  if (!sessionToken) sessionToken = new placesLib.AutocompleteSessionToken()
  try {
    const result = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken,
      includedRegionCodes: ['pe'],
    })
    addrSuggestions.value = (result.suggestions ?? []).map((s: any) => {
      const pred = s.placePrediction
      return {
        mainText:      pred.mainText?.toString()      ?? pred.text?.toString() ?? '',
        secondaryText: pred.secondaryText?.toString() ?? '',
        _raw:          markRaw(pred),
      }
    })
    showAddrDrop.value = addrSuggestions.value.length > 0
  } catch {
    addrSuggestions.value = []
    showAddrDrop.value    = false
  }
}

async function selectAddr(item: { mainText: string; secondaryText: string; _raw: any }) {
  showAddrDrop.value    = false
  addrSuggestions.value = []
  sessionToken          = null

  const place = item._raw.toPlace()
  await place.fetchFields({ fields: ['location', 'addressComponents'] })

  if (place.location) {
    form.value.latitude  = place.location.lat()
    form.value.longitude = place.location.lng()
  }

  const components: { longText: string; types: string[] }[] = place.addressComponents ?? []
  const get = (...types: string[]) =>
    components.find(c => types.some(t => c.types.includes(t)))?.longText ?? ''

  const streetNumber  = get('street_number')
  const route         = get('route')
  form.value.street   = route ? (streetNumber ? `${route} ${streetNumber}` : route) : item.mainText
  form.value.district = get('sublocality_level_1', 'sublocality', 'locality')
  form.value.city     = get('administrative_area_level_2', 'administrative_area_level_1', 'locality')

  addrQuery.value = `${item.mainText}${item.secondaryText ? ', ' + item.secondaryText : ''}`
}

function onAddrInput() {
  if (suggestTimer) clearTimeout(suggestTimer)
  suggestTimer = setTimeout(() => fetchAddrSuggestions(addrQuery.value), 300)
}

function hideAddrDrop() {
  setTimeout(() => { showAddrDrop.value = false }, 150)
}

function openCreate() {
  editTarget.value = null
  form.value = { name: '', street: '', district: '', city: '', latitude: 0, longitude: 0, totalSpaces: 0, totalCapacity: 0 }
  addrQuery.value = ''
  feedback.value  = null
  showModal.value = true
}

function openEdit(zone: AdminZone) {
  editTarget.value = zone
  form.value = {
    name: zone.name, street: zone.street, district: zone.district, city: zone.city,
    latitude: zone.latitude, longitude: zone.longitude,
    totalSpaces: zone.totalSpaces, totalCapacity: zone.totalSpaces,
  }
  addrQuery.value = zone.street ? `${zone.street}, ${zone.district}` : ''
  feedback.value  = null
  showModal.value = true
}

function closeModal() { showModal.value = false }

function validate(): string | null {
  const f = form.value
  if (!f.name.trim())                          return 'El nombre de la zona es obligatorio'
  if (!f.street.trim())                        return 'La calle es obligatoria'
  if (!f.district.trim())                      return 'El distrito es obligatorio'
  if (!f.city.trim())                          return 'La ciudad es obligatoria'
  if (!f.latitude || !f.longitude)             return 'Selecciona una dirección del autocompletado para obtener las coordenadas'
  if (!f.totalSpaces   || f.totalSpaces   < 1) return 'El total de espacios debe ser al menos 1'
  if (!f.totalCapacity || f.totalCapacity < 1) return 'La capacidad total debe ser al menos 1'
  return null
}

async function handleSubmit() {
  const err = validate()
  if (err) { feedback.value = { ok: false, msg: err }; return }

  let ok: boolean
  if (editTarget.value) {
    ok = await store.updateZone(editTarget.value.id, form.value)
  } else {
    ok = await store.createZone(form.value)
  }
  feedback.value = ok
    ? { ok: true,  msg: editTarget.value ? 'Zona actualizada' : 'Zona creada' }
    : { ok: false, msg: 'Ocurrió un error, verifica los datos e intenta de nuevo' }
  if (ok) setTimeout(closeModal, 1000)
}

async function handleDelete(id: number) {
  await store.deleteZone(id)
  confirmId.value = null
}

function classColor(c: string) {
  return { LIBRE: '#38a169', MODERADO: '#f2894a', OCUPADO: '#e53e3e' }[c] ?? '#888'
}

onMounted(() => store.fetchZones())
</script>

<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Zonas</h1>
        <p class="page-sub">{{ store.zones.length }} zonas registradas</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nueva zona</button>
    </div>

    <div class="search-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input v-model="search" type="text" placeholder="Buscar por nombre o distrito..." />
    </div>

    <div v-if="store.loading" class="state-box">Cargando zonas...</div>
    <div v-else-if="store.error" class="state-box error">{{ store.error }}</div>

    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th><th>Nombre</th><th>Dirección</th><th>Espacios</th><th>Ocupación</th><th>Estado</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="7" class="empty-row">No se encontraron zonas</td>
          </tr>
          <tr v-for="z in filtered" :key="z.id">
            <td class="td-id">#{{ z.id }}</td>
            <td class="td-name">{{ z.name }}</td>
            <td class="td-addr">{{ z.street }}, {{ z.district }}</td>
            <td>{{ z.totalSpaces }}</td>
            <td>
              <div class="occ-wrap">
                <div class="occ-bar"><div class="occ-fill" :style="{ width: z.occupancyPercentage + '%', background: classColor(z.classification) }" /></div>
                <span class="occ-pct" :style="{ color: classColor(z.classification) }">{{ Math.round(z.occupancyPercentage) }}%</span>
              </div>
            </td>
            <td>
              <span class="badge" :style="{ background: classColor(z.classification) + '20', color: classColor(z.classification) }">
                {{ z.classification }}
              </span>
            </td>
            <td>
              <div class="actions">
                <button class="action-btn spaces" @click="openSpaces(z)">Espacios</button>
                <button class="action-btn edit" @click="openEdit(z)">Editar</button>
                <button class="action-btn delete" @click="confirmId = z.id">Eliminar</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Confirm delete -->
    <Transition name="modal">
      <div v-if="confirmId !== null" class="overlay" @click.self="confirmId = null">
        <div class="confirm-box">
          <p class="confirm-text">¿Eliminar esta zona? Esta acción no se puede deshacer.</p>
          <div class="confirm-actions">
            <button class="btn-ghost" @click="confirmId = null">Cancelar</button>
            <button class="btn-danger" @click="handleDelete(confirmId!)">Eliminar</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Create / Edit modal -->
    <Transition name="modal">
      <div v-if="showModal" class="overlay" @click.self="closeModal">
      <div class="modal">
        <h2 class="modal-title">{{ editTarget ? 'Editar zona' : 'Nueva zona' }}</h2>

        <!-- Nombre interno -->
        <div class="form-group">
          <label>Nombre de la zona</label>
          <input v-model="form.name" type="text" placeholder="Ej: Zona Norte, Zona Centro, Estacionamiento Sur" />
          <p class="field-hint">Nombre interno con el que identificarás esta zona.</p>
        </div>

        <div class="section-divider"><span>Ubicación</span></div>

        <!-- Places autocomplete -->
        <div class="form-group addr-wrap">
          <label>Buscar dirección <span class="optional">(autocompletado)</span></label>
          <div class="addr-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref="addrInput"
              v-model="addrQuery"
              type="text"
              placeholder="Escribe la dirección y selecciona una sugerencia"
              @input="onAddrInput"
              @blur="hideAddrDrop"
              @focus="addrSuggestions.length > 0 && (showAddrDrop = true)"
              autocomplete="off"
            />
          </div>
          <ul v-if="showAddrDrop" class="addr-drop">
            <li
              v-for="(s, i) in addrSuggestions"
              :key="i"
              class="addr-item"
              @mousedown.prevent="selectAddr(s)"
            >
              <span class="addr-main">{{ s.mainText }}</span>
              <span class="addr-sec">{{ s.secondaryText }}</span>
            </li>
          </ul>
          <p class="addr-hint">Al seleccionar, se rellenan automáticamente los campos de abajo.</p>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Ciudad</label>
            <input v-model="form.city" type="text" placeholder="Lima" />
          </div>
          <div class="form-group">
            <label>Distrito</label>
            <input v-model="form.district" type="text" placeholder="San Miguel" />
          </div>
        </div>

        <div class="form-group">
          <label>Calle</label>
          <input v-model="form.street" type="text" placeholder="Av. Ejemplo 123" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Latitud</label>
            <input v-model.number="form.latitude" type="number" step="0.000001" />
          </div>
          <div class="form-group">
            <label>Longitud</label>
            <input v-model.number="form.longitude" type="number" step="0.000001" />
          </div>
        </div>

        <div class="section-divider"><span>Capacidad</span></div>

        <div class="form-row">
          <div class="form-group">
            <label>Total de espacios</label>
            <input v-model.number="form.totalSpaces" type="number" min="1" />
          </div>
          <div class="form-group">
            <label>Capacidad total</label>
            <input v-model.number="form.totalCapacity" type="number" min="1" />
          </div>
        </div>

        <p v-if="feedback" class="feedback" :class="feedback.ok ? 'ok' : 'err'">{{ feedback.msg }}</p>

        <div class="modal-actions">
          <button class="btn-ghost" @click="closeModal">Cancelar</button>
          <button class="btn-primary" :disabled="store.saving" @click="handleSubmit">
            {{ store.saving ? 'Guardando...' : (editTarget ? 'Actualizar' : 'Crear zona') }}
          </button>
        </div>
      </div>
    </div>
    </Transition>

    <!-- Spaces modal -->
    <Transition name="modal">
      <div v-if="showSpaces" class="overlay" @click.self="closeSpaces">
        <div class="modal spaces-modal">
          <div class="modal-head">
            <div>
              <h2 class="modal-title">Espacios</h2>
              <p class="modal-sub">{{ spaceZoneName }}</p>
            </div>
            <button class="close-btn" @click="closeSpaces">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M13.5 4.5L4.5 13.5M4.5 4.5l9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="add-space-row">
            <input
              v-model="newSpaceNum"
              type="text"
              class="space-input"
              placeholder="Ej: A-01"
              maxlength="10"
              @keydown.enter="submitSpace"
            />
            <button
              class="btn-primary"
              :disabled="!newSpaceNum.trim() || spacesStore.saving"
              @click="submitSpace"
            >
              {{ spacesStore.saving ? '...' : '+ Agregar' }}
            </button>
          </div>

          <p v-if="spacesStore.error" class="err-msg">{{ spacesStore.error }}</p>

          <div v-if="spacesStore.loading" class="spaces-state">Cargando espacios...</div>
          <div v-else-if="spacesStore.spaces.length === 0" class="spaces-state">Sin espacios registrados</div>
          <div v-else class="spaces-list">
            <div v-for="s in spacesStore.spaces" :key="s.id" class="space-row">
              <div class="space-info">
                <span class="space-num">{{ s.spaceNumber }}</span>
                <span class="space-badge" :class="s.currentStatus === 'OCCUPIED' ? 'occupied' : 'free'">
                  {{ s.currentStatus === 'OCCUPIED' ? 'Ocupado' : 'Libre' }}
                </span>
              </div>
              <button class="space-del" :disabled="spacesStore.saving" @click="spacesStore.removeSpace(s.id)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 4h12M5.333 4V2.667A1.333 1.333 0 016.667 1.333h2.666A1.333 1.333 0 0110.667 2.667V4m2 0v9.333A1.333 1.333 0 0111.333 14.667H4.667A1.333 1.333 0 013.333 13.333V4h9.334z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="spaces-footer">
            <span class="spaces-count">{{ spacesStore.spaces.length }} espacio{{ spacesStore.spaces.length !== 1 ? 's' : '' }}</span>
            <button class="btn-ghost" @click="closeSpaces">Cerrar</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import '../styles/admin-shared.css';

.field-hint {
  font-size: 11px;
  color: #bbb;
  margin: 4px 0 0;
}

.section-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
}
.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #f0f0f0;
}
.section-divider span {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #bbb;
  white-space: nowrap;
}

/* Address autocomplete */
.addr-wrap { position: relative; }

.addr-box {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  padding: 0 12px;
  height: 38px;
  transition: border-color 0.2s;
}
.addr-box:focus-within { border-color: #092c4c; }

.addr-box input {
  border: none;
  outline: none;
  font-size: 13px;
  color: #333;
  background: transparent;
  width: 100%;
  font-family: inherit;
}
.addr-box input::placeholder { color: #bbb; }

.addr-drop {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
  z-index: 300;
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 200px;
  overflow-y: auto;
}

.addr-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 9px 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.addr-item:hover { background: #f5f8fb; }

.addr-main { font-size: 13px; font-weight: 500; color: #092c4c; }
.addr-sec  { font-size: 11px; color: #aaa; }

.addr-hint { font-size: 11px; color: #bbb; margin: 4px 0 0; }

.optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #bbb; }

/* Modal max-height + scroll */
.modal {
  max-height: 88vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

/* Overlay + modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal,
.modal-enter-active .confirm-box {
  transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.2s ease;
}
.modal-leave-active .modal,
.modal-leave-active .confirm-box {
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal,
.modal-enter-from .confirm-box {
  transform: translateY(20px) scale(0.97);
  opacity: 0;
}
.modal-leave-to .modal,
.modal-leave-to .confirm-box {
  transform: translateY(10px) scale(0.98);
  opacity: 0;
}

/* Spaces modal */
.spaces-modal {
  width: 460px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-sub {
  font-size: 12px;
  color: #888;
  margin: 2px 0 0;
}

.add-space-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.space-input {
  flex: 1;
  height: 36px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.space-input:focus { border-color: #092c4c; }

.spaces-state {
  text-align: center;
  color: #aaa;
  font-size: 13px;
  padding: 24px 0;
}

.spaces-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.space-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #eee;
}

.space-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.space-num {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  font-family: monospace;
  letter-spacing: 0.5px;
}

.space-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.space-badge.free     { background: #e6f9ef; color: #2e7d52; }
.space-badge.occupied { background: #fdecea; color: #c0392b; }

.space-del {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #bbb;
  transition: background 0.15s, color 0.15s;
}
.space-del:hover:not(:disabled) { background: #fdecea; color: #c0392b; }
.space-del:disabled { opacity: 0.4; cursor: not-allowed; }

.spaces-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.spaces-count {
  font-size: 12px;
  color: #aaa;
}

.err-msg {
  font-size: 12px;
  color: #c0392b;
  margin: 0 0 8px;
}

.action-btn.spaces {
  background: #e8f0fb;
  color: #1a56c4;
  border-color: #c3d4f5;
}
.action-btn.spaces:hover { background: #d0e3f9; }
</style>
