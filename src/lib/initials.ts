export const CORRECT_INITIALS = ['ㅇ', 'ㅅ', 'ㄷ', 'ㅅ', 'ㅈ', 'ㅇ', 'ㅈ'] as const

export interface RevealedSlot {
  position: number
  char: string
}

export function fillNextRandom(filled: RevealedSlot[]): RevealedSlot | null {
  const filledPositions = new Set(filled.map(f => f.position))
  const unfilled = [0, 1, 2, 3, 4, 5, 6].filter(p => !filledPositions.has(p))
  if (unfilled.length === 0) return null
  const pick = unfilled[Math.floor(Math.random() * unfilled.length)]
  return { position: pick, char: CORRECT_INITIALS[pick] }
}

export function isComplete(filled: RevealedSlot[]): boolean {
  return filled.length >= 7
}
