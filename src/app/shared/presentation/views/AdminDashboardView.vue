<script setup lang="ts">
import { useAuthStore } from '../../../iam/application/auth.store'

const authStore = useAuthStore()
</script>

<template>
  <div class="dashboard">
    <h1 class="title">Dashboard</h1>
    <p class="subtitle">Bienvenido, {{ authStore.user?.email }}</p>
  </div>
</template>

<style scoped>
.dashboard {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.06);
}

.title {
  font-size: 22px;
  font-weight: 700;
  color: #092c4c;
  margin: 0 0 8px;
}

.subtitle {
  font-size: 14px;
  color: #888;
  margin: 0;
}
</style>
