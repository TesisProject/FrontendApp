<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { Camera, Loader2, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { useAuthStore }    from '../../../iam/application/auth.store'
import { useProfileStore } from '../../application/profile.store'
import { useThemeStore }   from '../../../shared/application/theme.store'
import {
  avatarFileError, isProfileFormDirty, toProfilePayload, validateProfileForm,
  type ProfileForm, type ProfileFormField,
} from '../../domain/profile-form'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/shared/presentation/components/ui/avatar'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Label } from '@/app/shared/presentation/components/ui/label'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/shared/presentation/components/ui/tabs'
import { Textarea } from '@/app/shared/presentation/components/ui/textarea'
import ConfirmDialog from '../../../shared/presentation/components/ConfirmDialog.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'

const authStore    = useAuthStore()
const profileStore = useProfileStore()
const themeStore   = useThemeStore()

const activeTab = ref<'info' | 'preferences'>('info')
const userId    = computed(() => authStore.user?.id ?? 0)

const emptyForm = (): ProfileForm => ({ firstName: '', lastName: '', phone: '', bio: '' })

/** Lo último guardado: a esto vuelve el formulario al descartar (HU-04 E3). */
const saved = ref<ProfileForm>(emptyForm())
const form  = ref<ProfileForm>(emptyForm())
const localErrors = ref<Partial<Record<ProfileFormField, string>>>({})

const dirty = computed(() => isProfileFormDirty(form.value, saved.value))

function fieldError(field: ProfileFormField): string | undefined {
  return localErrors.value[field] ?? profileStore.fieldErrors[field]
}

function onFieldInput(field: ProfileFormField) {
  if (localErrors.value[field]) {
    const next = { ...localErrors.value }
    delete next[field]
    localErrors.value = next
  }
  profileStore.clearFieldError(field)
}

function loadForm() {
  const p = profileStore.profile
  saved.value = p
    ? { firstName: p.firstName, lastName: p.lastName, phone: p.phone, bio: p.bio }
    : emptyForm()
  form.value = { ...saved.value }
  localErrors.value = {}
}

function discardChanges() {
  form.value = { ...saved.value }
  localErrors.value = {}
}

const initials = computed(() => {
  const p = profileStore.profile
  if (p?.firstName && p?.lastName) return (p.firstName[0] + p.lastName[0]).toUpperCase()
  return authStore.user?.email?.[0]?.toUpperCase() ?? '?'
})

const fullName = computed(() => {
  const p = profileStore.profile
  if (p?.firstName || p?.lastName) return `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim()
  return authStore.user?.email ?? ''
})

const roleBadge: Record<string, string> = {
  ADMIN:    'Administrador',
  OPERATOR: 'Operador',
  USER:     'Usuario',
}

async function handleSaveProfile() {
  // HU-04 E2: el error queda en su campo y lo demás se conserva tal cual se escribió.
  localErrors.value = validateProfileForm(form.value)
  if (Object.keys(localErrors.value).length) return
  const ok = await profileStore.updateProfile(userId.value, toProfilePayload(form.value))
  if (ok) {
    loadForm()
    toast.success('Cambios guardados', { description: 'Tu perfil se actualizó correctamente.' })
  }
}

// ── Foto de perfil (R2) ──────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)

async function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file  = input.files?.[0]
  input.value = ''
  if (!file) return
  const invalid = avatarFileError(file)
  if (invalid) {
    toast.error(invalid)
    return
  }
  const error = await profileStore.uploadAvatar(userId.value, file)
  if (error) toast.error(error)
  else toast.success('Foto actualizada')
}

async function onRemoveAvatar() {
  const error = await profileStore.removeAvatar(userId.value)
  if (error) toast.error(error)
  else toast.success('Foto eliminada')
}

// ── Modo oscuro (HU-30): se aplica y se guarda en la cuenta al instante ──────
const darkMode   = ref(themeStore.isDark)
const savingDark = ref(false)

async function onDarkModeChange(value: boolean) {
  darkMode.value   = value
  savingDark.value = true
  const ok = await profileStore.saveDarkMode(userId.value, value)
  savingDark.value = false
  if (ok) {
    toast.success(value ? 'Modo oscuro activado' : 'Modo oscuro desactivado', {
      description: 'Se guardó en tu cuenta y se aplicará en tus otros dispositivos.',
    })
  } else {
    darkMode.value = themeStore.isDark
    toast.error('No se pudo guardar la preferencia. Inténtalo de nuevo.')
  }
}

// ── Salir sin guardar (HU-04 E3) ─────────────────────────────────────────────
const leaveDialogOpen = ref(false)
let resolveLeave: ((leave: boolean) => void) | null = null

onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  leaveDialogOpen.value = true
  return new Promise<boolean>((resolve) => { resolveLeave = resolve })
})

function answerLeave(leave: boolean) {
  leaveDialogOpen.value = false
  if (leave) discardChanges()
  resolveLeave?.(leave)
  resolveLeave = null
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value) return
  event.preventDefault()
}

onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  await profileStore.fetchProfile(userId.value)
  loadForm()
  await profileStore.fetchPreferences(userId.value)
  const pr = profileStore.preferences
  if (pr) {
    // La cuenta manda: si se cambió en otro dispositivo, se aplica aquí.
    themeStore.setDark(pr.darkMode)
    darkMode.value = pr.darkMode
  }
})

onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<template>
  <div class="mx-auto flex w-full max-w-narrow flex-col gap-5">
    <!-- Header card -->
    <section class="flex items-center gap-5 rounded-[14px] border bg-card p-6">
      <div class="relative">
        <Avatar class="size-[72px]">
          <AvatarImage v-if="profileStore.profile?.avatarUrl" :src="profileStore.profile.avatarUrl" :alt="fullName" />
          <AvatarFallback class="bg-navy text-display font-bold tracking-[0.08em] text-white">{{ initials }}</AvatarFallback>
        </Avatar>
        <div v-if="profileStore.avatarUploading" class="absolute inset-0 grid place-items-center rounded-full bg-black/40">
          <Loader2 class="size-6 animate-spin text-white" aria-label="Subiendo foto" />
        </div>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h1 class="truncate text-xl font-bold text-heading">{{ fullName }}</h1>
        <span class="truncate text-body text-muted-foreground">{{ authStore.user?.email }}</span>
        <Badge variant="warning" size="pill" class="mt-0.5 bg-primary/10 text-link">
          {{ roleBadge[authStore.user?.role ?? ''] ?? authStore.user?.role }}
        </Badge>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="onAvatarSelected"
        />
        <Button variant="outline" size="sm" :disabled="profileStore.avatarUploading" @click="fileInput?.click()">
          <Camera class="size-4" /> Cambiar foto
        </Button>
        <Button
          v-if="profileStore.profile?.avatarUrl"
          variant="ghost"
          size="sm"
          :disabled="profileStore.avatarUploading"
          @click="onRemoveAvatar"
        >
          <Trash2 class="size-4" /> Quitar
        </Button>
      </div>
    </section>

    <Tabs v-model="activeTab" class="gap-5">
      <TabsList aria-label="Secciones del perfil">
        <TabsTrigger value="info">Información personal</TabsTrigger>
        <TabsTrigger value="preferences">Preferencias</TabsTrigger>
      </TabsList>

      <StateMessage v-if="profileStore.profileLoading">Cargando...</StateMessage>
      <StateMessage v-else-if="profileStore.profileError" tone="error">
        {{ profileStore.profileError }}
      </StateMessage>

      <template v-else>
        <!-- Tab: Información personal -->
        <TabsContent value="info">
          <form class="flex flex-col gap-4 rounded-[14px] border bg-card p-7" novalidate @submit.prevent="handleSaveProfile">
            <h2 class="text-title font-bold text-heading">Información personal</h2>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <Label for="profile-first-name">Nombre</Label>
                <Input
                  id="profile-first-name"
                  v-model="form.firstName"
                  placeholder="Tu nombre"
                  maxlength="100"
                  autocomplete="given-name"
                  :aria-invalid="!!fieldError('firstName') || undefined"
                  aria-describedby="profile-first-name-error"
                  @input="onFieldInput('firstName')"
                />
                <p v-if="fieldError('firstName')" id="profile-first-name-error" class="text-body text-destructive">{{ fieldError('firstName') }}</p>
              </div>
              <div class="grid gap-1.5">
                <Label for="profile-last-name">Apellido</Label>
                <Input
                  id="profile-last-name"
                  v-model="form.lastName"
                  placeholder="Tu apellido"
                  maxlength="100"
                  autocomplete="family-name"
                  :aria-invalid="!!fieldError('lastName') || undefined"
                  aria-describedby="profile-last-name-error"
                  @input="onFieldInput('lastName')"
                />
                <p v-if="fieldError('lastName')" id="profile-last-name-error" class="text-body text-destructive">{{ fieldError('lastName') }}</p>
              </div>
            </div>

            <div class="grid gap-1.5">
              <Label for="profile-phone">Teléfono</Label>
              <Input
                id="profile-phone"
                v-model="form.phone"
                type="tel"
                placeholder="987 654 321"
                maxlength="20"
                autocomplete="tel"
                :aria-invalid="!!fieldError('phone') || undefined"
                aria-describedby="profile-phone-error"
                @input="onFieldInput('phone')"
              />
              <p v-if="fieldError('phone')" id="profile-phone-error" class="text-body text-destructive">{{ fieldError('phone') }}</p>
            </div>

            <div class="grid gap-1.5">
              <Label for="profile-bio">Biografía</Label>
              <Textarea
                id="profile-bio"
                v-model="form.bio"
                placeholder="Cuéntanos algo sobre ti..."
                rows="3"
                :aria-invalid="!!fieldError('bio') || undefined"
                aria-describedby="profile-bio-error"
                @input="onFieldInput('bio')"
              />
              <p class="text-body" :class="fieldError('bio') ? 'text-destructive' : 'text-muted-foreground'" id="profile-bio-error">
                {{ fieldError('bio') ?? `${form.bio.length}/500` }}
              </p>
            </div>

            <FormAlert :message="profileStore.saveError" />

            <div class="mt-1 flex justify-end gap-2 border-t border-border/60 pt-3">
              <Button type="button" variant="ghost" :disabled="!dirty || profileStore.saving" @click="discardChanges">
                Descartar cambios
              </Button>
              <Button type="submit" variant="emphasis" :disabled="!dirty || profileStore.saving">
                {{ profileStore.saving ? 'Guardando...' : 'Guardar cambios' }}
              </Button>
            </div>
          </form>
        </TabsContent>

        <!-- Tab: Preferencias -->
        <TabsContent value="preferences">
          <section class="flex flex-col gap-4 rounded-[14px] border bg-card p-7">
            <h2 class="text-title font-bold text-heading">Preferencias</h2>

            <div class="divide-y divide-border/60">
              <div class="flex items-center justify-between gap-4 py-2.5">
                <Label for="pref-dark" class="flex-col items-start gap-0.5">
                  <span class="text-sm font-medium text-foreground">Modo oscuro</span>
                  <span class="text-body font-normal text-muted-foreground">
                    Se aplica al instante y se guarda en tu cuenta para todos tus dispositivos
                  </span>
                </Label>
                <Switch
                  id="pref-dark"
                  :model-value="darkMode"
                  :disabled="savingDark || profileStore.prefsLoading"
                  @update:model-value="onDarkModeChange"
                />
              </div>
            </div>
          </section>
        </TabsContent>
      </template>
    </Tabs>

    <ConfirmDialog
      :open="leaveDialogOpen"
      title="¿Descartar cambios?"
      confirm-label="Descartar"
      destructive
      @confirm="answerLeave(true)"
      @cancel="answerLeave(false)"
    >
      Tienes cambios sin guardar en tu perfil. Si sales ahora se perderán y se conservará la
      información anterior.
    </ConfirmDialog>
  </div>
</template>
