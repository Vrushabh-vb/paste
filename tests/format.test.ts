import { describe, expect, it } from 'vitest'
import { formatBytes, formatCode, formatCountdown, formatFileSize, timeAgo, utf8Length } from '@/lib/format'
import { fileKind } from '@/lib/file-kind'

describe('formatFileSize / formatBytes', () => {
  it('uses sensible units and precision', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatFileSize(250 * 1024 * 1024)).toBe('250 MB')
    expect(formatFileSize(3 * 1024 ** 3)).toBe('3.0 GB')
  })
  it('treats 0 as unknown for files but as a real 0 B for text counters', () => {
    expect(formatFileSize(0)).toBe('Unknown size')
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
})

describe('formatCode', () => {
  it('groups 6 digits for readability and leaves other lengths alone', () => {
    expect(formatCode('482913')).toBe('482 913')
    expect(formatCode('1234')).toBe('1234')
  })
})

describe('formatCountdown', () => {
  it('shows mm:ss under an hour, then hours, then days', () => {
    expect(formatCountdown(29 * 60_000 + 58_000)).toBe('29:58')
    expect(formatCountdown(5_000)).toBe('00:05')
    expect(formatCountdown(2 * 3600_000 + 10 * 60_000)).toBe('2h 10m')
    expect(formatCountdown(3 * 86400_000 + 4 * 3600_000)).toBe('3d 4h')
  })
  it('says Expired at or below zero', () => {
    expect(formatCountdown(0)).toBe('Expired')
    expect(formatCountdown(-5000)).toBe('Expired')
  })
})

describe('timeAgo', () => {
  const now = 1_000_000_000_000
  it('is human', () => {
    expect(timeAgo(now - 10_000, now)).toBe('Just now')
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5m ago')
    expect(timeAgo(now - 3 * 3600_000, now)).toBe('3h ago')
    expect(timeAgo(now - 2 * 86400_000, now)).toBe('2d ago')
    expect(timeAgo(now + 5000, now)).toBe('Just now') // clock skew never shows negative time
  })
})

describe('utf8Length', () => {
  it('counts bytes, not characters', () => {
    expect(utf8Length('abc')).toBe(3)
    expect(utf8Length('日本')).toBe(6)
    expect(utf8Length('')).toBe(0)
  })
})

describe('fileKind', () => {
  it('picks an icon class from type or extension', () => {
    expect(fileKind('a.png', 'image/png')).toBe('image')
    expect(fileKind('a.mp4', 'video/mp4')).toBe('video')
    expect(fileKind('a.mp3', 'audio/mpeg')).toBe('audio')
    expect(fileKind('a.zip', 'application/octet-stream')).toBe('archive')
    expect(fileKind('a.pdf', '')).toBe('pdf')
    expect(fileKind('a.xlsx', '')).toBe('sheet')
    expect(fileKind('a.ts', '')).toBe('code')
    expect(fileKind('notes', 'text/plain')).toBe('text')
    expect(fileKind('blob', '')).toBe('other')
  })
})
