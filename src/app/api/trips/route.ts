import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { createTripSchema } from '@/lib/validators'
import { errorResponse } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)

    const trips = await db.trip.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        members: { select: { id: true, name: true, userId: true } },
        _count: { select: { expenses: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json(trips)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request)
    const body = await request.json()
    const data = createTripSchema.parse(body)

    const trip = await db.trip.create({
      data: {
        name: data.name,
        createdById: user.id,
        members: {
          create: { name: user.name, userId: user.id },
        },
      },
      include: { members: true },
    })

    return Response.json(trip, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}