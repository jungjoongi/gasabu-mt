import { NextResponse } from 'next/server'
import { getGameState } from '@/lib/game-state'

export async function GET() {
  const state = await getGameState()
  return NextResponse.json({ ok: true, data: state })
}
