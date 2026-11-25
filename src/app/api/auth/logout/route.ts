import { clearTokenCookie } from '@/lib/auth'

export async function POST() {
  const response = Response.json({ success: true })
  clearTokenCookie(response)
  return response
}