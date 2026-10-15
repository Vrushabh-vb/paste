// End-to-end check against a RUNNING server and the real R2 bucket:
//   npm run build && npx next start -p 3100   (in another terminal)
//   BASE_URL=http://localhost:3100 npm run e2e
//
// Only creates data (short TTL, so the cleanup cron removes it). Never deletes anything.
const BASE = (process.env.BASE_URL || 'http://localhost:3100').replace(/\/$/, '')
const TTL = 300

let pass = 0
let fail = 0
function check(name, ok, detail = '') {
  ok ? pass++ : fail++
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${!ok && detail ? `\n         ${detail}` : ''}`)
}
const j = async res => ({ status: res.status, body: await res.json().catch(() => ({})), headers: res.headers })
const api = (path, init) => fetch(BASE + path, init).then(j)
const post = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const put = (path, body) => api(path, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function uploadFiles(files) {
  const signed = await post('/api/upload', { files: files.map(f => ({ name: f.name, type: f.type, size: f.data.length })) })
  if (signed.status !== 200) return { signed }
  const puts = []
  for (let i = 0; i < files.length; i++) {
    const r = await fetch(signed.body.files[i].uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': signed.body.files[i].contentType },
      body: files[i].data,
    })
    puts.push(r.status)
  }
  const made = await post('/api/share', {
    kind: 'files',
    uploadId: signed.body.uploadId,
    ttl: TTL,
    files: files.map((f, i) => ({ key: signed.body.files[i].key, name: f.name })),
  })
  return { signed, puts, made }
}

async function main() {
  console.log(`E2E against ${BASE}\n`)

  console.log('Text shares')
  const t = await post('/api/share', { kind: 'text', text: 'e2e hello ✓ 日本語', ttl: TTL, allowEditing: true })
  check('create text share', t.status === 200 && /^\d{6}$/.test(t.body.code) && /^[a-z2-9]{12}$/.test(t.body.id), JSON.stringify(t))
  const byCode = await api(`/api/share/${t.body.code}`)
  const byId = await api(`/api/share/${t.body.id}`)
  check('read by 6-digit code', byCode.status === 200 && byCode.body.text === 'e2e hello ✓ 日本語', JSON.stringify(byCode))
  check('read by link id (same content)', byId.status === 200 && byId.body.id === t.body.id)
  const edited = await put(`/api/share/${t.body.id}`, { text: 'edited ✓' })
  const afterEdit = await api(`/api/share/${t.body.code}`)
  check('edit is visible to the code lookup too', edited.status === 200 && afterEdit.body.text === 'edited ✓')
  check('edit never extends expiry', afterEdit.body.expiresAt === t.body.expiresAt)
  const ro = await post('/api/share', { kind: 'text', text: 'locked', ttl: TTL })
  const denied = await put(`/api/share/${ro.body.id}`, { text: 'hacked' })
  check('read-only share rejects edits (403)', denied.status === 403)
  check('malformed refs are 404', (await Promise.all(['12345', '1234567', 'not-an-id', '..%2f..%2fetc'].map(r => api(`/api/share/${r}`)))).every(r => r.status === 404))
  // a random unused 6-digit code (900k space, so a collision on all 3 tries is practically impossible)
  const misses = []
  for (let i = 0; i < 3; i++) misses.push((await api(`/api/share/${100000 + Math.floor(Math.random() * 900000)}`)).status)
  check('unused 6-digit codes are 404', misses.includes(404), misses.join(','))
  check('old unauthenticated /api/code endpoint is gone', (await api('/api/code/1234')).status === 404)
  const ttlCap = await post('/api/share', { kind: 'text', text: 'cap', ttl: 999 * 86400 })
  check('text TTL is capped at 7 days', ttlCap.body.expiresAt - ttlCap.body.createdAt === 7 * 86400 * 1000)

  console.log('\nFile shares (direct-to-R2 upload)')
  const six = Buffer.alloc(6 * 1024 * 1024, 7) // bigger than Vercel's 4.5MB body limit: proves the bytes bypass the function
  const up = await uploadFiles([
    { name: 'pixel.png', type: 'image/png', data: PNG },
    { name: 'big archive..final.zip', type: 'application/zip', data: six },
    { name: 'page.html', type: 'text/html', data: Buffer.from('<script>alert(1)</script>') },
  ])
  check('presign works', up.signed.status === 200, JSON.stringify(up.signed))
  check('all 3 PUTs to R2 succeeded (incl. 6MB)', up.puts?.every(s => s === 200), JSON.stringify(up.puts))
  check('finalize succeeded', up.made?.status === 200, JSON.stringify(up.made))
  const share = await api(`/api/share/${up.made.body.code}`)
  check('share lists 3 files with previews flagged', share.body.files?.length === 3 && share.body.files[0].preview === 'image' && share.body.files[1].preview === null)
  check('sizes come from R2, not the client', share.body.files?.[1].size === six.length, JSON.stringify(share.body.files))
  check('no storage keys leak to the browser', !JSON.stringify(share.body).includes('f/'))
  check('file share expiry capped at 24h', up.made.body.expiresAt - up.made.body.createdAt <= 86400_000)

  const follow = async (path, headers = {}) => {
    const r = await fetch(BASE + path, { redirect: 'manual', headers })
    const loc = r.headers.get('location')
    if (r.status !== 302 || !loc) return { first: r.status }
    const final = await fetch(loc, { headers })
    return { first: r.status, final, loc }
  }
  const img = await follow(`/api/file/${up.made.body.id}/0`)
  check('image: 302 -> R2 serves it inline as image/png', img.first === 302 && img.final.status === 200 && /^inline/.test(img.final.headers.get('content-disposition') || '') && img.final.headers.get('content-type') === 'image/png', `${img.first} ${img.final?.status} ${img.final?.headers.get('content-disposition')} ${img.final?.headers.get('content-type')}`)
  check('image: bytes identical', Buffer.from(await img.final.arrayBuffer()).equals(PNG))
  const zip = await follow(`/api/file/${up.made.body.id}/1?dl=1`)
  const zipBuf = Buffer.from(await zip.final.arrayBuffer())
  check('zip: forced attachment with the original filename', /^attachment/.test(zip.final.headers.get('content-disposition') || '') && /big archive/.test(decodeURIComponent(zip.final.headers.get('content-disposition'))), zip.final.headers.get('content-disposition'))
  check('zip: 6MB downloaded intact', zipBuf.length === six.length && zipBuf.equals(six))
  const html = await follow(`/api/file/${up.made.body.id}/2`)
  check('html upload can never render: forced attachment + octet-stream', /^attachment/.test(html.final.headers.get('content-disposition') || '') && html.final.headers.get('content-type') === 'application/octet-stream', `${html.final.headers.get('content-disposition')} ${html.final.headers.get('content-type')}`)
  const range = await follow(`/api/file/${up.made.body.id}/1`, { range: 'bytes=0-9' })
  const rangeBody = range.final ? Buffer.from(await range.final.arrayBuffer()) : Buffer.alloc(0)
  check('Range requests work (video seeking): 206 + exactly 10 bytes', range.final?.status === 206 && rangeBody.length === 10, `${range.final?.status} len=${rangeBody.length}`)

  console.log('\nLimits enforced by storage itself')
  const lie = await post('/api/upload', { files: [{ name: 'lie.bin', type: 'application/octet-stream', size: 10 }] })
  const liePut = await fetch(lie.body.files[0].uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: Buffer.alloc(5000) })
  check('declare 10 bytes, send 5000 -> R2 rejects (403)', liePut.status === 403, `${liePut.status}`)
  const ghost = await post('/api/share', { kind: 'files', uploadId: lie.body.uploadId, files: [{ key: lie.body.files[0].key, name: 'lie.bin' }] })
  check('finalizing a file that was never stored fails (400)', ghost.status === 400, JSON.stringify(ghost))
  const foreign = await post('/api/share', { kind: 'files', uploadId: lie.body.uploadId, files: [{ key: up.signed.body.files[0].key, name: 'steal.png' }] })
  check("cannot claim someone else's uploaded file (400)", foreign.status === 400, JSON.stringify(foreign))
  check('file over 100MB refused at presign (413)', (await post('/api/upload', { files: [{ name: 'x', type: 'a/b', size: 101 * 1024 * 1024 }] })).status === 413)
  check('empty file refused (400)', (await post('/api/upload', { files: [{ name: 'x', type: 'a/b', size: 0 }] })).status === 400)

  console.log('\nPages render')
  for (const p of ['/', '/recent', `/view/${t.body.code}`, `/view/${t.body.id}`]) {
    const r = await fetch(BASE + p)
    check(`GET ${p} -> 200`, r.status === 200)
  }
  const home = await fetch(BASE + '/')
  check('security headers present', home.headers.get('referrer-policy') === 'no-referrer' && home.headers.get('x-content-type-options') === 'nosniff')

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch(err => {
  console.error('E2E crashed:', err)
  process.exit(1)
})
