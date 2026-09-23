<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useAuthStore } from '../../application/auth.store'
import { DocumentType, DOCUMENT_TYPE_OPTIONS, DOCUMENT_NUMBER_RULES } from '../../domain/model/document-type.vo'
import { DEFAULT_PHONE_PREFIX, PHONE_PREFIX_OPTIONS } from '../../domain/model/phone-prefix.vo'
import AuthCard from '../../../shared/presentation/components/ui/AuthCard.vue'
import AuthField from '../../../shared/presentation/components/ui/AuthField.vue'
import AuthSelect from '../../../shared/presentation/components/ui/AuthSelect.vue'
import AuthInput from '../../../shared/presentation/components/ui/AuthInput.vue'
import AuthAlert from '../../../shared/presentation/components/ui/AuthAlert.vue'
import SubmitButton from '../../../shared/presentation/components/ui/SubmitButton.vue'

const router    = useRouter()
const authStore = useAuthStore()

// coerce undefined/null to '' so Zod min() shows the right message (not "invalid_type")
const req = (msg: string, min = 1) =>
  z.preprocess(val => val ?? '', z.string().min(min, msg))

// quita espacios y guiones para que "987 654 321" sea válido
const compact = (msg: string, pattern: RegExp) =>
  z.preprocess(val => String(val ?? '').replace(/[\s-]/g, ''), z.string().regex(pattern, msg))

const schema = toTypedSchema(z.object({
  firstName:       req('Mínimo 2 caracteres', 2),
  lastName:        req('Mínimo 2 caracteres', 2),
  email:           z.preprocess(val => val ?? '', z.string().min(1, 'El correo es requerido').email('Ingresa un correo válido')),
  documentType:    z.nativeEnum(DocumentType),
  documentNumber:  compact('Ingresa tu número de documento', /^[A-Za-z0-9]+$/),
  phonePrefix:     z.string().regex(/^\+\d{1,4}$/, 'Prefijo inválido'),
  phone:           compact('Ingresa un celular válido (6-15 dígitos)', /^\d{6,15}$/),
  password:        req('Mínimo 8 caracteres', 8),
  confirmPassword: req('Confirma tu contraseña', 1),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
}).superRefine((data, ctx) => {
  const rule = DOCUMENT_NUMBER_RULES[data.documentType]
  if (!rule.pattern.test(data.documentNumber)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: rule.message, path: ['documentNumber'] })
  }
}))

const { errors, handleSubmit, defineField } = useForm({
  validationSchema: schema,
  validateOnMount:  false,
  initialValues: { documentType: DocumentType.DNI, phonePrefix: DEFAULT_PHONE_PREFIX },
})

// onTouched: validate on blur first time, then re-validate on every change
const fieldOpts = (state: { touched: boolean }) => ({
  validateOnBlur:        true,
  validateOnModelUpdate: state.touched,
})

const [firstName,       firstNameAttrs]       = defineField<'firstName', string>('firstName',             fieldOpts)
const [lastName,        lastNameAttrs]        = defineField<'lastName', string>('lastName',               fieldOpts)
const [email,           emailAttrs]           = defineField<'email', string>('email',                     fieldOpts)
const [documentType,    documentTypeAttrs]    = defineField<'documentType', string>('documentType',       fieldOpts)
const [documentNumber,  documentNumberAttrs]  = defineField<'documentNumber', string>('documentNumber',   fieldOpts)
const [phonePrefix,     phonePrefixAttrs]     = defineField<'phonePrefix', string>('phonePrefix',         fieldOpts)
const [phone,           phoneAttrs]           = defineField<'phone', string>('phone',                     fieldOpts)
const [password,        passwordAttrs]        = defineField<'password', string>('password',               fieldOpts)
const [confirmPassword, confirmPasswordAttrs] = defineField<'confirmPassword', string>('confirmPassword', fieldOpts)

