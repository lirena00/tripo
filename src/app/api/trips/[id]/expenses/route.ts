import { requireUser, requireTripMember } from '@/lib/auth'
import { db } from '@/lib/db'
import { createExpenseSchema } from '@/lib/validators'
import { computeShares } from '@/lib/splits'
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
    const parsed = createExpenseSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { paidBy, amountPaise, category, description, splitType, splitAmong, splitValues } = parsed.data

    // Verify paidBy is a member of this trip
    const payer = await db.member.findFirst({
      where: { id: paidBy, tripId: id },
    })
    if (!payer) {
      return Response.json({ error: 'Payer is not a member of this trip' }, { status: 400 })
    }

    // Verify all splitAmong members belong to this trip
    const members = await db.member.findMany({
      where: { id: { in: splitAmong }, tripId: id },
    })
    if (members.length !== splitAmong.length) {
      return Response.json({ error: 'Some members not found in this trip' }, { status: 400 })
    }

    const tripMembers = members.map((m) => m.id)
    const shares = computeShares(amountPaise, { splitType, splitAmong, splitValues }, tripMembers)

    const expense = await db.expense.create({
      data: {
        tripId: id,
        paidById: paidBy,
        amountPaise,
        category,
        description,
        shares: {
          create: shares.map((s) => ({
            memberId: s.memberId,
            sharePaise: s.sharePaise,
          })),
        },
      },
      include: {
        shares: true,
      },
    })

    return Response.json(expense, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}