import { describe, it, expect, vi } from 'vitest'

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
import { POST as scan } from '@/app/api/scan/[uuid]/route'
import { seedTreasure } from '@/lib/treasure'

async function asFamily(nickname: string) {
  cookieStore.clear()
  await register(
    new Request('http://t/r', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),
  )
}

describe('POST /api/scan/[uuid]', () => {
  it('자기 가족 첫 스캔 → 보물 등록 + 초성 +1', async () => {
    await seedTreasure('u1')
    await asFamily('김씨네')
    const res = await scan(
      new Request('http://t/scan/u1', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'u1' }) },
    )
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.family.treasuresFound).toEqual(['u1'])
    expect(json.data.family.initialsRevealed).toHaveLength(1)
    expect(json.data.family.diaryPagesRead).toBe(1)
  })

  it('자기가 이미 잡은 보물 재스캔 → 409', async () => {
    await seedTreasure('u2')
    await asFamily('박씨네')
    await scan(new Request('http://t/scan/u2', { method: 'POST' }), {
      params: Promise.resolve({ uuid: 'u2' }),
    })
    const res = await scan(
      new Request('http://t/scan/u2', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'u2' }) },
    )
    expect(res.status).toBe(409)
  })

  it('다른 가족이 잡은 보물 → 409 + ownerNickname', async () => {
    await seedTreasure('u3')
    await asFamily('A')
    await scan(new Request('http://t/scan/u3', { method: 'POST' }), {
      params: Promise.resolve({ uuid: 'u3' }),
    })
    await asFamily('B')
    const res = await scan(
      new Request('http://t/scan/u3', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'u3' }) },
    )
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.ownerNickname).toBe('A')
  })

  it('미등록 uuid → 404', async () => {
    await asFamily('C')
    const res = await scan(
      new Request('http://t/scan/missing', { method: 'POST' }),
      { params: Promise.resolve({ uuid: 'missing' }) },
    )
    expect(res.status).toBe(404)
  })

  it('4번째 스캔 시 스페셜 힌트 트리거', async () => {
    for (let i = 1; i <= 4; i++) await seedTreasure(`x${i}`)
    await asFamily('D')
    let last: { data: { family: { specialHintsSeen: number[] } } } | undefined
    for (let i = 1; i <= 4; i++) {
      const r = await scan(
        new Request(`http://t/scan/x${i}`, { method: 'POST' }),
        { params: Promise.resolve({ uuid: `x${i}` }) },
      )
      last = await r.json()
    }
    expect(last!.data.family.specialHintsSeen).toContain(4)
  })

  it('8번째 스캔: 초성 7개 다 채워졌으므로 더 채우지 않음', async () => {
    for (let i = 1; i <= 8; i++) await seedTreasure(`y${i}`)
    await asFamily('E')
    let last:
      | {
          data: {
            family: { treasuresFound: string[]; initialsRevealed: unknown[] }
          }
        }
      | undefined
    for (let i = 1; i <= 8; i++) {
      const r = await scan(
        new Request(`http://t/scan/y${i}`, { method: 'POST' }),
        { params: Promise.resolve({ uuid: `y${i}` }) },
      )
      last = await r.json()
    }
    expect(last!.data.family.treasuresFound).toHaveLength(8)
    expect(last!.data.family.initialsRevealed).toHaveLength(7)
  })
})
