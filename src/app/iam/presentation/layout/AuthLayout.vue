<script setup lang="ts">
import { RouterView } from 'vue-router'
import AuthFooter from '../components/AuthFooter.vue'
</script>

<template>
  <div class="auth-layout">
    <main class="auth-main">
      <RouterView />
    </main>
    <AuthFooter />
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}
</style>
