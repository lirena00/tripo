import { requireUser, requireTripMember } from '@/lib/auth'
import { db } from '@/lib/db'
import { computeBalances } from '@/lib/balances'
import { computeInsights } from '@/lib/insights'
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
        members: { select: { id: true, name: true } },
        expenses: {
          include: {
            shares: { select: { memberId: true, sharePaise: true } },
          },
        },
        payments: {
          select: { fromMemberId: true, toMemberId: true, amountPaise: true },
        },
      },
    })

    if (!trip) return Response.json({ error: 'Trip not found' }, { status: 404 })

    const balances = computeBalances(
      trip.members,
      trip.expenses.map((e) => ({
        id: e.id,
        paidById: e.paidById,
        amountPaise: e.amountPaise,
        shares: e.shares,
      })),
      trip.payments
    )

    const insights = computeInsights(
      trip.members,
      trip.expenses.map((e) => ({
        id: e.id,
        paidById: e.paidById,
        amountPaise: e.amountPaise,
        category: e.category,
        shares: e.shares,
      })),
      balances
    )

    return Response.json(insights)
  } catch (error) {
    return errorResponse(error)
  }
}