<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Star } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Textarea } from '@/app/shared/presentation/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/app/shared/presentation/components/ui/avatar'
import { useAuthStore }    from '../../../iam/application/auth.store'
import { useRatingsStore } from '../../application/ratings.store'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import { formatShortDate } from '../../../shared/helpers/date'
import StarRating from './StarRating.vue'

const props = defineProps<{ zoneId: number }>()

const authStore    = useAuthStore()
const ratingsStore = useRatingsStore()

const userId  = computed(() => authStore.user?.id ?? 0)
const current = computed(() => ratingsStore.forZone(props.zoneId).value)
const reviews = computed(() => ratingsStore.reviewsForZone(props.zoneId).value)
const avg     = computed(() => ratingsStore.avgStars(props.zoneId).value)
const isLoadingReviews = computed(() => ratingsStore.reviewsLoading[props.zoneId] ?? false)

// form
const editing = ref(false)
const hovered = ref(0)
const form    = ref({ stars: 0, comment: '', type: '' })

function startEdit() {
  form.value = {
    stars:   current.value?.stars   ?? 0,
    comment: current.value?.comment ?? '',
    type:    current.value?.type    ?? '',
  }
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  hovered.value = 0
}

function starLabel(n: number) {
  return ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][n] ?? ''
}

function initials(displayName: string) {
  return displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

async function save() {
  if (!form.value.stars) return
  const ok = await ratingsStore.submit(userId.value, props.zoneId, form.value.stars, form.value.comment, form.value.type)
  if (ok) {
    editing.value = false
    hovered.value = 0
    toast.success('Calificación guardada')
    // recarga reseñas públicas
    await ratingsStore.fetchByZone(props.zoneId)
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
  <section class="divide-y overflow-hidden rounded-[14px] border bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
    <!-- Reseñas de la comunidad -->
    <div class="flex flex-col gap-3 px-5 py-[18px]">
      <div class="flex items-center gap-2.5">
        <h2 class="flex-1 text-sm font-bold text-heading">Reseñas</h2>
        <span
          v-if="!isLoadingReviews && reviews.length"
          class="flex items-center gap-1 rounded-[10px] border border-amber-200 bg-amber-50 px-2.5 py-[3px] text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <Star :size="13" :stroke-width="0" class="fill-amber-500" aria-hidden="true" />
          {{ avg.toFixed(1) }} · {{ reviews.length }} {{ reviews.length === 1 ? 'reseña' : 'reseñas' }}
        </span>
      </div>

      <p v-if="isLoadingReviews" class="text-[13px] text-muted-foreground">Cargando reseñas...</p>
      <p v-else-if="reviews.length === 0" class="text-[13px] text-muted-foreground italic">
        Sé el primero en calificar esta zona
      </p>

      <ul v-else class="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-0.5">
        <li v-for="r in reviews" :key="r.userId" class="flex flex-col gap-1.5 rounded-[10px] border bg-muted/40 px-3 py-2.5">
          <div class="flex items-center gap-2.5">
            <Avatar class="size-8">
              <AvatarFallback class="bg-muted text-[11px] font-bold text-heading">{{ initials(r.userDisplayName) }}</AvatarFallback>
            </Avatar>
            <div class="flex flex-1 flex-col gap-px">
              <span class="text-xs font-semibold text-foreground">{{ r.userDisplayName }}</span>
              <span class="text-[11px] text-muted-foreground">{{ formatShortDate(r.createdAt) }}</span>
            </div>
            <StarRating :model-value="r.stars" readonly />
          </div>
          <p v-if="r.comment" class="text-[13px] leading-normal text-foreground/80">{{ r.comment }}</p>
        </li>
      </ul>
    </div>

    <!-- Tu calificación -->
    <div v-if="userId" class="flex flex-col gap-3 px-5 py-[18px]">
      <h2 class="text-sm font-bold text-heading">Tu calificación</h2>

      <div v-if="!current && !editing" class="flex flex-wrap items-center gap-3.5">
        <p class="flex-1 text-[13px] text-muted-foreground">Aún no has calificado esta zona</p>
        <Button size="sm" variant="emphasis" @click="startEdit">
          Calificar
        </Button>
      </div>

      <div v-else-if="current && !editing" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <StarRating :model-value="current.stars" readonly :size="20" />
          <span class="text-xs font-semibold text-amber-600 dark:text-amber-400">{{ starLabel(current.stars) }}</span>
        </div>
        <p v-if="current.comment" class="text-[13px] text-foreground/80 italic">{{ current.comment }}</p>
        <div class="flex gap-2">
          <Button size="sm" variant="outline-primary" class="border-emphasis text-emphasis hover:bg-emphasis hover:text-emphasis-foreground" @click="startEdit">
            Editar
          </Button>
          <Button size="sm" variant="outline-destructive" :disabled="ratingsStore.saving" @click="deleteRating">Eliminar</Button>
        </div>
      </div>

      <form v-if="editing" class="flex flex-col gap-2.5" @submit.prevent="save">
        <div class="flex items-center gap-2">
          <StarRating v-model="form.stars" v-model:hovered="hovered" :size="28" label="Tu calificación de la zona" />
          <span class="min-w-[70px] text-xs font-semibold text-amber-600 dark:text-amber-400" aria-live="polite">
            {{ starLabel(hovered || form.stars) }}
          </span>
        </div>

        <Textarea
          v-model="form.comment"
          aria-label="Comentario"
          placeholder="Comentario opcional..."
          rows="2"
          maxlength="300"
          class="min-h-0 resize-none"
        />

        <FormAlert :message="ratingsStore.error" />

        <div class="flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" @click="cancelEdit">Cancelar</Button>
          <Button type="submit" size="sm" :disabled="!form.stars || ratingsStore.saving">
            {{ ratingsStore.saving ? 'Guardando...' : 'Guardar' }}
          </Button>
        </div>
      </form>
    </div>
  </section>
</template>
