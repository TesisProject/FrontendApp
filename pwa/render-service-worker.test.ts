import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { renderServiceWorker } from './render-service-worker'

const template = readFileSync(fileURLToPath(new URL('./service-worker.js', import.meta.url)), 'utf-8')

describe('renderServiceWorker', () => {
  it('reemplaza los marcadores del código, no solo los del comentario', () => {
    const sw = renderServiceWorker(template, ['/', '/index.html'], 'abc123')

    expect(sw).toContain(`const VERSION = 'abc123'`)
    expect(sw).toContain('const PRECACHE = ["/","/index.html"]')
    expect(sw).not.toContain('__PRECACHE__')
    expect(sw).not.toContain('__VERSION__')
  })

  it('genera un script que se puede evaluar', () => {
    const sw = renderServiceWorker(template, ['/'], 'v1')
    const self = { addEventListener: () => {}, location: { origin: 'http://localhost' } }

    expect(() => new Function('self', 'caches', 'fetch', 'URL', 'Response', sw)(self, {}, () => {}, URL, Response))
      .not.toThrow()
  })
})
