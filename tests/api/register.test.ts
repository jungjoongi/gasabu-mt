import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => {
  const store = new Map<string, string>()
  return {
    cookies: async () => ({
      get: (name: string) => ({ value: store.get(name) }),
      set: (name: string, value: string) => { store.set(name, value) },
      delete: (name: string) => { store.delete(name) },
    }),
  }
})

import { POST } from '@/app/api/family/register/route'

function req(body: unknown): Request {
  return new Request('http://test/api/family/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/family/register', () => {
  it('신규 닉네임 등록 → 200 + family', async () => {
    const res = await POST(req({ nickname: '김씨네' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.data.nickname).toBe('김씨네')
  })

  it('빈 닉네임 → 400', async () => {
    const res = await POST(req({ nickname: '   ' }))
    expect(res.status).toBe(400)
  })

  it('동일 닉네임 재등록 → 같은 familyId 복원', async () => {
    const a = await (await POST(req({ nickname: '박씨네' }))).json()
    const b = await (await POST(req({ nickname: '박씨네' }))).json()
    expect(a.data.id).toBe(b.data.id)
  })

  it('가족 수 제한 없음 — 12번째 등록도 200', async () => {
    for (let i = 0; i < 12; i++) {
      const res = await POST(req({ nickname: `f${i}` }))
      expect(res.status).toBe(200)
    }
  })
})
