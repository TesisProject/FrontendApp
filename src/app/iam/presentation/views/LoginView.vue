<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useAuthStore } from '../../application/auth.store'
import AuthCard from '../components/AuthCard.vue'
import AuthField from '../components/AuthField.vue'
import AuthInput from '../components/AuthInput.vue'
import FormAlert from '../../../shared/presentation/components/FormAlert.vue'
import SubmitButton from '../components/SubmitButton.vue'
import TextLink from '../../../shared/presentation/components/TextLink.vue'

const router    = useRouter()
const authStore = useAuthStore()

const schema = toTypedSchema(z.object({
  email:    z.preprocess(val => val ?? '', z.string().min(1, 'El correo es requerido').email('Ingresa un correo válido')),
  password: z.preprocess(val => val ?? '', z.string().min(1, 'La contraseña es requerida')),
}))

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: schema,
  validateOnMount:  false,
})

// onTouched: validate on blur first time, then re-validate on every change
const fieldOpts = (state: { touched: boolean }) => ({
  validateOnBlur:        true,
  validateOnModelUpdate: state.touched,
})

const [email, emailAttrs]       = defineField<'email', string>('email',       fieldOpts)
const [password, passwordAttrs] = defineField<'password', string>('password', fieldOpts)

// track which fields the user has interacted with (for green valid border)
const touched = reactive({ email: false, password: false })

const onSubmit = handleSubmit(async (values) => {
  const ok = await authStore.login(values.email, values.password)
  if (ok) router.push('/dashboard')
})
</script>

<template>
  <AuthCard
    eyebrow="Bienvenido de vuelta"
    title="Inicia sesión"
    sub="Ingresa tus credenciales para ver la disponibilidad en tiempo real."
  >
    <form class="mb-[18px] flex flex-col gap-3.5" @submit.prevent="onSubmit" novalidate>
      <AuthField label="Correo electrónico" :error="errors.email">
        <AuthInput
          v-model="email"
          v-bind="emailAttrs"
          type="email"
          :error="!!errors.email"
          :valid="touched.email && !errors.email"
          autocomplete="email"
          placeholder="tucorreo@ejemplo.com"
          @blur="touched.email = true"
        />
      </AuthField>

      <AuthField label="Contraseña" :error="errors.password">
        <AuthInput
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          :error="!!errors.password"
          :valid="touched.password && !errors.password"
          autocomplete="current-password"
          placeholder="••••••••"
          @blur="touched.password = true"
        />
      </AuthField>

      <div class="-mt-0.5 mb-0.5 flex justify-end">
        <TextLink to="/forgot-password">¿Olvidaste tu contraseña?</TextLink>
      </div>

      <FormAlert :message="authStore.loginError" />

      <SubmitButton
        :loading="authStore.loginLoading"
        label="Iniciar sesión"
        loading-label="Iniciando sesión..."
      />
    </form>

    <p class="text-center text-[13px] text-muted-foreground">
      ¿No tienes cuenta?
      <TextLink to="/register">Regístrate aquí</TextLink>
    </p>

    <p class="text-center text-[13px] text-muted-foreground">
      ¿Eres administrador?
      <TextLink to="/admin">Accede al panel</TextLink>
    </p>
  </AuthCard>
</template>
