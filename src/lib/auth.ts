/**
 * AUTHENTICATION CONFIGURATION
 *
 * To switch to Google OAuth:
 * 1. Set AUTH_MODE=google in environment
 * 2. Replace the demo-login handler (app/api/auth/demo-login/route.ts) with a
 *    Google ID-token verification endpoint that:
 *    - Verifies the Google ID token using google-auth-library
 *    - Upserts User by googleSub (or by email if googleSub not set)
 *    - Issues the same JWT via signToken(userId) and sets the red_token cookie
 * 3. Keep requireUser() returning the same User shape (id, name, email).
 *    No other file should need to change.
 */

import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'
import { ApiError } from './errors'

const JWT_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? 'dev-secret-change-in-production')
const TOKEN_NAME = 'red_token'
const EXPIRY = '7d'

export interface SessionUser {
  id: string
  name: string
  email?: string
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return { sub: payload.sub as string }
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  const cookieHeader = request.headers.get('cookie')
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${TOKEN_NAME}=([^;]+)`))
    if (match) return match[1]
  }
  return null
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const token = getTokenFromRequest(request)
  if (!token) throw new ApiError(401, 'Unauthorized')

  const verified = await verifyToken(token)
  if (!verified) throw new ApiError(401, 'Invalid or expired token')

  const user = await db.user.findUnique({ where: { id: verified.sub } })
  if (!user) throw new ApiError(401, 'User not found')

  return { id: user.id, name: user.name, email: user.email ?? undefined }
}

export async function requireTripMember(tripId: string, userId: string): Promise<void> {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { members: { where: { userId }, select: { id: true } } },
  })

  if (!trip) throw new ApiError(404, 'Trip not found')

  const isCreator = trip.createdById === userId
  const isMember = trip.members.length > 0

  if (!isCreator && !isMember) {
    throw new ApiError(403, 'Not a member of this trip')
  }
}

export function setTokenCookie(response: Response, token: string): void {
  response.headers.set(
    'Set-Cookie',
    `${TOKEN_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
  )
}

export function clearTokenCookie(response: Response): void {
  response.headers.set(
    'Set-Cookie',
    `${TOKEN_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  )
}