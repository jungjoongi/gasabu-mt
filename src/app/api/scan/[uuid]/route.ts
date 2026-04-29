import { NextResponse } from 'next/server'
import { getCurrentFamily } from '@/lib/auth'
import { claimTreasure } from '@/lib/treasure'
import { saveFamily, getFamily } from '@/lib/family'
import { fillNextRandom } from '@/lib/initials'

interface Ctx {
  params: Promise<{ uuid: string }>
}

export async function POST(_req: Request, ctx: Ctx) {
  const { uuid } = await ctx.params
  const family = await getCurrentFamily()
  if (!family) {
    return NextResponse.json(
      { ok: false, error: '로그인 필요' },
      { status: 401 },
    )
  }

  const claim = await claimTreasure(uuid, family.id)

  if (claim.outcome === 'unknown') {
    return NextResponse.json(
      { ok: false, error: '알 수 없는 보물입니다' },
      { status: 404 },
    )
  }
  if (claim.outcome === 'already-by-self') {
    return NextResponse.json(
      { ok: false, error: '이미 등록한 보물입니다' },
      { status: 409 },
    )
  }
  if (claim.outcome === 'already-by-other') {
    const owner = await getFamily(claim.byFamilyId)
    return NextResponse.json(
      {
        ok: false,
        error: `이 보물은 ${owner?.nickname ?? '다른'} 가족이 이미 발견했습니다`,
        ownerNickname: owner?.nickname,
      },
      { status: 409 },
    )
  }

  // claimed — update family progress
  family.treasuresFound.push(uuid)
  family.diaryPagesRead = Math.min(family.treasuresFound.length, 7)
  const next = fillNextRandom(family.initialsRevealed)
  if (next) family.initialsRevealed.push(next)
  const count = family.treasuresFound.length
  if (
    (count === 4 || count === 7) &&
    !family.specialHintsSeen.includes(count)
  ) {
    family.specialHintsSeen.push(count)
  }
  await saveFamily(family)

  return NextResponse.json({ ok: true, data: { family } })
}
