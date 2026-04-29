import { NextResponse } from 'next/server'
import { checkAdminPassword } from '@/lib/admin'
import { startGame } from '@/lib/game-state'

export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }
  await startGame()
  return NextResponse.json({ ok: true })
}
