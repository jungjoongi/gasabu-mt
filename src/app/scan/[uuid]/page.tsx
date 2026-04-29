import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getCurrentFamily } from '@/lib/auth'
import { claimTreasure } from '@/lib/treasure'
import { saveFamily, getFamily } from '@/lib/family'
import { fillNextRandom } from '@/lib/initials'
import { SPECIAL_HINTS, DIARY_PAGES } from '@/lib/content'
import { DiaryAutoPlayCard } from '@/components/DiaryAutoPlayCard'

interface BannerSpec {
  tone: 'ok' | 'warn' | 'err'
  title: string
  body: ReactNode
}

/**
 * QR 진입 페이지 (server component).
 * 진입과 동시에 보물을 atomic claim 하고, 결과/일기장 페이지를 인라인 렌더한다.
 *
 * 주의: API 라우트(POST /api/scan/[uuid]) 와 로직 중복. QR 즉시 처리를 위해 의도적.
 */
export default async function ScanPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = await params
  const family = await getCurrentFamily()
  if (!family) redirect('/')

  const claim = await claimTreasure(uuid, family.id)

  let banner: BannerSpec
  let updatedFamily = family

  if (claim.outcome === 'unknown') {
    banner = {
      tone: 'err',
      title: '알 수 없는 보물',
      body: '이 QR은 게임에 등록되지 않았습니다.',
    }
  } else if (claim.outcome === 'already-by-self') {
    banner = {
      tone: 'warn',
      title: '이미 등록한 보물',
      body: '같은 보물을 다시 등록할 수 없습니다.',
    }
  } else if (claim.outcome === 'already-by-other') {
    const owner = await getFamily(claim.byFamilyId)
    banner = {
      tone: 'warn',
      title: '이미 발견된 보물',
      body: `${owner?.nickname ?? '다른'} 가족이 먼저 찾았습니다.`,
    }
  } else {
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
    updatedFamily = family
    const idx = Math.min(count - 1, 6)
    const page = DIARY_PAGES[idx]
    banner = {
      tone: 'ok',
      title: `보물을 찾았습니다! (${count}/7+)`,
      body: <DiaryAutoPlayCard index={idx} title={page.title} body={page.body} />,
    }
  }

  const tonClass =
    banner.tone === 'ok'
      ? 'border-green-500/40 bg-green-950/40'
      : banner.tone === 'warn'
        ? 'border-amber-500/40 bg-amber-950/40'
        : 'border-red-500/40 bg-red-950/40'

  return (
    <main className="min-h-screen p-6 flex flex-col gap-6 max-w-md mx-auto">
      <div className={`rounded-2xl p-5 border ${tonClass}`}>
        <h2 className="text-xl font-bold mb-2">{banner.title}</h2>
        <div>{banner.body}</div>
        {claim.outcome === 'claimed' && (
          <p className="text-amber-300 mt-4 text-sm">
            힌트가 한 글자 채워졌습니다.
            {updatedFamily.specialHintsSeen.includes(
              updatedFamily.treasuresFound.length,
            ) && (
              <span className="block mt-2 text-amber-200">
                🏆 스페셜 힌트:{' '}
                {SPECIAL_HINTS[updatedFamily.treasuresFound.length]}
              </span>
            )}
          </p>
        )}
      </div>
      <Link
        href="/play"
        className="text-center px-6 py-4 bg-amber-100 text-amber-950 rounded-xl font-bold"
      >
        메인으로
      </Link>
    </main>
  )
}
