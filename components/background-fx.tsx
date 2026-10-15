import { Spotlight } from "@/components/spotlight"

/**
 * Page-wide animated background. One fixed layer behind everything, shared by every page.
 *
 * Built for cost: only `transform` is animated (so it runs on the GPU compositor, not the main thread),
 * glows are pre-baked radial gradients (no expensive blur filters), there is no WebGL and no JS loop except
 * the optional cursor spotlight. All motion stops under `prefers-reduced-motion`.
 * Colours come from the theme tokens in globals.css, so light and dark both stay on-palette.
 */
export function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="fx-blob fx-blob-1" />
      <div className="fx-blob fx-blob-2" />
      <div className="fx-blob fx-blob-3" />
      <div className="fx-grid-mask">
        <div className="fx-grid" />
      </div>
      <Spotlight />
      <div className="fx-grain" />
    </div>
  )
}
