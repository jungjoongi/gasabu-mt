import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkAdminPassword } from '@/lib/admin'
import { getFamilyByNickname, saveFamily } from '@/lib/family'

const Body = z.object({ nickname: z.string(), hint: z.string() })

export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ ok: false, error: '입력 오류' }, { status: 400 })
  const family = await getFamilyByNickname(parsed.data.nickname)
  if (!family) return NextResponse.json({ ok: false, error: '가족 없음' }, { status: 404 })
  family.pushedHints.push(parsed.data.hint)
  await saveFamily(family)
  return NextResponse.json({ ok: true })
}
