import { describe, it, expect } from 'vitest'
import {
  registerFamily,
  getFamilyByNickname,
  listAllFamilies,
} from '@/lib/family'

describe('family', () => {
  it('신규 닉네임 등록 시 familyId, color 발급', async () => {
    const f = await registerFamily('김씨네')
    expect(f.id).toBeTruthy()
    expect(f.nickname).toBe('김씨네')
    expect(f.color).toMatch(/^(#[0-9a-f]{6}|hsl\(.+\))$/i)
    expect(f.treasuresFound).toEqual([])
    expect(f.initialsRevealed).toEqual([])
    expect(f.attemptsUsed).toBe(0)
  })

  it('동일 닉네임 재등록 시 기존 familyId 반환', async () => {
    const a = await registerFamily('박씨네')
    const b = await registerFamily('박씨네')
    expect(a.id).toBe(b.id)
    expect(a.color).toBe(b.color)
  })

  it('가족 수 제한 없음 — 9번째 이상도 자유롭게 등록', async () => {
    for (let i = 0; i < 12; i++) await registerFamily(`가족${i}`)
    const all = await listAllFamilies()
    expect(all.length).toBe(12)
  })

  it('처음 8가족은 미리 정의된 색상 모두 다르게', async () => {
    const colors = new Set<string>()
    for (let i = 0; i < 8; i++) {
      const f = await registerFamily(`가족${i}`)
      colors.add(f.color)
    }
    expect(colors.size).toBe(8)
  })

  it('listAllFamilies 는 등록된 가족 모두 반환', async () => {
    await registerFamily('A')
    await registerFamily('B')
    const all = await listAllFamilies()
    expect(all.map((f) => f.nickname).sort()).toEqual(['A', 'B'])
  })

  it('getFamilyByNickname 미등록 시 null', async () => {
    expect(await getFamilyByNickname('없음')).toBeNull()
  })
})
