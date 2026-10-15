import { describe, expect, it } from 'vitest'
import { HEIGHT, STEPS, TILE, smoothPath, wave, wavePoints, waveY, type WaveSpec } from '@/lib/wave'

const SPECS: WaveSpec[] = [
  { base: 150, amp: 36, cycles: 1, phase: 0.4 },
  { base: 196, amp: 30, cycles: 2, phase: 1.6 },
  { base: 246, amp: 24, cycles: 2, phase: 2.9 },
]

describe('wave geometry (background)', () => {
  it('repeats exactly every TILE, which is what makes the sliding loop seamless', () => {
    for (const spec of SPECS) {
      for (let x = -TILE; x <= TILE * 2; x += 37) {
        expect(waveY(spec, x + TILE)).toBeCloseTo(waveY(spec, x), 9)
      }
    }
  })

  it('the second tile is a copy of the first, point for point', () => {
    for (const spec of SPECS) {
      const pts = wavePoints(spec)
      for (let i = 2; i < 2 + STEPS; i++) {
        expect(pts[i + STEPS][0] - pts[i][0]).toBeCloseTo(TILE, 6)
        expect(pts[i + STEPS][1]).toBeCloseTo(pts[i][1], 9)
      }
    }
  })

  it('stays inside the drawing so the crest is never clipped', () => {
    for (const { base, amp } of SPECS) {
      const maxSwing = amp * 1.35
      expect(base - maxSwing).toBeGreaterThan(0)
      expect(base + maxSwing).toBeLessThan(HEIGHT)
    }
  })

  it('produces valid, compact paths (no NaN, closed fill, line left open)', () => {
    for (const spec of SPECS) {
      const { line, fill } = wave(spec)
      expect(line).not.toMatch(/NaN|undefined|Infinity/)
      expect(line.startsWith('M')).toBe(true)
      expect(line.endsWith('Z')).toBe(false)
      expect(fill.endsWith('Z')).toBe(true)
      expect(fill).toContain(`L-40 ${HEIGHT}`)
      expect(fill.length).toBeLessThan(4000) // three of these are inlined into every page
    }
  })

  it('smoothPath needs at least two points and starts at the first one', () => {
    expect(smoothPath([[0, 5], [10, 7]]).startsWith('M0 5C')).toBe(true)
  })
})
