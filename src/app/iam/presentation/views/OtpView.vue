<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '../../application/auth.store'
import { recoverySession } from '../../infrastructure/recovery-session'
import AuthCard from '../components/AuthCard.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import SubmitButton from '../components/SubmitButton.vue'
import { PinInput, PinInputGroup, PinInputSlot } from '@/app/shared/presentation/components/ui/pin-input'
import { Button } from '@/app/shared/presentation/components/ui/button'
import TextLink from '../../../shared/presentation/components/TextLink.vue'

const router    = useRouter()
const authStore = useAuthStore()

const CODE_LENGTH = 5

// El correo llega por sessionStorage, no por la URL (HU-03).
const email     = ref(recoverySession.get()?.email ?? '')
const digits    = ref<number[]>([])
const countdown = ref(30)
/** El código venció, ya se usó o se agotaron los intentos: solo queda pedir uno nuevo. */
const expired   = ref(false)

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

onMounted(() => {
  if (!email.value) {
    router.replace('/forgot-password')
    return
  }
  startCountdown()
})
onUnmounted(() => { if (timer) clearInterval(timer) })

async function handleSubmit() {
  if (code.value.length < CODE_LENGTH || expired.value) return
  const result = await authStore.verifyOtp(email.value, code.value)
  if (result === 'ok') router.push('/reset-password')
  else if (result === 'expired') expired.value = true
}

async function requestNewCode() {
  const ok = await authStore.forgotPassword(email.value)
  if (!ok) return
  expired.value = false
  digits.value  = []
  startCountdown()
  toast.success('Te enviamos un código nuevo', { description: 'Revisa tu correo. Vence en 15 minutos.' })
}

function handleResend() {
  if (countdown.value > 0) return
  void requestNewCode()
}
</script>

<template>
  <AuthCard
    back
    eyebrow="Recuperación"
    title="Verifica tu correo"
    sub="Si el correo está registrado, te enviamos un código de 5 dígitos que vence en 15 minutos."
    @back="router.back()"
  >
    <form class="mb-[18px] flex flex-col gap-3.5" @submit.prevent="handleSubmit" novalidate>
      <PinInput
        v-model="digits"
        type="number"
        otp
        :disabled="expired"
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
            class="h-14 w-auto min-w-0 flex-1 rounded-lg border-[1.5px] bg-card font-display text-page font-bold text-ink first:rounded-l-lg last:rounded-r-lg focus:border-ring focus:ring-4 focus:ring-ring/15 aria-invalid:ring-4 aria-invalid:ring-destructive/12"
          />
        </PinInputGroup>
      </PinInput>

      <div v-if="!expired" class="-mt-0.5 mb-0.5 flex justify-end">
        <Button
          variant="link"
          type="button"
          class="h-auto p-0 text-body font-medium disabled:text-muted-foreground disabled:opacity-100"
          :disabled="countdown > 0"
          @click="handleResend"
        >
          Reenviar código{{ countdown > 0 ? ` (${countdown}s)` : '' }}
        </Button>
      </div>

      <FormAlert :message="authStore.recoveryError" />

      <Button
        v-if="expired"
        type="button"
        size="xl"
        class="w-full"
        :disabled="authStore.recoveryLoading"
        @click="requestNewCode"
      >
        Solicitar un código nuevo
      </Button>
      <SubmitButton
        v-else
        :loading="authStore.recoveryLoading"
        :disabled="code.length < CODE_LENGTH"
        label="Verificar código"
        loading-label="Verificando..."
      />
    </form>

    <p class="text-center text-body text-muted-foreground">
      <TextLink to="/login">← Volver a iniciar sesión</TextLink>
    </p>
  </AuthCard>
</template>
