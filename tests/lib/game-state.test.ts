import { describe, it, expect } from 'vitest'
import { getGameState, startGame, claimWinner, resetGame } from '@/lib/game-state'

describe('game-state', () => {
  it('초기 상태는 idle', async () => {
    const s = await getGameState()
    expect(s.status).toBe('idle')
  })

  it('startGame 후 running', async () => {
    await startGame()
    const s = await getGameState()
    expect(s.status).toBe('running')
    expect(s.startedAt).toBeGreaterThan(0)
  })

  it('claimWinner 첫 호출 성공, 두 번째는 실패', async () => {
    await startGame()
    const a = await claimWinner('fam-A', '김씨네')
    expect(a.won).toBe(true)
    const b = await claimWinner('fam-B', '박씨네')
    expect(b.won).toBe(false)
    expect(b.existingWinner).toEqual({ familyId: 'fam-A', nickname: '김씨네' })
    const s = await getGameState()
    expect(s.status).toBe('finished')
    expect(s.winnerFamilyId).toBe('fam-A')
  })

  it('resetGame 은 idle 로 복귀', async () => {
    await startGame()
    await claimWinner('fam-A', '김씨네')
    await resetGame()
    expect((await getGameState()).status).toBe('idle')
  })
})
