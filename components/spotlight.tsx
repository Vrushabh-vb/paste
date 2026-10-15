"use client"

import { useEffect, useRef } from "react"

const SIZE = 560

/** A soft light that eases after the cursor. Desktop pointers only, and never when the user asks for reduced motion. */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const media = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)")
    if (!media.matches) return

    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 3
    let x = targetX
    let y = targetY
    let frame = 0
    let running = false

    // Ease towards the cursor, and stop the animation loop entirely once it arrives (no idle CPU).
    const tick = () => {
      x += (targetX - x) * 0.1
      y += (targetY - y) * 0.1
      el.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0)`
      if (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) frame = requestAnimationFrame(tick)
      else running = false
    }
    const onMove = (e: PointerEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      el.style.opacity = "1"
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }
    const onLeave = () => {
      el.style.opacity = "0"
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("mouseleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  return <div ref={ref} className="fx-spotlight" style={{ width: SIZE, height: SIZE }} />
}
