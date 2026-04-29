import { NextResponse } from 'next/server'
import { z } from 'zod'
import { registerFamily } from '@/lib/family'
import { setFamilyCookie } from '@/lib/auth'

const Body = z.object({ nickname: z.string().min(1).max(20) })

export async function POST(req: Request) {
  let parsed
  try {
    const json = await req.json()
    parsed = Body.parse({ ...json, nickname: (json.nickname ?? '').trim() })
  } catch {
    return NextResponse.json({ ok: false, error: '닉네임을 입력해주세요' }, { status: 400 })
  }

  try {
    const family = await registerFamily(parsed.nickname)
    await setFamilyCookie(family.id)
    return NextResponse.json({ ok: true, data: family })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '등록 실패'
    const status = /8가족/.test(msg) ? 409 : 400
    return NextResponse.json({ ok: false, error: msg }, { status })
  }
}
