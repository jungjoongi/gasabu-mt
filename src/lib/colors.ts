export const FAMILY_COLORS = [
  { name: '빨강', hex: '#dc2626' },
  { name: '주황', hex: '#ea580c' },
  { name: '노랑', hex: '#ca8a04' },
  { name: '초록', hex: '#16a34a' },
  { name: '파랑', hex: '#2563eb' },
  { name: '남색', hex: '#1e40af' },
  { name: '보라', hex: '#7c3aed' },
  { name: '갈색', hex: '#78350f' },
] as const

export type FamilyColor = (typeof FAMILY_COLORS)[number]

export function pickUnusedColor(used: string[]): string | null {
  const remaining = FAMILY_COLORS.filter((c) => !used.includes(c.hex))
  return remaining[0]?.hex ?? null
}
