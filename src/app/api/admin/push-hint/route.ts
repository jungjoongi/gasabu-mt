import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkAdminPassword } from '@/lib/admin'
import { listAllFamilies, saveFamily } from '@/lib/family'

// 운영자가 모든 가족에게 한 번에 힌트를 방송한다.
// 등록된 가족이 없으면 0명에게 전달됐다고 응답.
const Body = z.object({ hint: z.string().min(1).max(200) })

export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: '힌트 본문이 비어있습니다' }, { status: 400 })
  }

  const families = await listAllFamilies()
  await Promise.all(
    families.map(f => {
      f.pushedHints.push(parsed.data.hint)
      return saveFamily(f)
    }),
  )

  return NextResponse.json({ ok: true, deliveredTo: families.length })
}
