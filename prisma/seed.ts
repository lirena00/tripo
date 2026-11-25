import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Seeded RNG for reproducible data
class SeededRandom {
  private seed: number
  constructor(seed: number) { this.seed = seed }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return this.seed / 0x100000000
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)]
  }
  shuffle<T>(arr: T[]): T[] {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
}

const TRIP_NAMES = ['Goa', 'Manali', 'Rishikesh', 'Jaipur', 'Pondicherry']
const INDIAN_NAMES = [
  'Aarav', 'Aditya', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Krishna',
  'Lakshmi', 'Meera', 'Neha', 'Priya', 'Rahul', 'Rohan', 'Saanvi', 'Vikram',
  'Aisha', 'Dev', 'Maya', 'Ravi', 'Sita', 'Tara', 'Varun', 'Zara'
]
const CATEGORIES = ['stay', 'fuel', 'food', 'activities', 'alcohol', 'tickets', 'shopping']
const SPLIT_TYPES = ['equal', 'exact', 'percent']

function randomUpiId(name: string, rng: SeededRandom): string {
  const providers = ['fakebank', 'mockpay', 'testupi', 'demobank']
  const cleanName = name.toLowerCase().replace(/\s+/g, '')
  return `${cleanName}@${rng.pick(providers)}`
}

function randomAmount(rng: SeededRandom): number {
  // Return amount in paise (1000-50000 rupees = 100000-5000000 paise)
  return rng.nextInt(100000, 5000000)
}

async function seed() {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  await db.payment.deleteMany()
  await db.expenseShare.deleteMany()
  await db.expense.deleteMany()
  await db.member.deleteMany()
  await db.trip.deleteMany()
  await db.user.deleteMany()

  const rng = new SeededRandom(42) // Fixed seed for reproducibility

  for (const tripName of TRIP_NAMES) {
    const tripRng = new SeededRandom(42 + TRIP_NAMES.indexOf(tripName) * 1000)

    // Create trip creator
    const creatorName = tripRng.pick(INDIAN_NAMES.filter(n => !n.startsWith('Z')))
    const creator = await db.user.create({
      data: {
        name: creatorName,
        email: `${creatorName.toLowerCase()}@example.com`,
      },
    })

    // Create trip
    const trip = await db.trip.create({
      data: {
        name: tripName,
        createdById: creator.id,
      },
    })

    // Create 4-7 members
    const memberCount = tripRng.nextInt(4, 7)
    const shuffledNames = tripRng.shuffle([...INDIAN_NAMES])
    const memberNames = shuffledNames.slice(0, memberCount)

    const members = []
    for (let i = 0; i < memberCount; i++) {
      const name = memberNames[i]
      const hasAccount = tripRng.next() < 0.7 // 70% chance of having user account
      const member = await db.member.create({
        data: {
          tripId: trip.id,
          name,
          userId: hasAccount ? (i === 0 ? creator.id : undefined) : undefined,
          upiId: randomUpiId(name, tripRng),
        },
      })
      members.push(member)
    }

    // Ensure creator is a member
    const creatorMember = members.find(m => m.userId === creator.id)
    if (!creatorMember) {
      await db.member.create({
        data: {
          tripId: trip.id,
          name: creatorName,
          userId: creator.id,
          upiId: randomUpiId(creatorName, tripRng),
        },
      })
    }

    // Create 20-40 expenses
    const expenseCount = tripRng.nextInt(20, 40)
    const allMembers = await db.member.findMany({ where: { tripId: trip.id } })

    for (let e = 0; e < expenseCount; e++) {
      const category = tripRng.pick(CATEGORIES)
      const amountPaise = randomAmount(tripRng)
      const splitType = tripRng.pick(SPLIT_TYPES)
      const paidBy = tripRng.pick(allMembers)

      // Select splitAmong (1 to all members)
      const splitAmongCount = tripRng.nextInt(1, allMembers.length)
      const splitAmong = tripRng.shuffle(allMembers).slice(0, splitAmongCount).map(m => m.id)

      let splitValues: Record<string, number> | undefined

      if (splitType === 'exact') {
        // Generate exact shares that sum to amountPaise
        const shares: number[] = []
        let remaining = amountPaise
        for (let i = 0; i < splitAmong.length - 1; i++) {
          const share = tripRng.nextInt(1, remaining - (splitAmong.length - i - 1))
          shares.push(share)
          remaining -= share
        }
        shares.push(remaining)
        splitValues = Object.fromEntries(splitAmong.map((id, i) => [id, shares[i]]))
      } else if (splitType === 'percent') {
        // Generate percentages that sum to 100
        const percents: number[] = []
        let remaining = 100
        for (let i = 0; i < splitAmong.length - 1; i++) {
          const pct = tripRng.nextInt(1, remaining - (splitAmong.length - i - 1))
          percents.push(pct)
          remaining -= pct
        }
        percents.push(remaining)
        splitValues = Object.fromEntries(splitAmong.map((id, i) => [id, percents[i]]))
      }

      // Compute shares using the same logic as the API
      let computedShares: { memberId: string; sharePaise: number }[]

      if (splitType === 'equal') {
        const baseShare = Math.floor(amountPaise / splitAmong.length)
        const remainder = amountPaise % splitAmong.length
        const sortedIds = [...splitAmong].sort()
        computedShares = sortedIds.map((id, i) => ({
          memberId: id,
          sharePaise: baseShare + (i < remainder ? 1 : 0),
        }))
      } else if (splitType === 'exact' && splitValues) {
        computedShares = splitAmong.map(id => ({
          memberId: id,
          sharePaise: splitValues[id] ?? 0,
        }))
      } else if (splitType === 'percent' && splitValues) {
        computedShares = splitAmong.map(id => {
          const percent = splitValues[id] ?? 0
          return { memberId: id, sharePaise: Math.floor((amountPaise * percent) / 100) }
        })
        // Distribute remainder
        let total = computedShares.reduce((acc, s) => acc + s.sharePaise, 0)
        let rem = amountPaise - total
        for (let i = 0; i < computedShares.length && rem > 0; i++) {
          computedShares[i].sharePaise += 1
          rem -= 1
        }
      } else {
        // equal fallback
        const baseShare = Math.floor(amountPaise / splitAmong.length)
        const remainder = amountPaise % splitAmong.length
        const sortedIds = [...splitAmong].sort()
        computedShares = sortedIds.map((id, i) => ({
          memberId: id,
          sharePaise: baseShare + (i < remainder ? 1 : 0),
        }))
      }

      await db.expense.create({
        data: {
          tripId: trip.id,
          paidById: paidBy.id,
          amountPaise,
          category,
          description: `${category} expense`,
          shares: {
            create: computedShares.map(s => ({
              memberId: s.memberId,
              sharePaise: s.sharePaise,
            })),
          },
        },
      })
    }

    console.log(`  ✅ ${tripName}: ${memberCount} members, ${expenseCount} expenses`)
  }

  console.log('🌱 Seeding complete!')
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })