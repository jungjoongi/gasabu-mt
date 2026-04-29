import { NextResponse } from 'next/server'
import { getCurrentFamily } from '@/lib/auth'

export async function GET() {
  const family = await getCurrentFamily()
  if (!family) {
    return NextResponse.json(
      { ok: false, error: '로그인 필요' },
      { status: 401 },
    )
  }
  return NextResponse.json({ ok: true, data: family })
}
