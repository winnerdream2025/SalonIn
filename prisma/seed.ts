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
    bio: 'Expert braider with 6 years of experience. Known for clean parts, tight knots, and styles that last 6–8 weeks. Available for salon work and mobile appointments.',
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
      { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', caption: 'Knotless braids — small' },
      { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80', caption: 'Box braids — medium' },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', caption: 'Goddess locs' },
      { url: 'https://images.unsplash.com/photo-1560714584-058be0be0ef5?w=400&q=80', caption: 'Passion twist' },
      { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&q=80', caption: 'Cornrows — geometric' },
      { url: 'https://images.unsplash.com/photo-1523264939339-c89f9dadde2e?w=400&q=80', caption: 'Boho knotless' },
    ],
  },
  {
    email: `maya${TEST_DOMAIN}`,
    name: 'Maya Kim',
    bio: 'Licensed nail tech with 4 years experience. Specializing in gel, acrylic, and intricate nail art. Clean. Precise. On-trend.',
    specialties: ['Gel nails', 'Acrylic nails', 'Nail art', 'Dip powder', 'Pedicure'],
    experienceYears: 4,
    availability: Availability.TODAY,
    radiusMiles: 10,
    rateRange: '$60 – $120',
    rateNote: 'Custom nail art quoted separately',
    photoUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9907,
    lng: -77.0261,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', caption: 'Gel set — nude ombre' },
      { url: 'https://images.unsplash.com/photo-1604654894747-55e4e1d95f20?w=400&q=80', caption: 'Acrylic — almond shape' },
      { url: 'https://images.unsplash.com/photo-1604654894985-75d47d66aca3?w=400&q=80', caption: 'Nail art — floral' },
      { url: 'https://images.unsplash.com/photo-1604654894474-2b3b88b21f24?w=400&q=80', caption: 'Chrome powder finish' },
      { url: 'https://images.unsplash.com/photo-1604654894523-2e69e4a35b72?w=400&q=80', caption: 'French tip gel' },
    ],
  },
  {
    email: `amara${TEST_DOMAIN}`,
    name: 'Amara Diallo',
    bio: 'Certified lash technician with 3 years of precision work. Master of classic, hybrid, and mega-volume sets. Results that open the room.',
    specialties: ['Classic lashes', 'Volume lashes', 'Hybrid lashes', 'Lash lift', 'Lash tint'],
    experienceYears: 3,
    availability: Availability.NOW,
    radiusMiles: 20,
    rateRange: '$70 – $180',
    rateNote: 'Classic from $70 · Volume from $120 · Mega from $180',
    photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9897,
    lng: -77.1014,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1588497859490-85d1c17db96d?w=400&q=80', caption: 'Classic set — natural' },
      { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80', caption: 'Volume lashes — glam' },
      { url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=400&q=80', caption: 'Hybrid lashes — wispy' },
      { url: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=400&q=80', caption: 'Lash lift + tint' },
      { url: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&q=80', caption: 'Mega volume — bold' },
    ],
  },
  {
    email: `priya${TEST_DOMAIN}`,
    name: 'Priya Sharma',
    bio: 'Award-winning MUA with 5 years. Specializing in flawless bridal and editorial glam. Airbrush certified. Clients include editorial features and wedding parties.',
    specialties: ['Bridal makeup', 'Editorial makeup', 'Airbrush makeup', 'Glam makeup', 'SFX'],
    experienceYears: 5,
    availability: Availability.WEEKEND,
    radiusMiles: 25,
    rateRange: '$150 – $400',
    rateNote: 'Bridal packages · Trials required',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1457972729786-0411a3b2b626?w=400&q=80', caption: 'Bridal — natural glam' },
      { url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&q=80', caption: 'Editorial — bold eye' },
      { url: 'https://images.unsplash.com/photo-1503236823255-94d32e68b209?w=400&q=80', caption: 'Airbrush — evening glam' },
      { url: 'https://images.unsplash.com/photo-1560706083-b94e4d35ebf8?w=400&q=80', caption: 'Bridal party — 6 looks' },
      { url: 'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=400&q=80', caption: 'Glam — cut crease' },
    ],
  },
  {
    email: `jordan${TEST_DOMAIN}`,
    name: 'Jordan Miles',
    bio: 'Master barber, 8 years in the chair. Known for the cleanest fades in DC. Lineups, tapers, beard sculpting — every detail matters.',
    specialties: ['Skin fade', 'Taper fade', 'Lineups', 'Beard design', 'Kids cuts'],
    experienceYears: 8,
    availability: Availability.NOW,
    radiusMiles: 15,
    rateRange: '$40 – $85',
    rateNote: 'Beard design $20 extra',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80',
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80', caption: 'Skin fade — low taper' },
      { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80', caption: 'Lineup — crisp edges' },
      { url: 'https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400&q=80', caption: 'Mid fade — textured top' },
      { url: 'https://images.unsplash.com/photo-1520338801623-3f9d8f194b0e?w=400&q=80', caption: 'Beard sculpt — full' },
      { url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&q=80', caption: 'High fade — bald' },
      { url: 'https://images.unsplash.com/photo-1634146880856-e0f3b3b5c2a5?w=400&q=80', caption: 'Kids cut — clean' },
    ],
  },
  {
    email: `nia${TEST_DOMAIN}`,
    name: 'Nia Washington',
    bio: 'Natural hair specialist with 7 years. Silk press queen. Cater to natural textures — no damage, all shine.',
    specialties: ['Silk press', 'Natural hair', 'Blowout', 'Twist out', 'Loc maintenance'],
    experienceYears: 7,
    availability: Availability.TODAY,
    radiusMiles: 20,
    rateRange: '$90 – $175',
    rateNote: 'Silk press includes trim',
    photoUrl: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=400&q=80',
    cityId: 'atlanta',
    lat: 33.7490,
    lng: -84.3880,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', caption: 'Silk press — bone straight' },
      { url: 'https://images.unsplash.com/photo-1560714584-058be0be0ef5?w=400&q=80', caption: 'Blowout — big volume' },
      { url: 'https://images.unsplash.com/photo-1523264939339-c89f9dadde2e?w=400&q=80', caption: 'Twist out — defined' },
      { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', caption: 'Loc maintenance — retwist' },
      { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&q=80', caption: 'Protective style — flat twist' },
    ],
  },
  {
    email: `keisha${TEST_DOMAIN}`,
    name: 'Keisha Brown',
    bio: 'Braid and wig specialist with 5 years in Atlanta. Custom wig installs, frontal sews, and quick styles. Walk-in friendly.',
    specialties: ['Wig install', 'Frontal sew-in', 'Knotless braids', 'Quick weave', 'Silk press'],
    experienceYears: 5,
    availability: Availability.NOW,
    radiusMiles: 25,
    rateRange: '$100 – $300',
    rateNote: 'Frontal install from $150',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',
    cityId: 'atlanta',
    lat: 33.7749,
    lng: -84.3963,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&q=80', caption: 'Frontal install — natural wave' },
      { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', caption: 'Knotless — jumbo' },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', caption: 'Wig glue — HD lace' },
      { url: 'https://images.unsplash.com/photo-1560714584-058be0be0ef5?w=400&q=80', caption: 'Quick weave — straight' },
      { url: 'https://images.unsplash.com/photo-1523264939339-c89f9dadde2e?w=400&q=80', caption: 'Sew-in — body wave' },
    ],
  },
  {
    email: `sofia${TEST_DOMAIN}`,
    name: 'Sofia Rivera',
    bio: 'Color specialist and curl queen with 9 years experience. Balayage, vivid color, and curly cuts are my passion. Based in Houston.',
    specialties: ['Balayage', 'Color', 'Curly cut', 'Highlights', 'Vivid color'],
    experienceYears: 9,
    availability: Availability.WEEKEND,
    radiusMiles: 30,
    rateRange: '$120 – $350',
    rateNote: 'Color consult included',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    cityId: 'houston',
    lat: 29.7604,
    lng: -95.3698,
    portfolio: [
      { url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', caption: 'Balayage — warm blonde' },
      { url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80', caption: 'Vivid color — mermaid' },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', caption: 'Curly cut — devacurl' },
      { url: 'https://images.unsplash.com/photo-1560714584-058be0be0ef5?w=400&q=80', caption: 'Highlights — babylights' },
      { url: 'https://images.unsplash.com/photo-1523264939339-c89f9dadde2e?w=400&q=80', caption: 'Color correction' },
    ],
  },
]

// ─── Salons ───────────────────────────────────────────────────────────────────

const SALONS: SalonSeed[] = [
  {
    email: `glamstudio${TEST_DOMAIN}`,
    name: 'Glam Studio DC',
    description: 'Premier natural hair salon in Tysons, VA. Specializing in protective styles, locs, and natural hair care. 12 stations, walk-ins welcome.',
    specialties: ['Knotless braids', 'Box braids', 'Locs', 'Natural hair', 'Cornrows'],
    photoUrls: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
      'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'dmv',
    lat: 38.9200,
    lng: -77.2211,
    jobs: [
      {
        title: 'Experienced Braider Needed ASAP 🔥',
        description: 'Looking for a skilled braider to join our growing team. Flexible schedule, booth rental or 60/40 commission. Clientele provided. Must have 2+ years knotless experience.',
        specialty: 'Knotless braids',
        payStructure: '60/40 + tips',
        type: EmploymentType.TEMPORARY,
        isUrgent: true,
        daysUntilExpiry: 5,
      },
      {
        title: 'Full-time Locs Specialist',
        description: 'Join our growing team as a locs specialist. Full clientele provided, guaranteed $800/week. We provide all tools and products.',
        specialty: 'Locs',
        payStructure: '$800/week + tips',
        type: EmploymentType.FULL_TIME,
        isUrgent: false,
        daysUntilExpiry: 30,
      },
      {
        title: 'Weekend Braider — Booth Rental',
        description: 'Perfect for stylists who want to build their brand. Affordable booth rental Sat–Sun. High foot traffic location in Tysons.',
        specialty: 'Box braids',
        payStructure: '$150/day booth rental',
        type: EmploymentType.PART_TIME,
        isUrgent: false,
        daysUntilExpiry: 21,
      },
    ],
  },
  {
    email: `luxebar${TEST_DOMAIN}`,
    name: 'Luxe Beauty Bar',
    description: 'Upscale beauty bar in Silver Spring, MD. Specializing in nails, lashes, and brow services. Rated 4.9 stars. Modern salon with premium products.',
    specialties: ['Gel nails', 'Acrylic nails', 'Classic lashes', 'Volume lashes', 'Brow lamination'],
    photoUrls: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'dmv',
    lat: 38.9907,
    lng: -77.0261,
    jobs: [
      {
        title: 'Nail Tech — Gel Specialist',
        description: 'Full-time nail tech position. Competitive hourly + tips. All products provided. Flexible schedule available. Must have gel certification.',
        specialty: 'Gel nails',
        payStructure: '$18–22/hr + tips',
        type: EmploymentType.FULL_TIME,
        isUrgent: false,
        daysUntilExpiry: 14,
      },
      {
        title: 'Lash Tech — Volume Sets',
        description: 'Part-time lash tech to cover weekends and evenings. Hybrid and volume experience required. Training on mega volume available.',
        specialty: 'Volume lashes',
        payStructure: '55/45 + tips',
        type: EmploymentType.PART_TIME,
        isUrgent: false,
        daysUntilExpiry: 20,
      },
      {
        title: 'Booth Rental — Nail or Lash Tech',
        description: 'Monthly booth rental available for licensed nail techs or lash artists. Prime location, built-in clientele. Flexible days.',
        specialty: 'Gel nails',
        payStructure: '$600/mo booth rental',
        type: EmploymentType.PART_TIME,
        isUrgent: false,
        daysUntilExpiry: 60,
      },
    ],
  },
  {
    email: `cutshop${TEST_DOMAIN}`,
    name: 'The Cut Shop',
    description: 'DC\'s #1 rated barbershop. Clean fades, crisp lineups, and expert beard work. Established 2018. 5 stations. Walk-ins always welcome.',
    specialties: ['Skin fade', 'Taper fade', 'Lineups', 'Beard design', 'Kids cuts'],
    photoUrls: [
      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80',
      'https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'dmv',
    lat: 38.9072,
    lng: -77.0369,
    jobs: [
      {
        title: 'Barber Needed — Immediate Start',
        description: '$600/week guaranteed + tips. Busy shop with overflow clients ready. Must have barber license. All tools provided.',
        specialty: 'Skin fade',
        payStructure: '$600/week guaranteed',
        type: EmploymentType.FULL_TIME,
        isUrgent: true,
        daysUntilExpiry: 3,
      },
      {
        title: 'Freelance Barber — Weekends Only',
        description: 'Cover weekend shifts at our busiest location. Perfect side income. $250–400/day estimated on busy Saturdays.',
        specialty: 'Taper fade',
        payStructure: '$25–35/hr + tips',
        type: EmploymentType.TEMPORARY,
        isUrgent: false,
        daysUntilExpiry: 10,
      },
    ],
  },
  {
    email: `crownatl${TEST_DOMAIN}`,
    name: 'Crown Collective Atlanta',
    description: 'Atlanta\'s go-to natural hair and braiding studio. Serving the community since 2017. 8 stylists on staff. Specializing in protective styles and healthy hair.',
    specialties: ['Knotless braids', 'Wig install', 'Silk press', 'Loc maintenance', 'Natural hair'],
    photoUrls: [
      'https://images.unsplash.com/photo-1620331311520-246422fd82f9?w=800&q=80',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'atlanta',
    lat: 33.7490,
    lng: -84.3880,
    jobs: [
      {
        title: 'Experienced Stylist — Full or Part Time',
        description: 'Looking for a versatile stylist with braiding and natural hair skills. Full or part-time openings. Commission or booth rental available.',
        specialty: 'Silk press',
        payStructure: '55/45 + tips',
        type: EmploymentType.FULL_TIME,
        isUrgent: false,
        daysUntilExpiry: 25,
      },
      {
        title: 'Braider / Stylist Weekend Shifts',
        description: 'Weekend warrior position — earn $400–600/weekend. Must be proficient in knotless and box braids. Flexible hours.',
        specialty: 'Knotless braids',
        payStructure: '$25/hr + tips',
        type: EmploymentType.PART_TIME,
        isUrgent: false,
        daysUntilExpiry: 18,
      },
      {
        title: 'Wig Install Specialist — Urgent',
        description: 'Immediate opening for wig specialist. HD lace, glue-less installs, frontal sews. 5+ clients daily guaranteed.',
        specialty: 'Wig install',
        payStructure: '$22/hr + tips',
        type: EmploymentType.FULL_TIME,
        isUrgent: true,
        daysUntilExpiry: 7,
      },
    ],
  },
  {
    email: `blisshou${TEST_DOMAIN}`,
    name: 'Bliss Beauty Studio',
    description: 'Houston\'s premier color and curl destination. Specializing in balayage, vivid color, and curly cuts. Full-service salon with 10 stations.',
    specialties: ['Balayage', 'Color', 'Curly cut', 'Highlights', 'Vivid color'],
    photoUrls: [
      'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
    ],
    isHiring: true,
    cityId: 'houston',
    lat: 29.7604,
    lng: -95.3698,
    jobs: [
      {
        title: 'Color Specialist — Balayage Expert',
        description: 'We are expanding our color team! Must be skilled in balayage and highlights. Full-time with built-in clientele. Great team culture.',
        specialty: 'Balayage',
        payStructure: '$1,200–1,800/week',
        type: EmploymentType.FULL_TIME,
        isUrgent: false,
        daysUntilExpiry: 28,
      },
      {
        title: 'Curly Hair Specialist',
        description: 'Looking for a DevaCurl or OUIDAD-trained stylist to lead our curly hair department. Part-time to start, full-time available.',
        specialty: 'Curly cut',
        payStructure: '$20–28/hr + tips',
        type: EmploymentType.PART_TIME,
        isUrgent: false,
        daysUntilExpiry: 35,
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
