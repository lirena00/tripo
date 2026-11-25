import { requireUser, requireTripMember } from '@/lib/auth'
import { db } from '@/lib/db'
import { recordPaymentSchema } from '@/lib/validators'
import { errorResponse } from '@/lib/errors'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser(request)
    const { id } = await params
    await requireTripMember(id, user.id)

    const body = await request.json()
    const parsed = recordPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { fromMemberId, toMemberId, amountPaise } = parsed.data

    // Verify both members belong to this trip
    const members = await db.member.findMany({
      where: { id: { in: [fromMemberId, toMemberId] }, tripId: id },
    })
    if (members.length !== 2) {
      return Response.json({ error: 'One or both members not found in this trip' }, { status: 400 })
    }

    const payment = await db.payment.create({
      data: {
        tripId: id,
        fromMemberId,
        toMemberId,
        amountPaise,
      },
    })

    return Response.json(payment, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}