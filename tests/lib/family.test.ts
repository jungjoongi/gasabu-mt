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
    expect(f.color).toMatch(/^#[0-9a-f]{6}$/i)
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

  it('8가족까지만 등록 가능', async () => {
    for (let i = 0; i < 8; i++) await registerFamily(`가족${i}`)
    await expect(registerFamily('가족9')).rejects.toThrow(/8가족/)
  })

  it('등록한 가족은 색상이 모두 다름', async () => {
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
