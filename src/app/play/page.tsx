'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFamilyAndGame } from '@/lib/use-family'
import { InitialsBoard } from '@/components/InitialsBoard'
import { DiaryStack } from '@/components/DiaryStack'
import { ProgressLeaderboard } from '@/components/ProgressLeaderboard'
import { SpecialHintCard } from '@/components/SpecialHintCard'
import { AnswerModal } from '@/components/AnswerModal'
import { ScanCTA } from '@/components/ScanCTA'

export default function Play() {
  const { family, game, error } = useFamilyAndGame()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (game?.status === 'finished') router.push('/result')
  }, [game?.status, router])

  if (error) return <main className="p-6 text-red-300">{error}</main>
  if (!family) return <main className="p-6">로딩중...</main>

  const remaining = family.treasuresFound.length - family.attemptsUsed

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-md mx-auto flex flex-col gap-4">
      <header
        className="rounded-2xl p-4 text-center font-bold"
        style={{ background: family.color, color: '#fff' }}
      >
        {family.nickname}{' '}
        <span className="opacity-70 text-sm">
          ({family.treasuresFound.length} 발견)
        </span>
      </header>

      <InitialsBoard family={family} />

      <DiaryStack pagesRead={family.diaryPagesRead} />

      <SpecialHintCard seen={family.specialHintsSeen} />

      <ProgressLeaderboard />

      <p className="text-amber-200/60 text-xs text-center mt-2">
        보물 QR을 휴대폰 카메라로 스캔하면 다음 단계가 열립니다.
      </p>

      <div className="flex flex-col gap-3 mt-2">
        <ScanCTA />
        <button
          onClick={() => setOpen(true)}
          className="px-6 py-4 bg-stone-800 border border-amber-300/40 rounded-2xl font-bold text-amber-100"
        >
          🔍 정답 입력 (남은 {remaining}회)
        </button>
      </div>

      <AnswerModal
        family={family}
        open={open}
        onClose={() => setOpen(false)}
        onWin={() => router.push('/result')}
      />
    </main>
  )
}
