<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../application/auth.store'
import AuthCard from '../components/AuthCard.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import SubmitButton from '../components/SubmitButton.vue'
import { PinInput, PinInputGroup, PinInputSlot } from '@/app/shared/presentation/components/ui/pin-input'
import { Button } from '@/app/shared/presentation/components/ui/button'
import TextLink from '../../../shared/presentation/components/TextLink.vue'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const CODE_LENGTH = 5

const email     = computed(() => route.query.email as string ?? '')
const digits    = ref<number[]>([])
const countdown = ref(30)

let timer: ReturnType<typeof setInterval> | null = null

const code = computed(() => digits.value.filter(d => d !== undefined).join(''))

function startCountdown() {
  if (timer) clearInterval(timer)
  countdown.value = 30
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer!)
      timer = null
    }
  }, 1000)
}

onMounted(startCountdown)
onUnmounted(() => { if (timer) clearInterval(timer) })

async function handleSubmit() {
  if (code.value.length < CODE_LENGTH) return
  const ok = await authStore.verifyOtp(email.value, code.value)
  if (ok) router.push({ path: '/reset-password', query: { email: email.value, code: code.value } })
}

function handleResend() {
  if (countdown.value > 0) return
  authStore.forgotPassword(email.value)
  startCountdown()
}
</script>

<template>
  <AuthCard
    back
    eyebrow="Recuperación"
    title="Verifica tu correo"
    sub="Ingresa el código de 5 dígitos que enviamos a tu correo."
    @back="router.back()"
  >
    <form class="mb-[18px] flex flex-col gap-3.5" @submit.prevent="handleSubmit" novalidate>
      <PinInput
        v-model="digits"
        type="number"
        otp
        :aria-invalid="!!authStore.recoveryError || undefined"
        class="mb-1.5"
      >
        <PinInputGroup class="w-full gap-3">
          <PinInputSlot
            v-for="(_, i) in CODE_LENGTH"
            :key="i"
            :index="i"
            :aria-label="`Dígito ${i + 1} de ${CODE_LENGTH}`"
            :aria-invalid="!!authStore.recoveryError || undefined"
            class="h-14 w-auto min-w-0 flex-1 rounded-lg border-[1.5px] bg-card font-display text-[22px] font-bold text-ink first:rounded-l-lg last:rounded-r-lg focus:border-ring focus:ring-4 focus:ring-ring/15 aria-invalid:ring-4 aria-invalid:ring-destructive/12"
          />
        </PinInputGroup>
      </PinInput>

      <div class="-mt-0.5 mb-0.5 flex justify-end">
        <Button
          variant="link"
          type="button"
          class="h-auto p-0 text-[13px] font-medium disabled:text-muted-foreground disabled:opacity-100"
          :disabled="countdown > 0"
          @click="handleResend"
        >
          Reenviar código{{ countdown > 0 ? ` (${countdown}s)` : '' }}
        </Button>
      </div>

      <FormAlert :message="authStore.recoveryError" />

      <SubmitButton
        :loading="authStore.recoveryLoading"
        :label="'Verificar código'"
        loading-label="Verificando..."
      />
    </form>

    <p class="text-center text-[13px] text-muted-foreground">
      <TextLink to="/login">← Volver a iniciar sesión</TextLink>
    </p>
  </AuthCard>
</template>
