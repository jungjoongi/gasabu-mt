import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentFamily } from '@/lib/auth'
import { saveFamily } from '@/lib/family'
import { getGameState, claimWinner } from '@/lib/game-state'
import { CORRECT_ANSWERS } from '@/lib/content'

const Body = z.object({ answer: z.string().max(50) })

/**
 * POST /api/answer — 정답 검증 + atomic 우승자 락.
 *
 * 시도 횟수 = 찾은 보물 수 − 사용한 시도. 0회면 403.
 * 정답: trim+lowercase+공백 제거 후 CORRECT_ANSWERS 매칭.
 * 정답 + claimWinner 성공 → 게임 finished + winnerFamilyId/Nickname 기록.
 * 정답 + claimWinner 실패(이미 우승자 있음) → tooLate.
 * 게임이 이미 finished 상태면 즉시 tooLate.
 */
export async function POST(req: Request) {
  const family = await getCurrentFamily()
  if (!family) {
    return NextResponse.json(
      { ok: false, error: '로그인 필요' },
      { status: 401 },
    )
  }

  const json = await req.json().catch(() => ({}))
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: '입력이 올바르지 않습니다' },
      { status: 400 },
    )
  }

  const game = await getGameState()
  if (game.status === 'finished') {
    return NextResponse.json({
      ok: true,
      data: { tooLate: true, winnerNickname: game.winnerNickname },
    })
  }

  const remaining = family.treasuresFound.length - family.attemptsUsed
  if (remaining <= 0) {
    return NextResponse.json(
      { ok: false, error: '시도 횟수가 없습니다. 보물을 더 찾아보세요' },
      { status: 403 },
    )
  }

  const normalized = parsed.data.answer.trim().toLowerCase().replace(/\s+/g, '')
  const isCorrect = CORRECT_ANSWERS.some(
    (a) => a.toLowerCase() === normalized,
  )

  if (isCorrect) {
    const result = await claimWinner(family.id, family.nickname)
    if (result.won) {
      return NextResponse.json({ ok: true, data: { won: true } })
    }
    return NextResponse.json({
      ok: true,
      data: {
        tooLate: true,
        winnerNickname: result.existingWinner!.nickname,
      },
    })
  }

  family.attemptsUsed += 1
  await saveFamily(family)
  return NextResponse.json({
    ok: true,
    data: {
      wrong: true,
      attemptsRemaining: family.treasuresFound.length - family.attemptsUsed,
    },
  })
}
