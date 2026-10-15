import { describe, expect, it } from 'vitest'
import { looksLikeCode } from '@/lib/detect-code'

describe('looksLikeCode', () => {
  it.each([
    ['plain sentence', 'Meet me at 5pm outside the station.'],
    ['sentence with a heart', 'I <3 this song, it is great'],
    ['sentence with braces', 'Use {name} as a placeholder in the template please'],
    ['an address list', '12 Baker Street\nLondon\nNW1 6XE'],
    ['a shopping list', 'milk\neggs\nbread\nbutter'],
    ['empty', ''],
    ['whitespace', '   \n  '],
  ])('is NOT code: %s', (_n, text) => expect(looksLikeCode(text)).toBe(false))

  it.each([
    ['javascript', 'import fs from "fs";\nconst x = 1;\nfunction go() {\n  return x;\n}'],
    ['python', 'import os\ndef main():\n    print(os.getcwd())\n\nif __name__ == "__main__":\n    main()'],
    ['css', '.card {\n  color: red;\n}\n.card:hover {\n  color: blue;\n}'],
    ['html', '<div class="a">\n  <p>hi</p>\n</div>'],
    ['sql', 'SELECT id, name\nFROM users\nWHERE active = 1;'],
    ['json object', '{"name": "x", "tags": [1, 2, 3]}'],
    ['json array', '[1, 2, 3]'],
    ['one-line statement', 'const total = items.reduce((a, b) => a + b, 0);'],
    ['shell script', '#!/bin/bash\nset -e\nnpm install && npm run build'],
  ])('is code: %s', (_n, text) => expect(looksLikeCode(text)).toBe(true))

  it('does not call invalid json-looking prose code', () => {
    expect(looksLikeCode('{ just some words in braces }')).toBe(false)
  })
})
