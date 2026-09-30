<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore }    from '../../../iam/application/auth.store'
import { useProfileStore } from '../../application/profile.store'
import { useThemeStore }   from '../../../shared/application/theme.store'
import { toast } from 'vue-sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/shared/presentation/components/ui/avatar'
import { Badge } from '@/app/shared/presentation/components/ui/badge'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Label } from '@/app/shared/presentation/components/ui/label'
import { Switch } from '@/app/shared/presentation/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/shared/presentation/components/ui/tabs'
import { Textarea } from '@/app/shared/presentation/components/ui/textarea'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import StateMessage from '../../../shared/presentation/components/StateMessage.vue'

const authStore    = useAuthStore()
const profileStore = useProfileStore()
const themeStore   = useThemeStore()

const activeTab  = ref<'info' | 'preferences'>('info')

const userId = computed(() => authStore.user?.id ?? 0)

const form = ref({
  firstName: '',
  lastName:  '',
  phone:     '',
  avatarUrl: '',
  bio:       '',
})

const prefs = ref({
  darkMode:           false,
  language:           'es',
  alertFreeSpace:     true,
  alertSaturated:     true,
  alertCameraFailure: true,
  alertRadiusM:       500,
})

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

const alertToggles = [
  { key: 'alertFreeSpace',     label: 'Espacio libre disponible', description: 'Notificar cuando haya espacios libres cerca' },
  { key: 'alertSaturated',     label: 'Zona saturada',            description: 'Notificar cuando una zona supere el 70% de ocupación' },
  { key: 'alertCameraFailure', label: 'Fallo de cámara',          description: 'Notificar cuando una cámara quede fuera de línea' },
] as const

const roleBadge: Record<string, string> = {
  ADMIN:    'Administrador',
  OPERATOR: 'Operador',
  USER:     'Usuario',
}

watch(() => prefs.value.darkMode, (val) => themeStore.setDark(val))

async function handleSaveProfile() {
  const ok = await profileStore.updateProfile(userId.value, { ...form.value })
  if (ok) toast.success('Cambios guardados')
}

async function handleSavePreferences() {
  const ok = await profileStore.updatePreferences(userId.value, { ...prefs.value })
  if (ok) toast.success('Preferencias guardadas')
}

onMounted(async () => {
  await profileStore.fetchProfile(userId.value)
  const p = profileStore.profile
  if (p) {
    form.value = {
      firstName: p.firstName,
      lastName:  p.lastName,
      phone:     p.phone,
      avatarUrl: p.avatarUrl,
      bio:       p.bio,
    }
  }

  await profileStore.fetchPreferences(userId.value)
  const pr = profileStore.preferences
  if (pr) {
    prefs.value = {
      darkMode:           themeStore.isDark,  // usa el estado activo real, no el del backend
      language:           pr.language,
      alertFreeSpace:     pr.alertFreeSpace,
      alertSaturated:     pr.alertSaturated,
      alertCameraFailure: pr.alertCameraFailure,
      alertRadiusM:       pr.alertRadiusM,
    }
  }
})
</script>

<template>
  <div class="mx-auto flex w-full max-w-[860px] flex-col gap-5">
    <!-- Header card -->
    <section class="flex items-center gap-5 rounded-[14px] border bg-card p-6">
      <Avatar class="size-[72px]">
        <AvatarImage v-if="profileStore.profile?.avatarUrl" :src="profileStore.profile.avatarUrl" :alt="fullName" />
        <AvatarFallback class="bg-navy text-[26px] font-bold tracking-[1px] text-white">{{ initials }}</AvatarFallback>
      </Avatar>
      <div class="flex min-w-0 flex-col gap-1">
        <h1 class="truncate text-xl font-bold text-heading">{{ fullName }}</h1>
        <span class="truncate text-[13px] text-muted-foreground">{{ authStore.user?.email }}</span>
        <Badge variant="warning" size="pill" class="mt-0.5 bg-primary/10 text-link">
          {{ roleBadge[authStore.user?.role ?? ''] ?? authStore.user?.role }}
        </Badge>
      </div>
    </section>

    <Tabs v-model="activeTab" class="gap-5">
      <TabsList aria-label="Secciones del perfil">
        <TabsTrigger value="info">Información personal</TabsTrigger>
        <TabsTrigger value="preferences">Preferencias</TabsTrigger>
      </TabsList>

      <StateMessage v-if="profileStore.profileLoading || profileStore.prefsLoading">Cargando...</StateMessage>
      <StateMessage v-else-if="profileStore.profileError || profileStore.prefsError" tone="error">
        {{ profileStore.profileError || profileStore.prefsError }}
      </StateMessage>

      <template v-else>
        <!-- Tab: Información personal -->
        <TabsContent value="info">
          <form class="flex flex-col gap-4 rounded-[14px] border bg-card p-7" @submit.prevent="handleSaveProfile">
            <h2 class="text-[15px] font-bold text-heading">Información personal</h2>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <Label for="profile-first-name">Nombre</Label>
                <Input id="profile-first-name" v-model="form.firstName" placeholder="Tu nombre" maxlength="100" autocomplete="given-name" />
              </div>
              <div class="grid gap-1.5">
                <Label for="profile-last-name">Apellido</Label>
                <Input id="profile-last-name" v-model="form.lastName" placeholder="Tu apellido" maxlength="100" autocomplete="family-name" />
              </div>
            </div>

            <div class="grid gap-1.5">
              <Label for="profile-phone">Teléfono</Label>
              <Input id="profile-phone" v-model="form.phone" type="tel" placeholder="+51 999 999 999" maxlength="20" autocomplete="tel" />
            </div>

            <div class="grid gap-1.5">
              <Label for="profile-avatar">URL de foto de perfil</Label>
              <Input id="profile-avatar" v-model="form.avatarUrl" type="url" placeholder="https://..." maxlength="500" />
            </div>

            <div class="grid gap-1.5">
              <Label for="profile-bio">Biografía</Label>
              <Textarea id="profile-bio" v-model="form.bio" placeholder="Cuéntanos algo sobre ti..." rows="3" />
            </div>

            <FormAlert :message="profileStore.saveError" />

            <div class="mt-1 flex justify-end border-t border-border/60 pt-3">
              <Button type="submit" variant="emphasis" :disabled="profileStore.saving">
                {{ profileStore.saving ? 'Guardando...' : 'Guardar cambios' }}
              </Button>
            </div>
          </form>
        </TabsContent>

        <!-- Tab: Preferencias -->
        <TabsContent value="preferences">
          <form class="flex flex-col gap-4 rounded-[14px] border bg-card p-7" @submit.prevent="handleSavePreferences">
            <h2 class="text-[15px] font-bold text-heading">Preferencias</h2>

            <div class="divide-y divide-border/60">
              <div class="flex items-center justify-between gap-4 py-2.5">
                <Label for="pref-dark" class="flex-col items-start gap-0.5">
                  <span class="text-sm font-medium text-foreground">Modo oscuro</span>
                  <span class="text-xs font-normal text-muted-foreground">Cambia la apariencia de la aplicación</span>
                </Label>
                <Switch id="pref-dark" v-model="prefs.darkMode" />
              </div>
            </div>

            <h3 class="border-t border-border/60 pt-3 text-[13px] font-semibold text-foreground/80">Alertas</h3>

            <div class="-mt-2 divide-y divide-border/60">
              <div v-for="a in alertToggles" :key="a.key" class="flex items-center justify-between gap-4 py-2.5">
                <Label :for="`pref-${a.key}`" class="flex-col items-start gap-0.5">
                  <span class="text-sm font-medium text-foreground">{{ a.label }}</span>
                  <span class="text-xs font-normal text-muted-foreground">{{ a.description }}</span>
                </Label>
                <Switch :id="`pref-${a.key}`" v-model="prefs[a.key]" />
              </div>
            </div>

            <div class="mt-2 grid gap-1.5">
              <Label for="pref-radius">Radio de alertas</Label>
              <div class="flex items-center gap-2">
                <Input id="pref-radius" v-model.number="prefs.alertRadiusM" type="number" min="0" step="50" class="w-[110px]" />
                <span class="text-[13px] text-muted-foreground">metros</span>
              </div>
            </div>

            <FormAlert :message="profileStore.saveError" />

            <div class="mt-1 flex justify-end border-t border-border/60 pt-3">
              <Button type="submit" variant="emphasis" :disabled="profileStore.saving">
                {{ profileStore.saving ? 'Guardando...' : 'Guardar preferencias' }}
              </Button>
            </div>
          </form>
        </TabsContent>
      </template>
    </Tabs>
  </div>
</template>
