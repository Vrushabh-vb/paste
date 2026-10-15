import { describe, expect, it } from 'vitest'
import { MAX_FILE_SIZE, MAX_FILES, MAX_TOTAL_FILES_SIZE } from '@/lib/config'
import { nameClipboardFile, stageFiles, type StagedFile } from '@/lib/stage-files'

// Real Files are tiny here; for size limits we only need name/size/type/lastModified.
const fake = (name: string, size: number, lastModified = 1, type = 'application/octet-stream') =>
  ({ name, size, lastModified, type }) as unknown as File

describe('stageFiles', () => {
  it('accepts normal files and gives each a unique id', () => {
    const { files, errors } = stageFiles([], [fake('a.png', 10, 1, 'image/png'), fake('b.zip', 20)])
    expect(errors).toEqual([])
    expect(files.map(f => f.name)).toEqual(['a.png', 'b.zip'])
    expect(new Set(files.map(f => f.id)).size).toBe(2)
    expect(files[0].type).toBe('image/png')
  })

  it('falls back to octet-stream when the browser gives no type', () => {
    expect(stageFiles([], [fake('mystery.xyz', 5, 1, '')]).files[0].type).toBe('application/octet-stream')
  })

  it('rejects empty files and files over the per-file limit, with readable messages', () => {
    const { files, errors } = stageFiles([], [fake('empty.txt', 0), fake('huge.mkv', MAX_FILE_SIZE + 1), fake('ok.txt', 5)])
    expect(files.map(f => f.name)).toEqual(['ok.txt'])
    expect(errors).toHaveLength(2)
    expect(errors[0]).toMatch(/empty/)
    expect(errors[1]).toMatch(/larger than 100 MB/)
  })

  it('enforces the total size across already-staged and new files', () => {
    const first = stageFiles([], [fake('a', MAX_FILE_SIZE), fake('b', MAX_FILE_SIZE), fake('c', MAX_FILE_SIZE), fake('d', MAX_FILE_SIZE), fake('e', MAX_FILE_SIZE)]).files
    expect(first).toHaveLength(MAX_TOTAL_FILES_SIZE / MAX_FILE_SIZE)
    const { files, errors } = stageFiles(first, [fake('f', 1)])
    expect(files).toHaveLength(first.length)
    expect(errors[0]).toMatch(/over 500 MB/)
  })

  it('stops at the file-count limit with one clear message', () => {
    const incoming = Array.from({ length: MAX_FILES + 3 }, (_, i) => fake(`f${i}`, 1, i))
    const { files, errors } = stageFiles([], incoming)
    expect(files).toHaveLength(MAX_FILES)
    expect(errors).toEqual([`You can share up to ${MAX_FILES} files at once.`])
  })

  it('silently ignores the same file picked twice, but not a different file with the same name', () => {
    const once = stageFiles([], [fake('a.txt', 5, 100)]).files
    expect(stageFiles(once, [fake('a.txt', 5, 100)]).files).toHaveLength(1)
    expect(stageFiles(once, [fake('a.txt', 6, 100)]).files).toHaveLength(2)
    expect(stageFiles(once, [fake('a.txt', 5, 999)]).files).toHaveLength(2)
  })

  it('does not mutate the list it was given', () => {
    const existing: StagedFile[] = []
    stageFiles(existing, [fake('a', 1)])
    expect(existing).toHaveLength(0)
  })
})

describe('nameClipboardFile', () => {
  const when = new Date(2026, 9, 15, 14, 5, 9) // local time: 15 Oct 2026 14:05:09

  it('gives pasted screenshots a unique, readable name', () => {
    const named = nameClipboardFile(new File(['x'], 'image.png', { type: 'image/png' }), when)
    expect(named.name).toBe('screenshot-20261015-140509.png')
    expect(named.type).toBe('image/png')
    expect(named.size).toBe(1)
  })

  it('leaves real filenames alone', () => {
    const real = new File(['x'], 'holiday.png', { type: 'image/png' })
    expect(nameClipboardFile(real, when)).toBe(real)
  })
})
