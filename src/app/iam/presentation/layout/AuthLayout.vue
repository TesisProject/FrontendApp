<script setup lang="ts">
import { RouterView } from 'vue-router'
import AuthFooter from '../components/AuthFooter.vue'
</script>

<template>
  <div class="auth-layout">
    <div class="bg-orb bg-orb--1" />
    <div class="bg-orb bg-orb--2" />
    <div class="bg-orb bg-orb--3" />
    <main class="auth-main">
      <RouterView />
    </main>
    <AuthFooter />
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #07162a 0%, #0e2445 40%, #1a3460 70%, #0d1e38 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Orbs difuminados */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  will-change: transform;
}

.bg-orb--1 {
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgba(242, 137, 74, 0.35) 0%, transparent 70%);
  top: -120px;
  left: -100px;
}

.bg-orb--2 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%);
  bottom: -150px;
  right: -120px;
}

.bg-orb--3 {
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%);
  top: 50%;
  left: 55%;
  transform: translate(-50%, -50%);
}

.auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  position: relative;
  z-index: 1;
}
</style>
