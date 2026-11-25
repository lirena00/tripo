import { db } from '@/lib/db'
import { signToken, setTokenCookie } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email } = body as { name?: string; email?: string }

    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }

    let user = email ? await db.user.findUnique({ where: { email } }) : null

    if (!user) {
      user = await db.user.create({
        data: { name, email },
      })
    } else if (user.name !== name) {
      user = await db.user.update({
        where: { id: user.id },
        data: { name },
      })
    }

    const accessToken = await signToken(user.id)

    const response = Response.json({
      accessToken,
      user: { id: user.id, name: user.name, email: user.email ?? undefined },
    })

    setTokenCookie(response, accessToken)
    return response
  } catch (error) {
    return errorResponse(error)
  }
}