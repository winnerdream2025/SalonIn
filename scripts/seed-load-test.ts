#!/usr/bin/env ts-node
/**
 * Load-test seeder — creates realistic test data via the public API.
 * Usage:  API_URL=https://salonin-production.up.railway.app \
 *           npx ts-node --project scripts/tsconfig.json scripts/seed-load-test.ts
 *
 * Rate-limit awareness:
 *   /auth/register   → 3/60 s   (global @Throttle override)
 *   /auth/login      → 5/60 s
 *   all others       → 10/60 s  (global ThrottlerGuard)
 *
 * With 10 workers + 5 salons this finishes in ~8 min.
 * For the full 50+30 set flip WORKERS/SALONS counts (~30 min).
 */

import https from 'https'
import http from 'http'
import { URL } from 'url'

const BASE = (process.env.API_URL ?? 'https://salonin-production.up.railway.app').replace(/\/$/, '')
const PASSWORD = 'LoadTest1234!'
const WORKERS_COUNT = 10
const SALONS_COUNT = 5

// ─── DMV locations ────────────────────────────────────────────────────────────
const LOCATIONS = [
  { city: 'Arlington',    lat: 38.8816, lng: -77.0910 },
  { city: 'Washington',   lat: 38.9072, lng: -77.0369 },
  { city: 'SilverSpring', lat: 38.9907, lng: -77.0261 },
  { city: 'Bethesda',     lat: 38.9807, lng: -77.1007 },
  { city: 'Rockville',    lat: 39.0840, lng: -77.1528 },
  { city: 'Alexandria',   lat: 38.8048, lng: -77.0469 },
  { city: 'FallsChurch',  lat: 38.8823, lng: -77.1711 },
  { city: 'ChevyChase',   lat: 38.9776, lng: -77.0783 },
]

const SPECIALTIES = ['Hair', 'Nails', 'Lashes', 'Makeup', 'Barber']

const WORKER_NAMES = [
  'Jordan Mitchell', 'Taylor Brooks', 'Aaliyah James', 'Marcus Williams',
  'Destiny Carter', 'Isaiah Johnson', 'Jasmine Brown', 'Caleb Davis',
  'Naomi Reed', 'DeShawn Harris', 'Simone Turner', 'Andre Robinson',
  'Keisha Walker', 'Elijah Thompson', 'Tia Williams', 'Malik Jenkins',
  'Brianna Scott', 'Jaylen Adams', 'Amara Lewis', 'Darius Hall',
]

const SALON_NAMES = [
  'Luxe Beauty Studio', 'The Glam Room', 'Elite Hair Lounge',
  'Velvet Touch Salon', 'Crown & Glory', 'Studio Noir Beauty',
  'The Beauty Bar DC', 'Glow Up Beauty Lab', 'Pure Luxe Salon',
  'The Mane Event',
]

