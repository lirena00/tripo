import { requireUser } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const user = await requireUser(request)
    return Response.json(user)
  } catch (error) {
    return errorResponse(error)
  }
}