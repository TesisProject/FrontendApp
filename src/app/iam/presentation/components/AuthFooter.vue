<script setup lang="ts">
</script>

<template>
  <footer class="auth-footer">
    <span class="brand">ParkVision</span>
    <span class="copyright">© {{ new Date().getFullYear() }} ParkVision. Todos los derechos reservados.</span>
    <div class="links">
      <a href="#">Términos y condiciones</a>
      <a href="#">Bases legales</a>
    </div>
    <div class="socials">
      <a href="#" aria-label="Instagram">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
        </svg>
      </a>
      <a href="#" aria-label="Facebook">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04z"/>
        </svg>
      </a>
    </div>
  </footer>
</template>

<style scoped>
.auth-footer {
  height: 56px;
  background: rgba(7, 22, 42, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  padding: 0 24px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.brand {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 16px;
  color: white;
  margin-right: 16px;
}

.copyright {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  flex: 1;
}

.links {
  display: flex;
  gap: 24px;
  margin-right: 40px;
}

.links a {
  font-size: 13px;
  color: #b3b3b3;
  text-decoration: none;
}

.links a:hover {
  color: white;
}

.socials {
  display: flex;
  gap: 16px;
  align-items: center;
}

.socials a {
  display: flex;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.socials a:hover {
  opacity: 1;
}
</style>
