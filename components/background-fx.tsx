import { Spotlight } from "@/components/spotlight"
import { HEIGHT, TILE, wave, type WaveSpec } from "@/lib/wave"

/**
 * Page-wide animated background: three layered, translucent waves drifting slowly in opposite directions.
 *
 * Built for cost: only `transform` is animated (GPU compositor, no main-thread work), the waves are plain SVG paths
 * generated once on the server, there is no blur filter and no WebGL. The only JS is the optional cursor light.
 * Everything holds still under `prefers-reduced-motion`. Colours come from the theme tokens in globals.css.
 *
 * Seamless loop: each wave uses a whole number of cycles per TILE (see lib/wave.ts), is drawn two tiles wide, and
 * slides left by exactly one tile (translateX -50%), so the end of the loop looks identical to the start.
 */

// Back to front. `reverse` flows the opposite way, so the layers slide past each other.
//
// IMPORTANT: class names are written out in full on purpose. Tailwind only keeps CSS for class names it can find
// literally in the source, so building them like `fx-wave-${id}` would silently drop their styles (the fills render
// black). tests/background-classes.test.ts guards this.
const LAYERS: Array<{ spec: WaveSpec; bob: string; slide: string; fillClass: string; crest: boolean }> = [
  { spec: { base: 150, amp: 36, cycles: 1, phase: 0.4 }, bob: "fx-wave-bob fx-wave-bob-1", slide: "fx-wave fx-wave-1", fillClass: "fx-wave-fill-1", crest: false },
  { spec: { base: 196, amp: 30, cycles: 2, phase: 1.6 }, bob: "fx-wave-bob fx-wave-bob-2", slide: "fx-wave fx-wave-2 fx-wave-reverse", fillClass: "fx-wave-fill-2", crest: true },
  { spec: { base: 246, amp: 24, cycles: 2, phase: 2.9 }, bob: "fx-wave-bob fx-wave-bob-3", slide: "fx-wave fx-wave-3", fillClass: "fx-wave-fill-3", crest: true },
]
const WAVES = LAYERS.map(layer => ({ ...layer, ...wave(layer.spec) }))

export function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="fx-glow" />

      <div className="fx-waves">
        {WAVES.map(w => (
          <div key={w.fillClass} className={w.bob}>
            <svg className={w.slide} viewBox={`0 0 ${TILE * 2} ${HEIGHT}`} preserveAspectRatio="none" focusable="false">
              <path className={w.fillClass} d={w.fill} />
              {w.crest && <path className="fx-wave-crest" d={w.line} vectorEffect="non-scaling-stroke" />}
            </svg>
          </div>
        ))}
      </div>

      <Spotlight />
      <div className="fx-grain" />
    </div>
  )
}
