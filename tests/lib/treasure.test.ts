import { describe, it, expect } from 'vitest'
import { seedTreasure, claimTreasure, getTreasure } from '@/lib/treasure'

describe('treasure', () => {
  it('seed 후 미발견 상태로 조회됨', async () => {
    await seedTreasure('uuid-1')
    const t = await getTreasure('uuid-1')
    expect(t).toEqual({ uuid: 'uuid-1' })
  })

  it('claim 성공 시 claimedByFamilyId 기록', async () => {
    await seedTreasure('uuid-2')
    const result = await claimTreasure('uuid-2', 'fam-A')
    expect(result.outcome).toBe('claimed')
    const t = await getTreasure('uuid-2')
    expect(t!.claimedByFamilyId).toBe('fam-A')
    expect(t!.claimedAt).toBeGreaterThan(0)
  })

  it('이미 자기가 claim한 보물 재시도 → already-by-self', async () => {
    await seedTreasure('uuid-3')
    await claimTreasure('uuid-3', 'fam-A')
    const result = await claimTreasure('uuid-3', 'fam-A')
    expect(result.outcome).toBe('already-by-self')
  })

  it('다른 가족이 claim한 보물 → already-by-other', async () => {
    await seedTreasure('uuid-4')
    await claimTreasure('uuid-4', 'fam-A')
    const result = await claimTreasure('uuid-4', 'fam-B')
    expect(result.outcome).toBe('already-by-other')
    if (result.outcome === 'already-by-other') {
      expect(result.byFamilyId).toBe('fam-A')
    }
  })

  it('seed 안 된 uuid → unknown', async () => {
    const result = await claimTreasure('does-not-exist', 'fam-A')
    expect(result.outcome).toBe('unknown')
  })
})
