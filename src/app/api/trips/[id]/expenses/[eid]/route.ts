import { requireUser, requireTripMember } from '@/lib/auth'
import { db } from '@/lib/db'
import { errorResponse } from '@/lib/errors'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  try {
    const user = await requireUser(request)
    const { id, eid } = await params
    await requireTripMember(id, user.id)

    const expense = await db.expense.findFirst({
      where: { id: eid, tripId: id },
    })
    if (!expense) {
      return Response.json({ error: 'Expense not found' }, { status: 404 })
    }

    await db.expense.delete({ where: { id: eid } })

    return Response.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}