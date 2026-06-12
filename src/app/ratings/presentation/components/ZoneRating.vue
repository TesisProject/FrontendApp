<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore }    from '../../../../app/iam/application/auth.store'
import { useRatingsStore } from '../../application/ratings.store'

const props = defineProps<{ zoneId: number }>()

const authStore    = useAuthStore()
const ratingsStore = useRatingsStore()

const userId  = computed(() => authStore.user?.id ?? 0)
const current = computed(() => ratingsStore.forZone(props.zoneId).value)
const reviews = computed(() => ratingsStore.reviewsForZone(props.zoneId).value)
const avg     = computed(() => ratingsStore.avgStars(props.zoneId).value)
const isLoadingReviews = computed(() => ratingsStore.reviewsLoading[props.zoneId] ?? false)

// form
const editing  = ref(false)
const hovered  = ref(0)
const form     = ref({ stars: 0, comment: '', type: '' })
const savedOk  = ref(false)

function startEdit() {
  form.value = {
    stars:   current.value?.stars   ?? 0,
    comment: current.value?.comment ?? '',
    type:    current.value?.type    ?? '',
  }
  editing.value = true
  savedOk.value = false
}

function cancelEdit() {
  editing.value = false
  hovered.value = 0
}

function starLabel(n: number) {
  return ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][n] ?? ''
}

function starFill(n: number, active: number) {
  return n <= active ? '#f59e0b' : '#e5e7eb'
}

function initials(displayName: string) {
  return displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function save() {
  if (!form.value.stars) return
  const ok = await ratingsStore.submit(userId.value, props.zoneId, form.value.stars, form.value.comment, form.value.type)
  if (ok) {
    editing.value = false
    savedOk.value = true
    hovered.value = 0
    // recarga reseñas públicas
    await ratingsStore.fetchByZone(props.zoneId)
    setTimeout(() => savedOk.value = false, 3000)
  }
}

async function deleteRating() {
  const ok = await ratingsStore.remove(userId.value, props.zoneId)
  if (ok) await ratingsStore.fetchByZone(props.zoneId)
}

onMounted(async () => {
  await Promise.all([
    userId.value ? ratingsStore.fetchByUser(userId.value) : Promise.resolve(),
    ratingsStore.fetchByZone(props.zoneId),
  ])
})
</script>

<template>
  <div class="zone-rating">

    <!-- ── Reseñas de la comunidad ─────────────────────── -->
    <div class="block">
      <div class="block-header">
        <span class="block-title">Reseñas</span>
        <div v-if="!isLoadingReviews && reviews.length" class="avg-pill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
          {{ avg.toFixed(1) }} · {{ reviews.length }} {{ reviews.length === 1 ? 'reseña' : 'reseñas' }}
        </div>
      </div>

      <div v-if="isLoadingReviews" class="section-state">Cargando reseñas...</div>

      <div v-else-if="reviews.length === 0" class="empty-reviews">
        Sé el primero en calificar esta zona
      </div>

      <div v-else class="reviews-list">
        <div v-for="r in reviews" :key="r.userId" class="review-card">
          <div class="review-top">
            <div class="avatar">{{ initials(r.userDisplayName) }}</div>
            <div class="review-meta">
              <span class="reviewer-name">{{ r.userDisplayName }}</span>
              <span class="review-date">{{ formatDate(r.createdAt) }}</span>
            </div>
            <div class="review-stars">
              <svg v-for="n in 5" :key="n" width="13" height="13" viewBox="0 0 24 24" :fill="starFill(n, r.stars)" stroke="none">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </div>
          </div>
          <p v-if="r.comment" class="review-comment">{{ r.comment }}</p>
        </div>
      </div>
    </div>

    <!-- ── Tu calificación ────────────────────────────── -->
    <div class="block" v-if="userId">
      <div class="block-header">
        <span class="block-title">Tu calificación</span>
        <span v-if="savedOk" class="saved-badge">¡Guardado!</span>
      </div>

      <!-- Sin calificación, no editando -->
      <div v-if="!current && !editing" class="empty-state">
        <p class="empty-text">Aún no has calificado esta zona</p>
        <button class="btn-rate" @click="startEdit">Calificar</button>
      </div>

      <!-- Calificación existente, no editando -->
      <div v-else-if="current && !editing" class="existing-rating">
        <div class="stars-display">
          <svg v-for="n in 5" :key="n" width="20" height="20" viewBox="0 0 24 24" :fill="starFill(n, current.stars)" stroke="none">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
          <span class="stars-label">{{ starLabel(current.stars) }}</span>
        </div>
        <p v-if="current.comment" class="comment-display">{{ current.comment }}</p>
        <div class="existing-actions">
          <button class="btn-edit" @click="startEdit">Editar</button>
          <button class="btn-delete" :disabled="ratingsStore.saving" @click="deleteRating">Eliminar</button>
        </div>
      </div>

      <!-- Formulario -->
      <div v-if="editing" class="edit-form">
        <div class="stars-input">
          <svg
            v-for="n in 5" :key="n"
            width="28" height="28" viewBox="0 0 24 24"
            :fill="starFill(n, hovered || form.stars)"
            stroke="none"
            class="star-btn"
            @mouseenter="hovered = n"
            @mouseleave="hovered = 0"
            @click="form.stars = n"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
          <span class="stars-hint">{{ starLabel(hovered || form.stars) }}</span>
        </div>

        <textarea
          v-model="form.comment"
          class="comment-input"
          placeholder="Comentario opcional..."
          rows="2"
          maxlength="300"
        />

        <p v-if="ratingsStore.error" class="err-msg">{{ ratingsStore.error }}</p>

        <div class="form-actions">
          <button class="btn-cancel" @click="cancelEdit">Cancelar</button>
          <button class="btn-save" :disabled="!form.stars || ratingsStore.saving" @click="save">
            {{ ratingsStore.saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.zone-rating {
  background: white;
  border-radius: 14px;
  border: 1px solid #e8e8e8;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.block {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block + .block {
  border-top: 1px solid #f0f0f0;
}

.block-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.block-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  flex: 1;
}

.avg-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 10px;
  border: 1px solid #fde68a;
}

.saved-badge {
  font-size: 11px;
  font-weight: 600;
  background: #f0fff4;
  color: #38a169;
  padding: 2px 10px;
  border-radius: 10px;
}

/* Reviews list */
.section-state { font-size: 13px; color: #aaa; }

.empty-reviews {
  font-size: 13px;
  color: #aaa;
  font-style: italic;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 2px;
}

.review-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}

.review-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8edf2;
  color: #092c4c;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.review-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.reviewer-name {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.review-date {
  font-size: 11px;
  color: #aaa;
}

