import { describe, expect, it } from 'vitest'
import { roundCoordinate } from './geo'

describe('roundCoordinate', () => {
  it('deja 6 decimales, los que acepta el input de coordenadas (step 0.000001)', () => {
    expect(roundCoordinate(-12.1209746)).toBe(-12.120975)
    expect(roundCoordinate(-77.0287172)).toBe(-77.028717)
  })

  it('no altera un valor que ya tiene 6 decimales o menos', () => {
    expect(roundCoordinate(-12.068)).toBe(-12.068)
    expect(roundCoordinate(0)).toBe(0)
  })
})
