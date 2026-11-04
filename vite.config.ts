import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/**
 * PWA mínima (HU-32): emite `sw.js` con la lista de archivos del build para precachear el app shell
 * (y con él la Ayuda, que es contenido estático del bundle). Ver `pwa/service-worker.js`. Se hace a
 * mano porque `vite-plugin-pwa` no se pudo instalar con la política de antigüedad de pnpm.
 */
function parkvisionPwa(): Plugin {
  return {
    name: 'parkvision-pwa',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter(name => /\.(js|css|html|svg|png|webmanifest|woff2?)$/.test(name) && name !== 'sw.js')
        .map(name => `/${name}`)
      const publicFiles = ['/favicon.svg', '/icons.svg', '/manifest.webmanifest']
      const precache = [...new Set(['/', '/index.html', ...files, ...publicFiles])].sort()
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 12)
      const template = readFileSync(fileURLToPath(new URL('./pwa/service-worker.js', import.meta.url)), 'utf-8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__VERSION__', version)
          .replace('__PRECACHE__', JSON.stringify(precache)),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), parkvisionPwa()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
