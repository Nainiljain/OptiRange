import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { connectDB } from './db'
import { User } from './models'

const JWT_SECRET = process.env.JWT_SECRET || 'optirange-super-secret-key-2026'

export async function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export async function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (error) {
    return null
  }
}

export async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')
  
  if (!token?.value) {
    return null
  }

  const decoded = await verifyToken(token.value)
  if (!decoded || !decoded.id) {
    return null
  }

  await connectDB()
  const user = await User.findById(decoded.id).select('_id firstName lastName name email profilePic').lean() as any;
  
  if (!user) return null

  const firstName = user.firstName || (user.name ? user.name.split(' ')[0] : '') || ''
  const lastName  = user.lastName  || (user.name ? user.name.split(' ').slice(1).join(' ') : '') || ''

  // Return a fully serialised plain object — safe to pass to Client Components
  return {
    id:         user._id.toString(),
    _id:        user._id.toString(),
    firstName,
    lastName,
    name:       user.name || `${firstName} ${lastName}`.trim(),
    email:      user.email      ?? '',
    profilePic: user.profilePic ?? null,
  }
}

export async function clearUserSession() {
  const cookieStore = await cookies()
  cookieStore.delete('auth-token')
}

export async function setUserSession(userId: string | number) {
  const token = await signToken({ id: userId.toString() })
  const cookieStore = await cookies()
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}
