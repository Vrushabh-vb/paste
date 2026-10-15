import { describe, expect, it } from 'vitest'
import { CODE_REGEX, ID_REGEX } from '@/lib/config'
import { cleanDisplayName, contentDisposition, generateCode, generateId, safeKeyName } from '@/lib/server/ids'

describe('generateCode', () => {
  it('always makes a 6-digit code that never starts with 0', () => {
    for (let i = 0; i < 2000; i++) {
      const c = generateCode()
      expect(c).toMatch(CODE_REGEX)
      expect(c[0]).not.toBe('0')
    }
  })
})

describe('generateId', () => {
  it('matches the id format and is unique', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 2000; i++) {
      const id = generateId()
      expect(id).toMatch(ID_REGEX)
      seen.add(id)
    }
    expect(seen.size).toBe(2000)
  })

  it('can never be mistaken for a code', () => {
    for (let i = 0; i < 500; i++) expect(generateId()).not.toMatch(CODE_REGEX)
  })
})

describe('safeKeyName', () => {
  it('removes path traversal and separators', () => {
    const k = safeKeyName('../../etc/passwd')
    expect(k).not.toContain('/')
    expect(k.startsWith('.')).toBe(false)
    expect(k).not.toContain('..')
  })
  it('never produces ".." even for legitimate names with repeated dots', () => {
    for (const n of ['report..final.pdf', 'wow....jpg', '...hidden', 'a...b...c.txt'])
      expect(safeKeyName(n)).not.toContain('..')
    expect(safeKeyName('report..final.pdf')).toBe('report.final.pdf')
  })
  it('keeps the extension and strips unicode/spaces', () => {
    expect(safeKeyName('my holiday photo ✨.JPG')).toMatch(/^[A-Za-z0-9._-]+\.JPG$/)
  })
  it('falls back for empty/garbage names and caps length', () => {
    expect(safeKeyName('')).toBe('file')
    expect(safeKeyName('x'.repeat(500)).length).toBeLessThanOrEqual(80)
  })
})

describe('cleanDisplayName', () => {
  it('strips control chars and path separators but keeps unicode', () => {
    expect(cleanDisplayName('a/b\\c\u0000d\n.txt')).toBe('a_b_c_d_.txt')
    expect(cleanDisplayName('résumé 日本.pdf')).toBe('résumé 日本.pdf')
  })
  it('caps length and never returns empty', () => {
    expect(cleanDisplayName('y'.repeat(999)).length).toBe(200)
    expect(cleanDisplayName('   ')).toBe('file')
  })
})

describe('contentDisposition', () => {
  it('cannot be broken out of with quotes or newlines', () => {
    const v = contentDisposition('attachment', 'evil".txt\r\nSet-Cookie: x=1')
    expect(v).not.toMatch(/[\r\n]/)
    expect(v.split('"').length).toBe(3) // exactly one quoted string
  })
  it('encodes non-ascii names for filename*', () => {
    const v = contentDisposition('attachment', 'résumé.pdf')
    expect(v).toContain("filename*=UTF-8''r%C3%A9sum%C3%A9.pdf")
    expect(v.startsWith('attachment;')).toBe(true)
  })
})
