<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterView } from 'vue-router'

const year = new Date().getFullYear()

// ── Signature: a live parking-availability grid that mimics ParkVision's
//    computer-vision feed. Spots flip between states like a real lot. ──
type Status = 'free' | 'moderate' | 'occupied'
const COLS = 8
const ROWS = 6
const TOTAL = COLS * ROWS

function randomStatus(): Status {
  const r = Math.random()
  if (r < 0.52) return 'free'
  if (r < 0.74) return 'moderate'
  return 'occupied'
}

const spots = ref<Status[]>(Array.from({ length: TOTAL }, randomStatus))
const reduceMotion = ref(false)
let flipTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion.value) return
  flipTimer = setInterval(() => {
    const i = Math.floor(Math.random() * TOTAL)
    let next = randomStatus()
    if (next === spots.value[i]) next = randomStatus()
    spots.value[i] = next
  }, 900)
})

onBeforeUnmount(() => clearInterval(flipTimer))
</script>

<template>
  <div class="auth-shell">
    <!-- ───────────── Brand showcase ───────────── -->
    <aside class="showcase">
      <div class="showcase-glow showcase-glow--amber" />
      <div class="showcase-glow showcase-glow--green" />

      <header class="showcase-top">
        <span class="wordmark">
          <span class="wordmark-mark">P</span>
          <span class="wordmark-text">Park<span class="wordmark-acc">Vision</span></span>
        </span>
      </header>

      <div class="showcase-mid">
        <p class="eyebrow">Visión artificial en tiempo real</p>
        <h1 class="thesis">Encuentra estacionamiento<br />antes de llegar.</h1>
        <p class="thesis-sub">
          Cámaras inteligentes leen cada plaza y te muestran dónde aparcar
          en tu ciudad, plaza por plaza.
        </p>

        <!-- live availability grid -->
        <div class="lot" :class="{ live: !reduceMotion }">
          <div class="lot-stage">
            <div class="lot-grid">
              <span
                v-for="(s, i) in spots"
                :key="i"
                class="spot"
                :data-status="s"
              />
            </div>
            <div v-if="!reduceMotion" class="lot-scan" />
          </div>
        </div>

        <div class="legend">
          <span class="legend-item"><i class="dot dot--free" />Libre</span>
          <span class="legend-item"><i class="dot dot--moderate" />Moderado</span>
          <span class="legend-item"><i class="dot dot--occupied" />Ocupado</span>
          <span class="legend-live"><i class="live-dot" />En vivo · cada 30 s</span>
        </div>
      </div>

      <footer class="showcase-foot">
        <span class="foot-copy">© {{ year }} ParkVision</span>
        <nav class="foot-links">
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
        </nav>
      </footer>
    </aside>

    <!-- ───────────── Form panel ───────────── -->
    <main class="form-panel">
      <div class="form-mobile-brand">
        <span class="wordmark wordmark--dark">
          <span class="wordmark-mark">P</span>
          <span class="wordmark-text">Park<span class="wordmark-acc">Vision</span></span>
        </span>
      </div>
      <div class="form-shell">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr);
}

/* ───────── Showcase ───────── */
.showcase {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 38px 48px 30px;
  background:
    radial-gradient(120% 80% at 15% 0%, #103057 0%, transparent 55%),
    linear-gradient(160deg, #0a1e38 0%, #07182e 55%, #060f20 100%);
  color: #fff;
}

.showcase-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
}
.showcase-glow--amber {
  width: 460px; height: 460px;
  background: radial-gradient(circle, rgba(242, 137, 74, 0.32) 0%, transparent 70%);
  top: -160px; left: -120px;
}
.showcase-glow--green {
  width: 420px; height: 420px;
  background: radial-gradient(circle, rgba(22, 177, 120, 0.2) 0%, transparent 70%);
  bottom: -160px; right: -100px;
}

.showcase-top,
.showcase-mid,
.showcase-foot { position: relative; z-index: 1; }

.wordmark { display: inline-flex; align-items: center; gap: 11px; }
.wordmark-mark {
  display: grid;
  place-items: center;
  width: 32px; height: 32px;
  border-radius: 9px;
  background: var(--color-primary);
  color: #fff;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 19px;
  box-shadow: 0 4px 14px rgba(242, 137, 74, 0.4);
}
.wordmark-text {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 19px;
  letter-spacing: -0.01em;
  color: #fff;
}
.wordmark-acc { color: var(--color-primary); }

.showcase-mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 460px;
  padding: 24px 0;
}

.eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #f2a878;
  margin: 0 0 16px;
}

.thesis {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 38px;
  line-height: 1.08;
  letter-spacing: -0.025em;
  margin: 0 0 14px;
}

.thesis-sub {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.62);
  margin: 0 0 34px;
  max-width: 400px;
}

/* live parking grid */
.lot { margin-bottom: 22px; }
.lot-stage {
  position: relative;
  width: 100%;
  max-width: 380px;
  perspective: 900px;
  -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 72%, transparent 100%);
}
.lot-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 7px;
  transform: rotateX(20deg);
  transform-origin: center top;
}
.spot {
  aspect-ratio: 1 / 1.5;
  border-radius: 5px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.6s ease, border-color 0.6s ease, box-shadow 0.6s ease;
}
.spot[data-status='free'] {
  background: rgba(22, 177, 120, 0.18);
  border-color: rgba(22, 177, 120, 0.6);
  box-shadow: inset 0 0 10px rgba(22, 177, 120, 0.25);
}
.spot[data-status='moderate'] {
  background: rgba(242, 137, 74, 0.18);
  border-color: rgba(242, 137, 74, 0.55);
}
.spot[data-status='occupied'] {
  background: rgba(255, 93, 93, 0.16);
  border-color: rgba(255, 93, 93, 0.5);
}

.lot-scan {
  position: absolute;
  left: 0; right: 0; top: 0;
  height: 34%;
  background: linear-gradient(to bottom, transparent, rgba(22, 177, 120, 0.14), transparent);
  animation: lot-scan 3.4s linear infinite;
  pointer-events: none;
}
@keyframes lot-scan {
  0% { transform: translateY(-100%); opacity: 0; }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(320%); opacity: 0; }
}

.legend {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
.legend-item { display: inline-flex; align-items: center; gap: 7px; }
.dot { width: 9px; height: 9px; border-radius: 3px; }
.dot--free { background: #16b178; }
.dot--moderate { background: #f2894a; }
.dot--occupied { background: #ff5d5d; }

.legend-live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}
.live-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #16b178;
  box-shadow: 0 0 0 0 rgba(22, 177, 120, 0.6);
  animation: live-pulse 1.8s ease-out infinite;
}
@keyframes live-pulse {
  0% { box-shadow: 0 0 0 0 rgba(22, 177, 120, 0.55); }
  70% { box-shadow: 0 0 0 7px rgba(22, 177, 120, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 177, 120, 0); }
}

.showcase-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}
.foot-links { display: flex; gap: 20px; }
.foot-links a { color: rgba(255, 255, 255, 0.55); text-decoration: none; }
.foot-links a:hover { color: #fff; }

/* ───────── Form panel ───────── */
.form-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: #fff;
  padding: 40px 40px;
}

.form-mobile-brand { display: none; }

.form-shell {
  width: 100%;
  max-width: 410px;
  margin: auto;
}

.wordmark--dark .wordmark-text { color: #0a1e38; }

/* ───────── Responsive ───────── */
@media (max-width: 980px) {
  .auth-shell { grid-template-columns: 1fr; }
  .showcase { display: none; }
  .form-mobile-brand { display: flex; justify-content: center; padding: 12px 0 8px; }
  .form-panel { padding: 28px 22px 40px; }
}

@media (prefers-reduced-motion: reduce) {
  .live-dot { animation: none; }
}
</style>
