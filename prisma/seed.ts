import { PrismaClient, Availability, EmploymentType, MediaType, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TEST_DOMAIN = '@salonin.test'

// ─── Data definitions ─────────────────────────────────────────────────────────

interface WorkerSeed {
  email: string
  name: string
  bio: string
  specialties: string[]
  experienceYears: number
  availability: Availability
  radiusMiles: number
  rateRange: string
  rateNote: string
  photoUrl: string
  cityId: string
  lat: number
  lng: number
  portfolio: Array<{ url: string; caption: string }>
}

interface SalonSeed {
  email: string
  name: string
  description: string
  specialties: string[]
  photoUrls: string[]
  cityId: string
  lat: number
  lng: number
  isHiring: boolean
  jobs: JobPostSeed[]
}

interface JobPostSeed {
  title: string
  description: string
  specialty: string
  payStructure: string
  type: EmploymentType
  isUrgent: boolean
  daysUntilExpiry: number
}

// ─── Workers ──────────────────────────────────────────────────────────────────

const WORKERS: WorkerSeed[] = [
  {
    email: `jasmine${TEST_DOMAIN}`,
    name: 'Jasmine Laurent',
    bio: 'Expert hair braider with 6 years of experience. Known for clean parts and long-lasting styles. Available for salon work and mobile appointments.',
    specialties: ['Knotless braids', 'Box braids', 'Feed-in braids', 'Cornrows', 'Locs'],
    experienceYears: 6,
    availability: Availability.NOW,
    radiusMiles: 15,
    rateRange: '$80 – $200',
    rateNote: 'Rate varies by style and length',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',
    cityId: 'dmv',
    lat: 38.8951,
    lng: -77.0364,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', caption: 'Knotless braids — small size' },
      { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80', caption: 'Box braids — medium' },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', caption: 'Goddess locs' },
      { url: 'https://images.unsplash.com/photo-1560714584-058be0be0ef5?w=400&q=80', caption: 'Passion twist' },
      { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&q=80', caption: 'Cornrows' },
    ],
  },
  {
    email: `maya${TEST_DOMAIN}`,
    name: 'Maya Kim',
    bio: 'Nail tech with 4 years experience. Specializing in gel, acrylic, and nail art designs.',
    specialties: ['Gel nails', 'Acrylic nails', 'Nail art', 'Dip powder', 'Pedicure'],
    experienceYears: 4,
    availability: Availability.TODAY,
    radiusMiles: 10,
    rateRange: '$60 – $120',
    rateNote: 'Rate varies by design',
    photoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9907,
    lng: -77.0261,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', caption: 'Gel nail set — nude ombre' },
      { url: 'https://images.unsplash.com/photo-1604654894747-55e4e1d95f20?w=400&q=80', caption: 'Acrylic nails — almond' },
      { url: 'https://images.unsplash.com/photo-1604654894985-75d47d66aca3?w=400&q=80', caption: 'Nail art — floral' },
    ],
  },
  {
    email: `amara${TEST_DOMAIN}`,
    name: 'Amara Diallo',
    bio: 'Certified lash technician. Master of classic, hybrid, and volume sets.',
    specialties: ['Classic lashes', 'Volume lashes', 'Hybrid lashes', 'Lash lift'],
    experienceYears: 3,
    availability: Availability.NOW,
    radiusMiles: 20,
    rateRange: '$70 – $150',
    rateNote: 'Classic from $70, Volume from $120',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9897,
    lng: -77.1014,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1588497859490-85d1c17db96d?w=400&q=80', caption: 'Classic lash set — natural look' },
      { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80', caption: 'Volume lashes — dramatic' },
    ],
  },
  {
    email: `priya${TEST_DOMAIN}`,
    name: 'Priya Sharma',
    bio: 'Award-winning makeup artist. Specializing in bridal and editorial looks.',
    specialties: ['Bridal makeup', 'Editorial makeup', 'Airbrush makeup', 'Glam makeup'],
    experienceYears: 5,
    availability: Availability.WEEKEND,
    radiusMiles: 25,
    rateRange: '$150 – $400',
    rateNote: 'Bridal packages available',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=400&q=80', caption: 'Bridal makeup — natural glam' },
      { url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&q=80', caption: 'Editorial — bold eye' },
    ],
  },
  {
    email: `jordan${TEST_DOMAIN}`,
    name: 'Jordan Miles',
    bio: 'Master barber with 8 years experience. Clean fades, crisp lineups.',
    specialties: ['Fades', 'Lineups', 'Beard trim', 'Beard design', 'Kids cuts'],
    experienceYears: 8,
    availability: Availability.NOW,
    radiusMiles: 15,
    rateRange: '$40 – $80',
    rateNote: 'Beard work $20 extra',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80', caption: 'Skin fade — taper' },
      { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899b?w=400&q=80', caption: 'Lineup — crisp edges' },
    ],
  },
]

// ─── Salons ───────────────────────────────────────────────────────────────────

