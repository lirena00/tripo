import { requireUser, requireTripMember } from '@/lib/auth'
import { db } from '@/lib/db'
import { addMemberSchema } from '@/lib/validators'
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
    const parsed = addMemberSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const member = await db.member.create({
      data: {
        tripId: id,
        name: parsed.data.name,
        email: parsed.data.email,
        upiId: parsed.data.upiId,
      },
    })

    return Response.json(member, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}