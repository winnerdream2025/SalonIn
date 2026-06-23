import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking for test accounts...\n')

  const existing = await prisma.user.findMany({
    where: {
      email: {
        in: ['testworker@mysalonin.com', 'testsalon@mysalonin.com'],
      },
    },
    include: { workerProfile: true, salonProfile: true },
  })

  console.log(`Found ${existing.length} existing account(s):`)
  for (const u of existing) {
    console.log(`  - ${u.email} | role: ${u.role} | active: ${u.isActive}`)
  }

  const hash = await bcrypt.hash('Test1234!', 10)

  const workerExists = existing.find((u) => u.email === 'testworker@mysalonin.com')
  if (!workerExists) {
    const user = await prisma.user.create({
      data: {
        email: 'testworker@mysalonin.com',
        passwordHash: hash,
        role: 'WORKER',
        isActive: true,
        workerProfile: {
          create: {
            name: 'Test Worker',
            bio: 'Apple App Store review test account — beauty professional',
            specialties: ['knotless-braids', 'gel-nails', 'classic-lashes'],
            experienceYears: 3,
            availability: 'NOW',
            languages: ['English'],
          },
        },
      },
    })
    console.log(`\n✅ Created WORKER: ${user.email} (id: ${user.id})`)
  } else {
    console.log(`\n⚠️  WORKER already exists: ${workerExists.email}`)
  }

  const salonExists = existing.find((u) => u.email === 'testsalon@mysalonin.com')
  if (!salonExists) {
    const user = await prisma.user.create({
      data: {
        email: 'testsalon@mysalonin.com',
        passwordHash: hash,
        role: 'SALON',
        isActive: true,
        salonProfile: {
          create: {
            name: 'Test Salon',
            description: 'Apple App Store review test account — salon owner',
            specialties: ['knotless-braids', 'gel-nails', 'classic-lashes', 'bridal-makeup'],
            isHiring: true,
          },
        },
      },
    })
    console.log(`✅ Created SALON: ${user.email} (id: ${user.id})`)
  } else {
    console.log(`⚠️  SALON already exists: ${salonExists.email}`)
  }

  // Final verification
  const final = await prisma.user.findMany({
    where: {
      email: { in: ['testworker@mysalonin.com', 'testsalon@mysalonin.com'] },
    },
    select: { id: true, email: true, role: true, isActive: true },
  })

  console.log('\n─── FINAL STATE ───')
  for (const u of final) {
    console.log(`  ${u.email}  |  ${u.role}  |  active: ${u.isActive}`)
  }

  console.log('\nCredentials for Apple review:')
  console.log('  Worker:  testworker@mysalonin.com / Test1234!')
  console.log('  Salon:   testsalon@mysalonin.com  / Test1234!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
