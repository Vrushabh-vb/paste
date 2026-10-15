import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Tailwind deletes CSS for any class name it cannot find *literally* in the source files. Building a name like
// `fx-wave-fill-${id}` therefore drops its rule and the browser falls back to defaults (the waves rendered solid black).
// This test makes sure every background class defined in globals.css is spelled out in full somewhere in the source.

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(tsx|ts)$/.test(entry.name) ? [full] : []
  })
}

const root = path.resolve(__dirname, '..')
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8')
const source = [...sourceFiles(path.join(root, 'app')), ...sourceFiles(path.join(root, 'components'))]
  .map(f => fs.readFileSync(f, 'utf8'))
  .join('\n')

const fxClasses = [...new Set([...css.matchAll(/\.(fx-[a-z0-9-]+)/g)].map(m => m[1]))].sort()

describe('animated background classes survive Tailwind purging', () => {
  it('finds the background classes in globals.css', () => {
    expect(fxClasses.length).toBeGreaterThanOrEqual(10)
    expect(fxClasses).toContain('fx-wave-fill-1')
    expect(fxClasses).toContain('fx-wave-3')
  })

  it.each(fxClasses)('%s appears as a whole word in the source', cls => {
    const asWord = new RegExp(`(^|[^\\w-])${cls}([^\\w-]|$)`)
    expect(source).toMatch(asWord)
  })

  it('the component does not build fx- class names from template strings', () => {
    const component = fs.readFileSync(path.join(root, 'components/background-fx.tsx'), 'utf8')
    // comments may mention the pattern; real code must not use it
    const code = component.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/fx-[a-z-]*\$\{/)
  })
})
