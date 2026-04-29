'use client'
import { useEffect, useState } from 'react'
import { CLIMAX_SCRIPT } from '@/lib/content'
import type { GameState } from '@/types'
import { ClimaxExperience } from '@/components/ClimaxExperience'

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 3000)

/**
 * 게임 종료(클라이맥스) 화면.
 *
 * 진입 시점에 game.status === 'finished' 가 되면 ClimaxExperience 가 마운트되어
 * 풀스크린 크롤 + climax.mp3 자동 재생 → 종료 후 ending.mp3 BGM 자동 이어 재생.
 */
export default function ResultPage() {
  const [game, setGame] = useState<GameState | null>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const r = await fetch('/api/game/state', { cache: 'no-store' })
        const json = await r.json()
        if (!alive) return
        if (json.ok) setGame(json.data as GameState)
      } catch {
        /* noop */
      }
    }
    tick()
    const id = setInterval(tick, POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (!game || game.status !== 'finished') {
    return (
      <main className="p-6 text-center text-amber-100 min-h-screen flex items-center justify-center">
        게임이 아직 끝나지 않았습니다.
      </main>
    )
  }

  const nickname = game.winnerNickname ?? '우승'

  return (
    <>
      <ClimaxExperience winnerNickname={nickname} />
      <main className="min-h-screen p-6 flex flex-col items-center justify-center gap-6 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-3xl font-bold">게임 종료!</h1>
        <p className="text-amber-200 text-xl">
          <span className="font-bold">{nickname}</span> 가족이 음해자를 찾았습니다
        </p>
        <div className="bg-amber-950/60 border border-amber-300/40 rounded-2xl p-6 max-w-md">
          <p className="text-amber-100 text-2xl font-bold">하만</p>
          <p className="text-amber-200/70 mt-2">에스더 3장 6절</p>
          <p className="text-amber-100 mt-3 italic">
            &ldquo;하만이 모르드개의 민족을 다 멸하고자 하더라&rdquo;
          </p>
        </div>
        <p className="text-amber-200">거실로 모이세요</p>
        <details className="text-amber-200/80 text-sm max-w-md">
          <summary className="cursor-pointer">클라이맥스 낭독 텍스트</summary>
          <p className="whitespace-pre-line mt-3 leading-relaxed">
            {CLIMAX_SCRIPT.replace('{nickname}', nickname)}
          </p>
        </details>
      </main>
    </>
  )
}
