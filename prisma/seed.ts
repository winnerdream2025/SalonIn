import { PrismaClient, Availability, EmploymentType, MediaType, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Data definitions ─────────────────────────────────────────────────────────

interface WorkerSeed {
  email: string
  name: string
  bio: string
  specialties: string[]
  experienceYears: number
  availability: Availability
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
  cityId: string
  lat: number
  lng: number
  isHiring: boolean
}

interface JobPostSeed {
  salonEmail: string
  title: string
  description: string
  specialty: string
  payStructure: string
  type: EmploymentType
  isUrgent: boolean
  cityId: string
  daysUntilExpiry: number
}

// ─── Workers ──────────────────────────────────────────────────────────────────

const WORKERS: WorkerSeed[] = [
  {
    email: 'jasmine@test.salonin.com',
    name: 'Jasmine Laurent',
    bio: 'Certified master braider with 6 years of experience in knotless braids, box braids, and protective styles. Based in Arlington, VA.',
    specialties: ['Knotless braids', 'Box braids', 'Locs'],
    experienceYears: 6,
    availability: Availability.NOW,
    cityId: 'dmv',
    lat: 38.8951,
    lng: -77.0364,
    portfolio: [
      { url: 'https://picsum.photos/seed/jl1/800/1000', caption: 'Knotless braids — small size' },
      { url: 'https://picsum.photos/seed/jl2/800/1000', caption: 'Box braids — medium size' },
      { url: 'https://picsum.photos/seed/jl3/800/1000', caption: 'Goddess locs' },
      { url: 'https://picsum.photos/seed/jl4/800/1000', caption: 'Passion twist' },
    ],
  },
  {
    email: 'maya@test.salonin.com',
    name: 'Maya Kim',
    bio: 'Nail tech specializing in gel and acrylic nails with intricate nail art. 4 years experience in Silver Spring, MD.',
    specialties: ['Gel nails', 'Acrylic', 'Nail art'],
    experienceYears: 4,
    availability: Availability.TODAY,
    cityId: 'dmv',
    lat: 38.9896,
    lng: -77.0319,
    portfolio: [
      { url: 'https://picsum.photos/seed/mk1/800/800', caption: 'Gel nail set — nude ombre' },
      { url: 'https://picsum.photos/seed/mk2/800/800', caption: 'Acrylic nails — almond shape' },
      { url: 'https://picsum.photos/seed/mk3/800/800', caption: 'Nail art — floral design' },
      { url: 'https://picsum.photos/seed/mk4/800/800', caption: 'French tip gel set' },
    ],
  },
  {
    email: 'amara@test.salonin.com',
    name: 'Amara Diallo',
    bio: 'Certified lash technician offering classic, hybrid, and volume lash extensions in Bethesda, MD.',
    specialties: ['Classic lashes', 'Volume', 'Hybrid'],
    experienceYears: 3,
    availability: Availability.NOW,
    cityId: 'dmv',
    lat: 38.9897,
    lng: -77.1014,
    portfolio: [
      { url: 'https://picsum.photos/seed/ad1/800/600', caption: 'Classic lash set — natural look' },
      { url: 'https://picsum.photos/seed/ad2/800/600', caption: 'Volume lashes — dramatic' },
      { url: 'https://picsum.photos/seed/ad3/800/600', caption: 'Hybrid lash set' },
    ],
  },
  {
    email: 'priya@test.salonin.com',
    name: 'Priya Sharma',
    bio: 'Award-winning makeup artist specializing in bridal and editorial looks. 5 years experience based in Atlanta, GA.',
    specialties: ['Bridal', 'Editorial', 'Airbrush'],
    experienceYears: 5,
    availability: Availability.WEEKEND,
    cityId: 'atlanta',
    lat: 33.749,
    lng: -84.388,
    portfolio: [
      { url: 'https://picsum.photos/seed/ps1/800/1000', caption: 'Bridal makeup — natural glam' },
      { url: 'https://picsum.photos/seed/ps2/800/1000', caption: 'Editorial — bold eye' },
      { url: 'https://picsum.photos/seed/ps3/800/1000', caption: 'Airbrush — flawless coverage' },
      { url: 'https://picsum.photos/seed/ps4/800/1000', caption: 'Red carpet glam' },
      { url: 'https://picsum.photos/seed/ps5/800/1000', caption: 'Soft glam bridal' },
    ],
  },
  {
    email: 'jordan@test.salonin.com',
    name: 'Jordan Miles',
    bio: 'Master barber with 8 years of experience in precision fades, lineups, and beard grooming. Washington DC.',
    specialties: ['Fades', 'Lineups', 'Beard trim'],
    experienceYears: 8,
    availability: Availability.NOW,
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    portfolio: [
      { url: 'https://picsum.photos/seed/jm1/800/1000', caption: 'Skin fade — taper' },
      { url: 'https://picsum.photos/seed/jm2/800/1000', caption: 'Lineup — crisp edges' },
      { url: 'https://picsum.photos/seed/jm3/800/1000', caption: 'Beard sculpt — full beard' },
    ],
  },
]

// ─── Salons ───────────────────────────────────────────────────────────────────

const SALONS: SalonSeed[] = [
  {
    email: 'glamstudio@test.salonin.com',
    name: 'Glam Studio',
    description:
      'Premier natural hair studio in Silver Spring MD. Specializing in protective styles, locs, and natural hair care.',
    specialties: ['Hair braiding', 'Locs', 'Natural hair'],
    cityId: 'dmv',
    lat: 38.9907,
    lng: -77.0261,
    isHiring: true,
  },
  {
    email: 'luxebeautybar@test.salonin.com',
    name: 'Luxe Beauty Bar',
    description:
      'Full-service beauty bar in Rockville MD offering nails, lashes, and makeup. Luxury experience at affordable prices.',
    specialties: ['Nails', 'Lashes', 'Makeup'],
    cityId: 'dmv',
    lat: 39.084,
    lng: -77.1528,
    isHiring: true,
  },
  {
    email: 'thecutshop@test.salonin.com',
    name: 'The Cut Shop',
    description:
      'Premium barbershop in Washington DC known for precision fades and clean lineups.',
    specialties: ['Barbering', 'Fades', 'Beard'],
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    isHiring: true,
  },
]

// ─── Job Posts ────────────────────────────────────────────────────────────────

const JOB_POSTS: JobPostSeed[] = [
  {
    salonEmail: 'glamstudio@test.salonin.com',
    title: 'Experienced braider needed',
    description:
      'Glam Studio is looking for an experienced braider to join our team immediately. Must be proficient in knotless braids and box braids. Flexible hours, great culture.',
    specialty: 'Knotless braids',
    payStructure: '60/40 split',
    type: EmploymentType.TEMPORARY,
    isUrgent: true,
    cityId: 'dmv',
    daysUntilExpiry: 7,
  },
  {
    salonEmail: 'glamstudio@test.salonin.com',
    title: 'Full-time locs specialist',
    description:
      'We are hiring a full-time locs specialist to handle installations, retwists, and maintenance. Guaranteed weekly pay plus tips. Benefits after 90 days.',
    specialty: 'Locs',
    payStructure: '$800/week + tips',
    type: EmploymentType.FULL_TIME,
    isUrgent: false,
    cityId: 'dmv',
    daysUntilExpiry: 30,
  },
  {
    salonEmail: 'luxebeautybar@test.salonin.com',
    title: 'Nail tech wanted — gel specialist',
    description:
      'Luxe Beauty Bar is seeking a skilled nail technician specializing in gel manicures. Full-time position with a loyal client base and competitive hourly rate.',
    specialty: 'Gel nails',
    payStructure: '$18-22/hr',
    type: EmploymentType.FULL_TIME,
    isUrgent: false,
    cityId: 'dmv',
    daysUntilExpiry: 14,
  },
  {
    salonEmail: 'luxebeautybar@test.salonin.com',
    title: 'Weekend lash tech',
    description:
      'Looking for a certified lash technician available on weekends. Must be experienced with classic lash extensions. Revenue split position with high earning potential.',
    specialty: 'Classic lashes',
    payStructure: '50/50 split',
    type: EmploymentType.WEEKEND,
    isUrgent: true,
    cityId: 'dmv',
    daysUntilExpiry: 5,
  },
  {
    salonEmail: 'thecutshop@test.salonin.com',
    title: 'Barber needed ASAP',
    description:
      'The Cut Shop needs an experienced barber immediately. Guaranteed weekly pay with a loyal clientele ready to be assigned. Must know fades, lineups, and beard work.',
    specialty: 'Fades',
    payStructure: '$600/week guaranteed',
    type: EmploymentType.FULL_TIME,
    isUrgent: true,
    cityId: 'dmv',
    daysUntilExpiry: 3,
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

  // Track IDs for cross-linking
  const salonProfileIdByEmail: Record<string, string> = {}
  let portfolioCount = 0

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
        specialties: w.specialties,
        experienceYears: w.experienceYears,
        availability: w.availability,
        cityId: w.cityId,
      },
      create: {
        userId: user.id,
        name: w.name,
        bio: w.bio,
        specialties: w.specialties,
        experienceYears: w.experienceYears,
        availability: w.availability,
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

    const existingPortfolio = await prisma.portfolioItem.count({
      where: { workerId: profile.id },
    })
    if (existingPortfolio === 0) {
      await prisma.portfolioItem.createMany({
        data: w.portfolio.map((p) => ({
          workerId: profile.id,
          mediaUrl: p.url,
          type: MediaType.IMAGE,
          caption: p.caption,
        })),
      })
      portfolioCount += w.portfolio.length
    }

    console.log(`  ✓ ${w.name} (${w.availability}) — ${w.cityId.toUpperCase()}`)
  }

  // ── Salons ─────────────────────────────────────────────────────────────────

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
        cityId: s.cityId,
        isHiring: s.isHiring,
      },
      create: {
        userId: user.id,
        name: s.name,
        description: s.description,
        specialties: s.specialties,
        photoUrls: [],
        cityId: s.cityId,
        isHiring: s.isHiring,
      },
    })

    await prisma.$executeRaw`
      UPDATE "SalonProfile"
      SET location = ST_SetSRID(ST_MakePoint(${s.lng}, ${s.lat}), 4326)::geography
      WHERE id = ${profile.id}
    `

    salonProfileIdByEmail[s.email] = profile.id
    console.log(`  ✓ ${s.name} — ${s.cityId.toUpperCase()}`)
  }

  // ── Job Posts ──────────────────────────────────────────────────────────────

  console.log('\n── Job Posts ────────────────────────────────────')
  for (const jp of JOB_POSTS) {
    const salonId = salonProfileIdByEmail[jp.salonEmail]
    const existing = await prisma.jobPost.findFirst({
      where: { salonId, title: jp.title },
    })
    if (!existing) {
      await prisma.jobPost.create({
        data: {
          salonId,
          title: jp.title,
          description: jp.description,
          specialty: jp.specialty,
          payStructure: jp.payStructure,
          type: jp.type,
          isUrgent: jp.isUrgent,
          cityId: jp.cityId,
          expiresAt: daysFromNow(jp.daysUntilExpiry),
          isActive: true,
        },
      })
      console.log(`  ✓ "${jp.title}" ${jp.isUrgent ? '[URGENT]' : ''}`)
    } else {
      console.log(`  ↩ "${jp.title}" already exists — skipped`)
    }
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
  console.log(`  Portfolio items       : ${totalPortfolio}`)
  console.log(`  Active job posts      : ${totalJobs}`)
  if (portfolioCount > 0) {
    console.log(`\n  Portfolio items added this run: ${portfolioCount}`)
  }
  console.log('─────────────────────────────────────────────────')
  console.log('\n  Test password for all accounts: Password123!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
