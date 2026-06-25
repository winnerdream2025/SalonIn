/**
 * Seed: provider-booking-profiles
 *
 * Maps real SalonIn providers → Havana tenantSlugs.
 *
 * RULES:
 * - Only seed providers that actually exist in Havana.
 * - DO NOT auto-create fake tenants. Only map real entities.
 * - Run this after the main seed.ts to ensure providers exist.
 *
 * Usage:
 *   pnpm tsx prisma/seeds/provider-booking-profiles.seed.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Real Havana tenant mappings ──────────────────────────────────────────────
//
// Each entry maps a SalonIn provider identifier → Havana tenantSlug.
// Remove or comment out any entry that doesn't yet have a Havana account.
//
// Format:
//   For salons   → match by salon slug (derived from name, e.g. "glam-studio-dc")
//   For workers  → match by worker username/email prefix

interface SalonMapping {
  salonSlugOrName: string   // partial name match used to find the salon
  tenantSlug: string        // Havana tenant slug
  externalBookingSystemId?: string
}

interface WorkerMapping {
  emailPrefix: string       // the part before '@' in the seed email
  tenantSlug: string
  externalBookingSystemId?: string
}

// ── Salons with Havana accounts ───────────────────────────────────────────────
// Only add entries here for salons that have signed up on Havana.
const SALON_MAPPINGS: SalonMapping[] = [
  // Example (uncomment + replace when salons go live on Havana):
  // { salonSlugOrName: 'Glam Studio DC',      tenantSlug: 'glam-studio-dc',       externalBookingSystemId: 'hvn_salon_001' },
  // { salonSlugOrName: 'Luxe Beauty Bar',     tenantSlug: 'luxe-beauty-bar',       externalBookingSystemId: 'hvn_salon_002' },
  // { salonSlugOrName: 'The Cut Shop',        tenantSlug: 'the-cut-shop-dc',       externalBookingSystemId: 'hvn_salon_003' },
  // { salonSlugOrName: 'Crown Collective',    tenantSlug: 'crown-collective-atl',  externalBookingSystemId: 'hvn_salon_004' },
  // { salonSlugOrName: 'Bliss Beauty Studio', tenantSlug: 'bliss-beauty-studio',   externalBookingSystemId: 'hvn_salon_005' },
]

// ── Freelance professionals with Havana accounts ──────────────────────────────
// Only add entries here for workers that have signed up on Havana.
const WORKER_MAPPINGS: WorkerMapping[] = [
  // Example (uncomment + replace when workers go live on Havana):
  // { emailPrefix: 'jasmine', tenantSlug: 'jasmine-laurent-braids', externalBookingSystemId: 'hvn_pro_001' },
  // { emailPrefix: 'maya',    tenantSlug: 'maya-kim-nails',         externalBookingSystemId: 'hvn_pro_002' },
  // { emailPrefix: 'amara',   tenantSlug: 'amara-diallo-lashes',    externalBookingSystemId: 'hvn_pro_003' },
  // { emailPrefix: 'jordan',  tenantSlug: 'jordan-miles-barber',    externalBookingSystemId: 'hvn_pro_004' },
  // { emailPrefix: 'sofia',   tenantSlug: 'sofia-rivera-color',     externalBookingSystemId: 'hvn_pro_005' },
]

const TEST_DOMAIN = '@salonin.test'

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔗 Seeding provider booking profiles...\n')

  let created = 0
  let skipped = 0

  // ── Salons ──────────────────────────────────────────────────────────────────

  for (const mapping of SALON_MAPPINGS) {
    const salon = await prisma.salonProfile.findFirst({
      where: { name: { contains: mapping.salonSlugOrName, mode: 'insensitive' } },
      select: { id: true, name: true },
    })

    if (!salon) {
      console.warn(`  ⚠️  Salon not found: "${mapping.salonSlugOrName}" — skipping`)
      skipped++
      continue
    }

    const existing = await prisma.providerBookingProfile.findUnique({
      where: { providerId_providerType: { providerId: salon.id, providerType: 'salon' } },
    })

    if (existing) {
      // Update tenantSlug and externalBookingSystemId in case they changed
      await prisma.providerBookingProfile.update({
        where: { id: existing.id },
        data: {
          tenantSlug: mapping.tenantSlug,
          externalBookingSystemId: mapping.externalBookingSystemId ?? existing.externalBookingSystemId,
          isActive: true,
        },
      })
      console.log(`  ↻  Updated salon: ${salon.name} → ${mapping.tenantSlug}`)
    } else {
      await prisma.providerBookingProfile.create({
        data: {
          providerId: salon.id,
          providerType: 'salon',
          tenantSlug: mapping.tenantSlug,
          externalBookingSystemId: mapping.externalBookingSystemId ?? null,
          isActive: true,
        },
      })
      console.log(`  ✓  Created salon: ${salon.name} → ${mapping.tenantSlug}`)
    }

    // Also enable acceptsBookings on the salon
    await prisma.salonProfile.update({
      where: { id: salon.id },
      data: { acceptsBookings: true },
    })

    created++
  }

  // ── Workers ──────────────────────────────────────────────────────────────────

  for (const mapping of WORKER_MAPPINGS) {
    const user = await prisma.user.findUnique({
      where: { email: `${mapping.emailPrefix}${TEST_DOMAIN}` },
      select: { id: true, workerProfile: { select: { id: true, name: true } } },
    })

    if (!user?.workerProfile) {
      console.warn(`  ⚠️  Worker not found: "${mapping.emailPrefix}" — skipping`)
      skipped++
      continue
    }

    const { id: workerId, name } = user.workerProfile

    const existing = await prisma.providerBookingProfile.findUnique({
      where: { providerId_providerType: { providerId: workerId, providerType: 'professional' } },
    })

    if (existing) {
      await prisma.providerBookingProfile.update({
        where: { id: existing.id },
        data: {
          tenantSlug: mapping.tenantSlug,
          externalBookingSystemId: mapping.externalBookingSystemId ?? existing.externalBookingSystemId,
          isActive: true,
        },
      })
      console.log(`  ↻  Updated worker: ${name} → ${mapping.tenantSlug}`)
    } else {
      await prisma.providerBookingProfile.create({
        data: {
          providerId: workerId,
          providerType: 'professional',
          tenantSlug: mapping.tenantSlug,
          externalBookingSystemId: mapping.externalBookingSystemId ?? null,
          isActive: true,
        },
      })
      console.log(`  ✓  Created worker: ${name} → ${mapping.tenantSlug}`)
    }

    // Also enable acceptsBookings + homeServiceEnabled on the worker
    await prisma.workerProfile.update({
      where: { id: workerId },
      data: { acceptsBookings: true },
    })

    created++
  }

  // ── Summary ──────────────────────────────────────────────────────────────────

  const total = await prisma.providerBookingProfile.count()
  console.log('\n── Booking profile seed complete ───────────────')
  console.log(`  Processed : ${created}`)
  console.log(`  Skipped   : ${skipped}`)
  console.log(`  Total in DB: ${total}`)
  console.log('─────────────────────────────────────────────────')

  if (SALON_MAPPINGS.length === 0 && WORKER_MAPPINGS.length === 0) {
    console.log('\n  ℹ️  No mappings defined yet.')
    console.log('  Edit SALON_MAPPINGS / WORKER_MAPPINGS in this file')
    console.log('  once providers have Havana accounts.')
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
