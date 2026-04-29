import { NextResponse } from 'next/server'
import { listAllFamilies } from '@/lib/family'
import { getCurrentFamily } from '@/lib/auth'
import type { FamilyProgressRow } from '@/types'

export async function GET() {
  const me = await getCurrentFamily()
  const all = await listAllFamilies()
  const rows: FamilyProgressRow[] = all
    .map((f) => ({
      nickname: f.nickname,
      color: f.color,
      count: f.treasuresFound.length,
      isMe: me?.id === f.id,
    }))
    .sort((a, b) => b.count - a.count)
  return NextResponse.json({ ok: true, data: rows })
}