const SALONS: SalonSeed[] = [
  {
    email: `glamstudio${TEST_DOMAIN}`,
    name: 'Glam Studio DC',
    description: 'Premier natural hair salon in the DMV. Specializing in protective styles, locs, and natural hair care.',
    specialties: ['Knotless braids', 'Box braids', 'Locs', 'Natural hair'],
    photoUrls: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
      'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    jobs: [
      {
        title: 'Experienced Braider Needed ASAP',
        description: 'Looking for skilled braider. Flexible schedule, booth rental or commission.',
        specialty: 'Knotless braids',
        payStructure: '60/40 + tips',
        type: EmploymentType.TEMPORARY,
        isUrgent: true,
        daysUntilExpiry: 5,
      },
      {
        title: 'Full-time Locs Specialist',
        description: 'Join our growing team. Clientele provided.',
        specialty: 'Locs',
        payStructure: '$800/week + tips',
        type: EmploymentType.FULL_TIME,
        isUrgent: false,
        daysUntilExpiry: 30,
      },
    ],
  },
  {
    email: `luxebar${TEST_DOMAIN}`,
    name: 'Luxe Beauty Bar',
    description: 'Upscale beauty bar in Silver Spring. Nails, lashes, and more.',
    specialties: ['Gel nails', 'Acrylic nails', 'Classic lashes', 'Volume lashes'],
    photoUrls: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'dmv',
    lat: 38.9907,
    lng: -77.0261,
    jobs: [
      {
        title: 'Nail Tech Wanted — Gel Specialist',
        description: 'Full-time position with benefits. Busy clientele.',
        specialty: 'Gel nails',
        payStructure: '$18–22/hr',
        type: EmploymentType.FULL_TIME,
        isUrgent: false,
        daysUntilExpiry: 14,
      },
    ],
  },
  {
    email: `cutshop${TEST_DOMAIN}`,
    name: 'The Cut Shop',
    description: 'Premier barbershop in DC. Clean fades, crisp lineups.',
    specialties: ['Fades', 'Lineups', 'Beard trim', 'Kids cuts'],
    photoUrls: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    jobs: [
      {
        title: 'Barber Needed ASAP',
        description: '$600/week guaranteed. Busy shop. Immediate start.',
        specialty: 'Fades',
        payStructure: '$600/week guaranteed',
        type: EmploymentType.FULL_TIME,
        isUrgent: true,
        daysUntilExpiry: 3,
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12)
  console.log('🌱 Starting Salonin seed...\n')

  // ── Clean old seed data ──────────────────────────────────────────────────

  console.log('── Cleaning old seed data ───────────────────────')
  await prisma.chatRequest.deleteMany({
    where: { OR: [
      { sender: { email: { endsWith: TEST_DOMAIN } } },
      { receiver: { email: { endsWith: TEST_DOMAIN } } },
    ]},
  })
  await prisma.message.deleteMany({
    where: { sender: { email: { endsWith: TEST_DOMAIN } } },
  })
  await prisma.jobApplication.deleteMany({
    where: { job: { salon: { user: { email: { endsWith: TEST_DOMAIN } } } } },
  })
  await prisma.jobPost.deleteMany({
    where: { salon: { user: { email: { endsWith: TEST_DOMAIN } } } },
  })
  await prisma.portfolioItem.deleteMany({
    where: { worker: { user: { email: { endsWith: TEST_DOMAIN } } } },
  })
  // Gather test user IDs for cleaning related tables
  const testUserIds = (
    await prisma.user.findMany({ where: { email: { endsWith: TEST_DOMAIN } }, select: { id: true } })
  ).map((u) => u.id)
  if (testUserIds.length > 0) {
    await prisma.report.deleteMany({
      where: { OR: [{ reporterId: { in: testUserIds } }, { reportedId: { in: testUserIds } }] },
    })
    await prisma.userDevice.deleteMany({ where: { userId: { in: testUserIds } } })
    await prisma.passwordReset.deleteMany({ where: { userId: { in: testUserIds } } })
    await prisma.conversationParticipant.deleteMany({ where: { userId: { in: testUserIds } } })
  }
  await prisma.workerProfile.deleteMany({
    where: { user: { email: { endsWith: TEST_DOMAIN } } },
  })
  await prisma.salonProfile.deleteMany({
    where: { user: { email: { endsWith: TEST_DOMAIN } } },
  })
  await prisma.user.deleteMany({
    where: { email: { endsWith: TEST_DOMAIN } },
  })
  console.log('  ✓ Old seed data cleaned.\n')

  // Track IDs for cross-linking
  let portfolioCount = 0
  let jobPostCount = 0

  // ── Workers ────────────────────────────────────────────────────────────────

  console.log('── Workers ──────────────────────────────────────')
  for (const w of WORKERS) {
    const user = await prisma.user.upsert({
      where: { email: w.email },
      update: { passwordHash, isActive: true },
      create: { email: w.email, passwordHash, role: Role.WORKER },
    })

    const profile = await prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: {
        name: w.name,
        bio: w.bio,
        photoUrl: w.photoUrl,
        specialties: w.specialties,
        experienceYears: w.experienceYears,
        availability: w.availability,
        radiusMiles: w.radiusMiles,
        rateRange: w.rateRange,
        rateNote: w.rateNote,
        cityId: w.cityId,
      },
      create: {
        userId: user.id,
        name: w.name,
        bio: w.bio,
        photoUrl: w.photoUrl,
        specialties: w.specialties,
        experienceYears: w.experienceYears,
        availability: w.availability,
        radiusMiles: w.radiusMiles,
        rateRange: w.rateRange,
        rateNote: w.rateNote,
        cityId: w.cityId,
        employmentTypes: [],
        languages: [],
      },
    })

    await prisma.$executeRaw`
      UPDATE "WorkerProfile"
      SET location = ST_SetSRID(ST_MakePoint(${w.lng}, ${w.lat}), 4326)::geography
      WHERE id = ${profile.id}
    `

    const [wLoc] = await prisma.$queryRaw<Array<{ has_location: boolean }>>`
      SELECT (location IS NOT NULL) AS has_location FROM "WorkerProfile" WHERE id = ${profile.id}
    `
    if (!wLoc?.has_location) console.warn(`  ⚠️  location IS NULL for ${w.name} — check PostGIS extension`)

    await prisma.portfolioItem.createMany({
      data: w.portfolio.map((p) => ({
        workerId: profile.id,
        mediaUrl: p.url,
        type: MediaType.IMAGE,
        caption: p.caption,
      })),
    })
    portfolioCount += w.portfolio.length

    console.log(`  ✓ ${w.name} (${w.availability}) — ${w.cityId.toUpperCase()} — ${w.rateRange}`)
  }

  // ── Salons + Job Posts ─────────────────────────────────────────────────────

  console.log('\n── Salons ───────────────────────────────────────')
  for (const s of SALONS) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash, isActive: true },
      create: { email: s.email, passwordHash, role: Role.SALON },
    })

    const profile = await prisma.salonProfile.upsert({
      where: { userId: user.id },
      update: {
        name: s.name,
        description: s.description,
        specialties: s.specialties,
        photoUrls: s.photoUrls,
        cityId: s.cityId,
        isHiring: s.isHiring,
      },
      create: {
        userId: user.id,
        name: s.name,
        description: s.description,
        specialties: s.specialties,
        photoUrls: s.photoUrls,
        cityId: s.cityId,
        isHiring: s.isHiring,
      },
    })

    await prisma.$executeRaw`
      UPDATE "SalonProfile"
      SET location = ST_SetSRID(ST_MakePoint(${s.lng}, ${s.lat}), 4326)::geography
      WHERE id = ${profile.id}
    `

    const [sLoc] = await prisma.$queryRaw<Array<{ has_location: boolean }>>`
      SELECT (location IS NOT NULL) AS has_location FROM "SalonProfile" WHERE id = ${profile.id}
    `
    if (!sLoc?.has_location) console.warn(`  ⚠️  location IS NULL for ${s.name} — check PostGIS extension`)

    // Create job posts for this salon
    for (const jp of s.jobs) {
      await prisma.jobPost.create({
        data: {
          salonId: profile.id,
          title: jp.title,
          description: jp.description,
          specialty: jp.specialty,
          payStructure: jp.payStructure,
          type: jp.type,
          isUrgent: jp.isUrgent,
          cityId: s.cityId,
          expiresAt: daysFromNow(jp.daysUntilExpiry),
          isActive: true,
        },
      })
      jobPostCount++
      console.log(`    ✓ "${jp.title}" ${jp.isUrgent ? '[URGENT]' : ''}`)
    }

    console.log(`  ✓ ${s.name} — ${s.cityId.toUpperCase()} — ${s.jobs.length} jobs — location: ${sLoc?.has_location ? '✅' : '❌ NULL'}`)
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const [totalUsers, totalWorkers, totalSalons, totalPortfolio, totalJobs] =
    await Promise.all([
      prisma.user.count(),
      prisma.workerProfile.count(),
      prisma.salonProfile.count(),
      prisma.portfolioItem.count(),
      prisma.jobPost.count({ where: { isActive: true } }),
    ])

  console.log('\n── Seed complete ────────────────────────────────')
  console.log(`  Users (total in DB)   : ${totalUsers}`)
  console.log(`  Worker profiles       : ${totalWorkers}`)
  console.log(`  Salon profiles        : ${totalSalons}`)
  console.log(`  Portfolio items       : ${totalPortfolio} (+${portfolioCount} this run)`)
  console.log(`  Active job posts      : ${totalJobs} (+${jobPostCount} this run)`)
  console.log('─────────────────────────────────────────────────')
  console.log('\n  Test password for all accounts: Password123!')
  console.log(`  Test domain: ${TEST_DOMAIN}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
