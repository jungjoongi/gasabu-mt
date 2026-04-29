import { cookies } from 'next/headers'
import { getFamily } from '@/lib/family'
import type { Family } from '@/types'

const COOKIE = 'familyId'
const MAX_AGE = 60 * 60 * 24 * 7

export async function setFamilyCookie(familyId: string): Promise<void> {
  const c = await cookies()
  c.set(COOKIE, familyId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function getCurrentFamily(): Promise<Family | null> {
  const c = await cookies()
  const id = c.get(COOKIE)?.value
  if (!id) return null
  return getFamily(id)
}

export async function clearFamilyCookie(): Promise<void> {
  const c = await cookies()
  c.delete(COOKIE)
}
