// Geometry for the animated background waves (rendered in components/background-fx.tsx).
// Pure functions so the "seamless loop" guarantee can be unit-tested.

export const TILE = 1440 // width of one repeating tile, in SVG units
export const HEIGHT = 400
export const STEPS = 36 // control points per tile

export interface WaveSpec {
  base: number // vertical centre line (smaller = higher on screen)
  amp: number
  cycles: number // whole cycles per tile: MUST be an integer so the tile repeats exactly
  phase: number
}

const round = (n: number) => Math.round(n * 10) / 10

/** Height of the wave at horizontal position x. Periodic in TILE because every frequency is a whole number of cycles per tile. */
export function waveY({ base, amp, cycles, phase }: WaveSpec, x: number): number {
  const t = (2 * Math.PI * x) / TILE
  // A second, faster harmonic (also a whole number of cycles) makes the shape organic instead of a plain sine.
  return base + amp * (Math.sin(cycles * t + phase) + 0.35 * Math.sin((cycles * 2 + 1) * t + phase * 1.7))
}

/** Points across two tiles, overshooting two points each side so the curve has correct tangents at both edges. */
export function wavePoints(spec: WaveSpec): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (let i = -2; i <= STEPS * 2 + 2; i++) {
    const x = (i / STEPS) * TILE
    pts.push([x, waveY(spec, x)])
  }
  return pts
}

/** Catmull-Rom -> cubic Bezier: a smooth curve through the points with few path commands. */
export function smoothPath(pts: Array<[number, number]>): string {
  let d = `M${round(pts[0][0])} ${round(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    d +=
      `C${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(p1[1] + (p2[1] - p0[1]) / 6)} ` +
      `${round(p2[0] - (p3[0] - p1[0]) / 6)} ${round(p2[1] - (p3[1] - p1[1]) / 6)} ` +
      `${round(p2[0])} ${round(p2[1])}`
  }
  return d
}

/** The crest line (open path) and the filled shape closed down to the bottom edge. */
export function wave(spec: WaveSpec) {
  const line = smoothPath(wavePoints(spec))
  return { line, fill: `${line}L${TILE * 2 + 40} ${HEIGHT}L-40 ${HEIGHT}Z` }
}