.review-stars {
  display: flex;
  gap: 2px;
}

.review-comment {
  font-size: 13px;
  color: #555;
  margin: 0;
  line-height: 1.5;
}

/* Own rating */
.empty-state { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.empty-text  { font-size: 13px; color: #888; margin: 0; flex: 1; }

.btn-rate {
  padding: 6px 14px;
  border-radius: 8px;
  background: #092c4c;
  color: white;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.btn-rate:hover { opacity: 0.85; }

.existing-rating { display: flex; flex-direction: column; gap: 8px; }

.stars-display { display: flex; align-items: center; gap: 3px; }

.stars-label {
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
  margin-left: 6px;
}

.comment-display {
  font-size: 13px;
  color: #555;
  margin: 0;
  font-style: italic;
}

.existing-actions { display: flex; gap: 8px; }

.btn-edit {
  padding: 4px 12px;
  border-radius: 7px;
  border: 1.5px solid #092c4c;
  background: white;
  color: #092c4c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-edit:hover { background: #092c4c; color: white; }

.btn-delete {
  padding: 4px 12px;
  border-radius: 7px;
  border: 1.5px solid #e53e3e;
  background: white;
  color: #e53e3e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-delete:hover:not(:disabled) { background: #e53e3e; color: white; }
.btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }

.edit-form { display: flex; flex-direction: column; gap: 10px; }

.stars-input { display: flex; align-items: center; gap: 4px; }

.star-btn { cursor: pointer; transition: transform 0.1s; }
.star-btn:hover { transform: scale(1.15); }

.stars-hint {
  font-size: 12px;
  font-weight: 600;
  color: #f59e0b;
  margin-left: 8px;
  min-width: 70px;
}

.comment-input {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.comment-input:focus { border-color: #092c4c; }

.err-msg { font-size: 12px; color: #e53e3e; margin: 0; }

.form-actions { display: flex; gap: 8px; justify-content: flex-end; }

.btn-cancel {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1.5px solid #e0e0e0;
  background: white;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s;
}
.btn-cancel:hover { border-color: #999; }

.btn-save {
  padding: 6px 14px;
  border-radius: 8px;
  background: #092c4c;
  color: white;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s;
}
.btn-save:hover:not(:disabled) { opacity: 0.85; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
