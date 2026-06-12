import { createRouter, createWebHistory } from 'vue-router'
import { authGuard }  from '../app/iam/infrastructure/auth.guard'
import { adminGuard } from '../app/iam/infrastructure/admin.guard'

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
      path: '/admin',
      component: () => import('../app/iam/presentation/layout/AuthLayout.vue'),
      children: [
        { path: '', component: () => import('../app/iam/presentation/views/AdminLoginView.vue') },
      ],
    },

    {
      path: '/admin',
      beforeEnter: adminGuard,
      component: () => import('../app/shared/presentation/layout/AdminLayout.vue'),
      children: [
        { path: 'dashboard', component: () => import('../app/admin/presentation/views/AdminDashboardView.vue') },
        { path: 'zones',     component: () => import('../app/admin/presentation/views/AdminZonesView.vue') },
        { path: 'cameras',   component: () => import('../app/admin/presentation/views/AdminCamerasView.vue') },
        { path: 'alerts',    component: () => import('../app/admin/presentation/views/AdminCameraAlertsView.vue') },
        { path: 'users',     component: () => import('../app/admin/presentation/views/AdminUsersView.vue') },
        { path: 'profile',   component: () => import('../app/admin/presentation/views/AdminProfileView.vue') },
      ],
    },

    {
      path: '/dashboard',
      beforeEnter: authGuard,
      component: () => import('../app/shared/presentation/layout/UserLayout.vue'),
      children: [
        { path: '',       component: () => import('../app/shared/presentation/views/UserDashboardView.vue') },
        { path: 'zones',      component: () => import('../app/parking/presentation/views/ZonesView.vue') },
        { path: 'zones/:id',  component: () => import('../app/parking/presentation/views/ZoneDetailView.vue') },
        { path: 'favorites',  component: () => import('../app/favorites/presentation/views/FavoritesView.vue') },
        { path: 'alerts',     component: () => import('../app/notifications/presentation/views/AlertsView.vue') },
        { path: 'profile',    component: () => import('../app/profile/presentation/views/ProfileView.vue') },
        { path: 'faq',         component: () => import('../app/faq/presentation/views/FaqView.vue') },
        { path: 'predictions', component: () => import('../app/predictions/presentation/views/PredictionsView.vue') },
      ],
    },

    { path: '/:pathMatch(.*)*', component: () => import('../app/shared/presentation/views/NotFoundView.vue') },
  ],
})

export default router
