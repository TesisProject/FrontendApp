import { describe, expect, it } from 'vitest'
import { resolveReturnUrl } from './return-url'

describe('resolveReturnUrl', () => {
  it('respeta la pantalla del conductor que se pidió, con su query', () => {
    expect(resolveReturnUrl('/dashboard/zones/7')).toBe('/dashboard/zones/7')
    expect(resolveReturnUrl('/dashboard/favorites?tab=1')).toBe('/dashboard/favorites?tab=1')
    expect(resolveReturnUrl(['/dashboard/faq'])).toBe('/dashboard/faq')
  })

  it('vuelve a /dashboard sin returnUrl', () => {
    expect(resolveReturnUrl(undefined)).toBe('/dashboard')
    expect(resolveReturnUrl('')).toBe('/dashboard')
    expect(resolveReturnUrl(null)).toBe('/dashboard')
  })

  it('no redirige fuera de la app ni a otras áreas', () => {
    expect(resolveReturnUrl('https://evil.com/dashboard')).toBe('/dashboard')
    expect(resolveReturnUrl('//evil.com/dashboard')).toBe('/dashboard')
    expect(resolveReturnUrl('/\\evil.com')).toBe('/dashboard')
    expect(resolveReturnUrl('/admin/users')).toBe('/dashboard')
    expect(resolveReturnUrl('/dashboardx')).toBe('/dashboard')
  })
})
