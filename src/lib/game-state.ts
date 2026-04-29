import { getJSON, setJSON, setIfAbsent, del } from '@/lib/kv'
import type { GameState } from '@/types'

const KEY = 'game:state'
const WINNER_LOCK = 'game:winner-lock'

export async function getGameState(): Promise<GameState> {
  return (await getJSON<GameState>(KEY)) ?? { status: 'idle' }
}

export async function startGame(): Promise<void> {
  await setJSON<GameState>(KEY, { status: 'running', startedAt: Date.now() })
}

export interface ClaimWinnerResult {
  won: boolean
  existingWinner?: { familyId: string; nickname: string }
}

export async function claimWinner(
  familyId: string,
  nickname: string,
): Promise<ClaimWinnerResult> {
  const locked = await setIfAbsent(WINNER_LOCK, familyId)
  if (!locked) {
    const existing = (await getJSON<GameState>(KEY))!
    return {
      won: false,
      existingWinner: {
        familyId: existing.winnerFamilyId!,
        nickname: existing.winnerNickname!,
      },
    }
  }
  const current = (await getJSON<GameState>(KEY)) ?? { status: 'running' as const }
  await setJSON<GameState>(KEY, {
    ...current,
    status: 'finished',
    winnerFamilyId: familyId,
    winnerNickname: nickname,
    finishedAt: Date.now(),
  })
  return { won: true }
}

export async function resetGame(): Promise<void> {
  await del(KEY)
  await del(WINNER_LOCK)
}
