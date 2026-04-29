import { NextResponse } from 'next/server'
import { listKeys, del, setJSON, getJSON } from '@/lib/kv'
import { checkAdminPassword } from '@/lib/admin'
import { resetGame } from '@/lib/game-state'
import type { Treasure } from '@/types'

// "라운드 리셋": 게임 상태 + 가족 + claim 락만 지우고, 시드된 보물 UUID 자체는 보존.
// → 인쇄된 QR 이 다음 라운드에도 그대로 동작한다.
//
// 보존 대상: treasure:{uuid} (단, claimedByFamilyId/claimedAt 만 비움) / treasures:list
// 삭제 대상: family:* / nickname-index:* / families:list / game:* / treasure-claim-lock:*
export async function POST(req: Request) {
  if (!checkAdminPassword(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ ok: false, error: '권한 없음' }, { status: 401 })
  }

  const all = await listKeys('*')
  let deleted = 0
  let preserved = 0

  for (const k of all) {
    if (k === 'treasures:list') {
      preserved++
      continue
    }
    if (k.startsWith('treasure:') && !k.startsWith('treasure-claim-lock:')) {
      const t = await getJSON<Treasure>(k)
      if (t) {
        await setJSON<Treasure>(k, { uuid: t.uuid })
      }
      preserved++
      continue
    }
    await del(k)
    deleted++
  }

  await resetGame()

  return NextResponse.json({ ok: true, deleted, preserved })
}
