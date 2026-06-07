import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from '../app/iam/infrastructure/auth.guard'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },

    {
      path: '/',
      component: () => import('../app/iam/presentation/layout/AuthLayout.vue'),
      children: [
        { path: 'login',           component: () => import('../app/iam/presentation/views/LoginView.vue') },
        { path: 'register',        component: () => import('../app/iam/presentation/views/RegisterView.vue') },
        { path: 'forgot-password', component: () => import('../app/iam/presentation/views/ForgotPasswordView.vue') },
        { path: 'otp',             component: () => import('../app/iam/presentation/views/OtpView.vue') },
        { path: 'reset-password',  component: () => import('../app/iam/presentation/views/ResetPasswordView.vue') },
      ],
    },

    {
      path: '/dashboard',
      beforeEnter: authGuard,
      component: () => import('../app/shared/presentation/views/NotFoundView.vue'),
    },

    { path: '/:pathMatch(.*)*', component: () => import('../app/shared/presentation/views/NotFoundView.vue') },
  ],
})

export default router