// track which fields the user has interacted with (for green valid border)
const touched = reactive({
  firstName: false, lastName: false, email: false,
  documentNumber: false, phone: false, password: false, confirmPassword: false,
})

const onSubmit = handleSubmit(async (values) => {
  const ok = await authStore.register(values)
  if (ok) router.push('/dashboard')
})
</script>

<template>
  <AuthCard
    back
    eyebrow="Crea tu cuenta"
    title="Empieza a aparcar mejor"
    sub="Regístrate para encontrar espacios libres en tiempo real cerca de ti."
    @back="router.back()"
  >
    <form class="auth-form" @submit.prevent="onSubmit" novalidate>
      <div class="auth-row-two">
        <AuthField label="Nombre" :error="errors.firstName">
          <AuthInput
            v-model="firstName"
            v-bind="firstNameAttrs"
            :error="!!errors.firstName"
            :valid="touched.firstName && !errors.firstName"
            autocomplete="given-name"
            @blur="touched.firstName = true"
          />
        </AuthField>
        <AuthField label="Apellido" :error="errors.lastName">
          <AuthInput
            v-model="lastName"
            v-bind="lastNameAttrs"
            :error="!!errors.lastName"
            :valid="touched.lastName && !errors.lastName"
            autocomplete="family-name"
            @blur="touched.lastName = true"
          />
        </AuthField>
      </div>

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

      <div class="auth-row-two">
        <AuthField label="Tipo de documento" :error="errors.documentType">
          <AuthSelect
            v-model="documentType"
            v-bind="documentTypeAttrs"
            :options="DOCUMENT_TYPE_OPTIONS"
            :error="!!errors.documentType"
          />
        </AuthField>
        <AuthField label="Número de documento" :error="errors.documentNumber">
          <AuthInput
            v-model="documentNumber"
            v-bind="documentNumberAttrs"
            inputmode="text"
            :error="!!errors.documentNumber"
            :valid="touched.documentNumber && !errors.documentNumber"
            autocomplete="off"
            placeholder="12345678"
            @blur="touched.documentNumber = true"
          />
        </AuthField>
      </div>

      <div class="auth-row-two">
        <AuthField label="Prefijo" class="auth-field--narrow" :error="errors.phonePrefix">
          <AuthSelect
            v-model="phonePrefix"
            v-bind="phonePrefixAttrs"
            :options="PHONE_PREFIX_OPTIONS"
            :error="!!errors.phonePrefix"
          />
        </AuthField>
        <AuthField label="Celular" :error="errors.phone">
          <AuthInput
            v-model="phone"
            v-bind="phoneAttrs"
            type="tel"
            :error="!!errors.phone"
            :valid="touched.phone && !errors.phone"
            autocomplete="tel-national"
            placeholder="987 654 321"
            @blur="touched.phone = true"
          />
        </AuthField>
      </div>

      <AuthField
        label="Contraseña"
        :error="errors.password"
        :hint="!touched.password ? 'Mínimo 8 caracteres' : ''"
      >
        <AuthInput
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          :error="!!errors.password"
          :valid="touched.password && !errors.password"
          autocomplete="new-password"
          placeholder="••••••••"
          @blur="touched.password = true"
        />
      </AuthField>

      <AuthField label="Confirmar contraseña" :error="errors.confirmPassword">
        <AuthInput
          v-model="confirmPassword"
          v-bind="confirmPasswordAttrs"
          type="password"
          :error="!!errors.confirmPassword"
          :valid="touched.confirmPassword && !errors.confirmPassword"
          autocomplete="new-password"
          placeholder="••••••••"
          @blur="touched.confirmPassword = true"
        />
      </AuthField>

      <AuthAlert :message="authStore.registerError" />

      <SubmitButton
        :loading="authStore.registerLoading"
        label="Crear cuenta"
        loading-label="Creando cuenta..."
      />
    </form>

    <p class="auth-alt">
      Al registrarte aceptas nuestros
      <a href="#" class="auth-link">Términos de uso</a>
    </p>
  </AuthCard>
</template>
