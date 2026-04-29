import { NextResponse } from 'next/server'
import { listKeys, del } from '@/lib/kv'
import { checkAdminPassword } from '@/lib/admin'
import { resetGame } from '@/lib/game-state'

export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }
  // Redis 전체 초기화 (게임 상태, 가족, 닉네임 인덱스, 보물 클레임)
  const keys = await listKeys('*')
  for (const k of keys) await del(k)
  await resetGame()
  return NextResponse.json({ ok: true, deleted: keys.length })
}
