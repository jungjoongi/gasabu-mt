import { describe, it, expect, vi } from 'vitest'

// 쿠키 모킹 — register 라우트에서 setFamilyCookie, answer 라우트에서 getCurrentFamily
const cookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => ({ value: cookieStore.get(n) }),
    set: (n: string, v: string) => {
      cookieStore.set(n, v)
    },
    delete: (n: string) => {
      cookieStore.delete(n)
    },
  }),
}))

import { POST as register } from '@/app/api/family/register/route'
import { POST as answer } from '@/app/api/answer/route'
import { startGame } from '@/lib/game-state'
import { getFamilyByNickname, saveFamily } from '@/lib/family'

/**
 * 닉네임으로 가족 등록 후 그 쿠키 세션으로 진입.
 * (T10 scan 라우트가 아직 없으므로, 보물 진행 상태는 saveFamily 로 직접 시드한다.)
 */
async function asFamily(nickname: string) {
  cookieStore.clear()
  await register(
    new Request('http://t/r', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),
  )
}

async function seedTreasures(nickname: string, count: number) {
  const family = await getFamilyByNickname(nickname)
  if (!family) throw new Error(`fixture: family ${nickname} not registered`)
  family.treasuresFound = Array.from({ length: count }, (_, i) => `seed-${nickname}-${i}`)
  family.diaryPagesRead = Math.min(count, 7)
  await saveFamily(family)
}

function ans(value: string) {
  return new Request('http://t/answer', {
    method: 'POST',
    body: JSON.stringify({ answer: value }),
  })
}

describe('POST /api/answer', () => {
  it('보물 0개일 때 시도 → 403 (시도 횟수 없음)', async () => {
    await startGame()
    await asFamily('A')
    const res = await answer(ans('하만'))
    expect(res.status).toBe(403)
  })

  it('보물 1개로 정답 → 우승', async () => {
    await startGame()
    await asFamily('A')
    await seedTreasures('A', 1)
    const res = await answer(ans('하만'))
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.won).toBe(true)
  })

  it('오답 → attemptsUsed +1, 시도 횟수 차감', async () => {
    await startGame()
    await asFamily('B')
    await seedTreasures('B', 1)
    const res = await answer(ans('가인'))
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.wrong).toBe(true)
    expect(json.data.attemptsRemaining).toBe(0)
  })

  it('이미 우승자 있음 → tooLate', async () => {
    await startGame()
    await asFamily('A')
    await seedTreasures('A', 1)
    await answer(ans('하만'))
    await asFamily('B')
    await seedTreasures('B', 1)
    const res = await answer(ans('하만'))
    const json = await res.json()
    expect(json.data.tooLate).toBe(true)
    expect(json.data.winnerNickname).toBe('A')
  })

  it('대소문자/공백 무시 — "Haman" 정답 처리', async () => {
    await startGame()
    await asFamily('C')
    await seedTreasures('C', 1)
    const res = await answer(ans(' Haman '))
    expect((await res.json()).data.won).toBe(true)
  })
})