const JOB_TITLES = [
  'Licensed Cosmetologist', 'Nail Technician', 'Lash Artist',
  'Makeup Artist', 'Master Barber', 'Hair Colorist',
  'Braiding Specialist', 'Esthetician',
]

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path)
    const payload = body ? JSON.stringify(body) : undefined
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(options, (res) => {
      let raw = ''
      res.on('data', (c: Buffer) => { raw += c.toString() })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) as T })
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw as unknown as T })
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(new Error('Request timeout')) })
    if (payload) req.write(payload)
    req.end()
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─── Rate-limit-aware batch register ─────────────────────────────────────────
// Register is capped at 3/60s; we send 2 at a time with a 25s gap to stay safe.
async function batchRegister(users: Array<{ email: string; password: string; name: string; role: string }>) {
  const results: Array<{ email: string; token: string | null; error?: string }> = []
  const BATCH = 2
  for (let i = 0; i < users.length; i += BATCH) {
    const batch = users.slice(i, i + BATCH)
    for (const u of batch) {
      process.stdout.write(`  register ${u.email} ... `)
      const res = await request<{ accessToken?: string; message?: string }>(
        'POST', '/auth/register',
        { email: u.email, password: u.password, name: u.name, role: u.role },
      )
      if (res.status === 201 || res.status === 200) {
        const token = res.data.accessToken ?? null
        if (token) {
          results.push({ email: u.email, token })
          console.log(`✅ ${res.status}`)
        } else {
          results.push({ email: u.email, token: null, error: 'no token' })
          console.log(`⚠️  registered but no token`)
        }
      } else if (res.status === 409) {
        // already exists → login instead
        console.log(`⚠️  already exists — logging in`)
        const login = await request<{ accessToken?: string }>(
          'POST', '/auth/login', { email: u.email, password: u.password },
        )
        results.push({ email: u.email, token: login.data.accessToken ?? null })
      } else {
        const msg = JSON.stringify(res.data)
        console.log(`❌ ${res.status} ${msg}`)
        results.push({ email: u.email, token: null, error: msg })
      }
      await sleep(500)
    }
    if (i + BATCH < users.length) {
      process.stdout.write(`  ⏳ rate-limit window … `)
      await sleep(22000)
      console.log('ready')
    }
  }
  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔗  Target: ${BASE}`)

  // ── 0. Health check ──
  console.log('\n── Health ──')
  const health = await request<{ status: string; db: string; cache: string }>('GET', '/health')
  if (health.status !== 200) {
    console.error(`❌ Health failed: ${health.status}`)
    process.exit(1)
  }
  console.log(`✅ API healthy — DB:${health.data.db} Cache:${health.data.cache}`)

  const created = { workers: 0, salons: 0, jobs: 0, conversations: 0, messages: 0 }
  const errors  = { workers: 0, salons: 0, jobs: 0, conversations: 0, messages: 0 }

  // ── 1. Register workers ──
  console.log(`\n── Workers (${WORKERS_COUNT}) ──`)
  const workerUsers = Array.from({ length: WORKERS_COUNT }, (_, i) => ({
    email:    `worker-${i + 1}@loadtest.com`,
    password: PASSWORD,
    name:     WORKER_NAMES[i % WORKER_NAMES.length]!,
    role:     'WORKER',
  }))
  const workerResults = await batchRegister(workerUsers)
  const workers = workerResults.filter((r) => r.token !== null)
  created.workers = workers.length
  errors.workers  = workerResults.length - workers.length
  console.log(`  → ${created.workers} workers ready, ${errors.workers} failed`)

  // ── 2. Update worker profiles + location ──
  console.log('\n── Worker profiles + locations ──')
  for (let i = 0; i < workers.length; i++) {
    const w = workers[i]!
    const loc = LOCATIONS[i % LOCATIONS.length]!
    const spec = SPECIALTIES[i % SPECIALTIES.length]!
    // Update profile
    await request('PATCH', '/workers/me',
      { specialties: [spec], experienceYears: (i % 8) + 1, availability: 'NOW', cityId: 'dmv' },
      w.token!,
    )
    // Update location
    await request('POST', '/workers/location', { lat: loc.lat, lng: loc.lng }, w.token!)
    process.stdout.write('.')
    await sleep(700)
  }
  console.log(' done')

  // ── 3. Register salons ──
  console.log(`\n── Salons (${SALONS_COUNT}) ──`)
  const salonUsers = Array.from({ length: SALONS_COUNT }, (_, i) => ({
    email:    `salon-${i + 1}@loadtest.com`,
    password: PASSWORD,
    name:     SALON_NAMES[i % SALON_NAMES.length]!,
    role:     'SALON',
  }))
  const salonResults = await batchRegister(salonUsers)
  const salons = salonResults.filter((r) => r.token !== null)
  created.salons = salons.length
  errors.salons  = salonResults.length - salons.length
  console.log(`  → ${created.salons} salons ready, ${errors.salons} failed`)

  // ── 4. Update salon profiles ──
  console.log('\n── Salon profiles ──')
  for (let i = 0; i < salons.length; i++) {
    const s = salons[i]!
    const loc = LOCATIONS[i % LOCATIONS.length]!
    await request('PATCH', '/salons/me',
      {
        name:        SALON_NAMES[i % SALON_NAMES.length],
        bio:         `Professional beauty studio in the DMV area. Quality services since ${2015 + (i % 8)}.`,
        specialties: [SPECIALTIES[i % SPECIALTIES.length], SPECIALTIES[(i + 1) % SPECIALTIES.length]],
        cityId:      'dmv',
        lat:         loc.lat,
        lng:         loc.lng,
      },
      s.token!,
    )
    process.stdout.write('.')
    await sleep(700)
  }
  console.log(' done')

  // ── 5. Create job posts (2 per salon) ──
  console.log('\n── Job posts ──')
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  for (const s of salons) {
    for (let j = 0; j < 2; j++) {
      const spec = SPECIALTIES[j % SPECIALTIES.length]!
      const title = JOB_TITLES[j % JOB_TITLES.length]!
      const res = await request<{ id?: string }>(
        'POST', '/jobs',
        {
          title,
          description: `We are looking for an experienced ${title} to join our growing team. Flexible hours, competitive pay.`,
          specialty: spec,
          payStructure: `$${40 + j * 10}/hr`,
          type: j % 2 === 0 ? 'FULL_TIME' : 'PART_TIME',
          isUrgent: j === 0,
          cityId: 'dmv',
          expiresAt,
        },
        s.token!,
      )
      if (res.data.id) { created.jobs++; process.stdout.write('.') }
      else { errors.jobs++; process.stdout.write('x') }
      await sleep(700)
    }
  }
  console.log(` done (${created.jobs} jobs)`)

  // ── 6. Create conversations + send messages ──
  console.log('\n── Conversations + messages ──')
  for (let i = 0; i < Math.min(workers.length, salons.length); i++) {
    const worker = workers[i]!
    void worker // used below for reference; full conv seeding via API needs salon.userId
    await sleep(100)
  }

  // Better: use worker tokens to send to salons via jobs/apply flow already seeded
  // For standalone conv creation we need salon userIds — get them via GET /salons/:id
  // which requires salonProfile.id, not user.id. Skip conv creation in seed (tested separately).
  console.log('  ℹ️  Conversations tested in load-test.sh using pre-existing tokens')

  // ── 7. Print summary ──
  console.log('\n════════════════════════════════════')
  console.log('  SEED SUMMARY')
  console.log('════════════════════════════════════')
  console.log(`  ✅ Workers created:       ${created.workers}`)
  console.log(`  ✅ Salons created:        ${created.salons}`)
  console.log(`  ✅ Job posts created:     ${created.jobs}`)
  console.log(`  ❌ Errors — workers:      ${errors.workers}`)
  console.log(`  ❌ Errors — salons:       ${errors.salons}`)
  console.log(`  ❌ Errors — jobs:         ${errors.jobs}`)
  console.log('')
  console.log('  Test credentials (worker-1):')
  console.log(`    email:    worker-1@loadtest.com`)
  console.log(`    password: ${PASSWORD}`)
  console.log('  Test credentials (salon-1):')
  console.log(`    email:    salon-1@loadtest.com`)
  console.log(`    password: ${PASSWORD}`)
  console.log('════════════════════════════════════\n')
}

main().catch((err) => { console.error(err); process.exit(1) })
