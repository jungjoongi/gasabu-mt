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

// 안정적인 닉네임 → HSL 해시. 추가 가족용 색 자동 생성.
function hashColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const hue = h % 360
  return `hsl(${hue}, 65%, 45%)`
}

export function pickUnusedColor(used: string[], seed?: string): string {
  const remaining = FAMILY_COLORS.filter((c) => !used.includes(c.hex))
  if (remaining[0]) return remaining[0].hex
  // 9번째 이상 가족은 닉네임 해시 기반 색
  return hashColor(seed ?? Math.random().toString(36))
}
