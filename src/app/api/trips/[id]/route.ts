import { requireUser, requireTripMember } from '@/lib/auth'
import { db } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request)
    const { id } = await params
    await requireTripMember(id, user.id)

    const trip = await db.trip.findUnique({
      where: { id },
      include: {
        members: {
          select: { id: true, name: true, email: true, upiId: true, userId: true },
        },
        expenses: {
          include: {
            shares: { select: { memberId: true, sharePaise: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 })

    return Response.json(trip)
  } catch (error) {
    return errorResponse(error)
  }
}