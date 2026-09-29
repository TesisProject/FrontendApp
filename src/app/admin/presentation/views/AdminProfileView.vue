<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../../iam/application/auth.store'
import { adminApi } from '../../infrastructure/admin-api'
import { httpClient } from '../../../shared/infrastructure/http-client'
import { Lock, ShieldCheck, User } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Button } from '@/app/shared/presentation/components/ui/button'
import { Input } from '@/app/shared/presentation/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/shared/presentation/components/ui/card'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import AdminPage from '../components/AdminPage.vue'
import AdminField from '../components/AdminField.vue'

const authStore = useAuthStore()
const userId    = computed(() => authStore.user?.id ?? 0)
const email     = computed(() => authStore.user?.email ?? '')

// Profile section
const profileForm    = ref({ firstName: '', lastName: '', phone: '' })
const profileLoading = ref(false)
const profileSaving  = ref(false)
const profileError   = ref<string | null>(null)

// Password section
const passForm   = ref({ currentPassword: '', newPassword: '', confirm: '' })
const passSaving = ref(false)
const passError  = ref<string | null>(null)

async function loadProfile() {
  if (!userId.value) return
  profileLoading.value = true
  try {
    const p = await adminApi.getUserProfile(userId.value)
    profileForm.value = {
      firstName: p.firstName ?? '',
      lastName:  p.lastName  ?? '',
      phone:     p.phone     ?? '',
    }
  } finally {
    profileLoading.value = false
  }
}

async function saveProfile() {
  profileSaving.value = true
  profileError.value  = null
  try {
    await adminApi.updateUserProfile(userId.value, profileForm.value)
    toast.success('Perfil actualizado correctamente')
  } catch {
    profileError.value = 'Error al guardar, intenta de nuevo'
  } finally {
    profileSaving.value = false
  }
}

async function savePassword() {
  if (!passForm.value.currentPassword) {
    passError.value = 'Ingresa tu contraseña actual'
    return
  }
  if (passForm.value.newPassword.length < 8) {
    passError.value = 'La nueva contraseña debe tener al menos 8 caracteres'
    return
  }
  if (passForm.value.newPassword !== passForm.value.confirm) {
    passError.value = 'Las contraseñas no coinciden'
    return
  }
  passSaving.value = true
  passError.value  = null
  try {
    await httpClient.put(`/iam/users/${userId.value}/password`, {
      currentPassword: passForm.value.currentPassword,
      newPassword:     passForm.value.newPassword,
    })
    toast.success('Contraseña actualizada correctamente')
    passForm.value = { currentPassword: '', newPassword: '', confirm: '' }
  } catch (err: any) {
    const code = err?.error ?? ''
    passError.value = code === 'INVALID_PASSWORD' ? 'La contraseña actual es incorrecta' : 'Error al actualizar contraseña'
  } finally {
    passSaving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <AdminPage title="Mi perfil" :sub="email">
    <div class="mb-5 grid gap-5 md:grid-cols-2">
      <!-- Info personal -->
      <Card class="gap-4">
        <CardHeader class="flex items-center gap-2.5">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy-soft text-navy">
            <User class="size-[18px]" />
          </span>
          <CardTitle class="text-[15px] font-bold text-navy">Información personal</CardTitle>
        </CardHeader>

        <CardContent>
          <p v-if="profileLoading" class="text-[13px] text-muted-foreground">Cargando perfil...</p>

          <form v-else class="grid gap-3.5" @submit.prevent="saveProfile">
            <div class="grid gap-3 sm:grid-cols-2">
              <AdminField v-slot="{ id }" label="Nombre">
                <Input :id="id" v-model="profileForm.firstName" placeholder="Juan" />
              </AdminField>
              <AdminField v-slot="{ id }" label="Apellido">
                <Input :id="id" v-model="profileForm.lastName" placeholder="Pérez" />
              </AdminField>
            </div>
            <AdminField v-slot="{ id }" label="Teléfono">
              <Input :id="id" v-model="profileForm.phone" type="tel" placeholder="+51 999 000 111" />
            </AdminField>
            <AdminField v-slot="{ id }" label="Correo electrónico">
              <Input :id="id" :model-value="email" type="email" disabled class="bg-muted" />
            </AdminField>

            <FormAlert :message="profileError" />

            <div class="mt-1 flex justify-end">
              <Button type="submit" :disabled="profileSaving">
                {{ profileSaving ? 'Guardando...' : 'Guardar cambios' }}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- Cambiar contraseña -->
      <Card class="gap-4">
        <CardHeader class="flex items-center gap-2.5">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-navy-soft text-navy">
            <Lock class="size-[18px]" />
          </span>
          <CardTitle class="text-[15px] font-bold text-navy">Cambiar contraseña</CardTitle>
        </CardHeader>

        <CardContent>
          <form class="grid gap-3.5" @submit.prevent="savePassword">
            <AdminField v-slot="{ id }" label="Contraseña actual">
              <Input :id="id" v-model="passForm.currentPassword" type="password" placeholder="Tu contraseña actual" autocomplete="current-password" />
            </AdminField>
            <AdminField v-slot="{ id }" label="Nueva contraseña">
              <Input :id="id" v-model="passForm.newPassword" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
            </AdminField>
            <AdminField v-slot="{ id }" label="Confirmar contraseña">
              <Input :id="id" v-model="passForm.confirm" type="password" placeholder="Repite la contraseña" autocomplete="new-password" />
            </AdminField>

            <FormAlert :message="passError" />

            <div class="mt-1 flex justify-end">
              <Button
                type="submit"
                :disabled="passSaving || !passForm.currentPassword || !passForm.newPassword || !passForm.confirm"
              >
                {{ passSaving ? 'Guardando...' : 'Actualizar contraseña' }}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>

    <span class="inline-flex items-center gap-1.5 rounded-full bg-[#ebf8ff] px-3.5 py-1.5 text-xs font-semibold text-[#2b6cb0]">
      <ShieldCheck class="size-3.5" />
      Cuenta con rol Administrador
    </span>
  </AdminPage>
</template>
