import { describe, it, expect } from 'vitest'
import { CORRECT_INITIALS, fillNextRandom, isComplete } from '@/lib/initials'

describe('initials', () => {
  it('정답표는 ㅇㅅㄷㅅㅈㅇㅈ 7글자', () => {
    expect(CORRECT_INITIALS).toEqual(['ㅇ', 'ㅅ', 'ㄷ', 'ㅅ', 'ㅈ', 'ㅇ', 'ㅈ'])
    expect(CORRECT_INITIALS).toHaveLength(7)
  })

  it('빈 보드에서 fill하면 1칸 채워짐', () => {
    const next = fillNextRandom([])
    expect(next).not.toBeNull()
    expect(next!.position).toBeGreaterThanOrEqual(0)
    expect(next!.position).toBeLessThanOrEqual(6)
    expect(next!.char).toBe(CORRECT_INITIALS[next!.position])
  })

  it('이미 채워진 자리는 다시 안 뽑힘', () => {
    const filled = [0, 1, 2, 3, 4, 5].map(p => ({ position: p, char: CORRECT_INITIALS[p] }))
    const next = fillNextRandom(filled)
    expect(next!.position).toBe(6)
  })

  it('7칸 다 차면 null 반환', () => {
    const filled = [0, 1, 2, 3, 4, 5, 6].map(p => ({ position: p, char: CORRECT_INITIALS[p] }))
    expect(fillNextRandom(filled)).toBeNull()
    expect(isComplete(filled)).toBe(true)
  })

  it('isComplete: 7개 미만은 false', () => {
    expect(isComplete([])).toBe(false)
    expect(isComplete([{ position: 0, char: 'ㅇ' }])).toBe(false)
  })
})
