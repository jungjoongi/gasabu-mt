'use client'
import { useEffect, useRef, useState } from 'react'
import { CLIMAX_SCRIPT } from '@/lib/content'
import type { GameState } from '@/types'
import { ClimaxCrawl } from '@/components/ClimaxExperience'

const POLL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 3000)

/**
 * 게임 종료 화면.
 *
 * phase 흐름:
 *   waiting → 게임 미종료. 폴링.
 *   crawl   → 풀스크린 크롤 + climax.mp3 1회 자동 재생.
 *   summary → 결과 정리 + ending.mp3 BGM 1회 재생 (loop 없음).
 */
export default function ResultPage() {
  const [game, setGame] = useState<GameState | null>(null)
  // waiting: 게임 진행 중
  // ready:   game finished, 사용자 탭 대기 (브라우저 autoplay 정책 우회)
  // crawl:   풀스크린 크롤 + climax.mp3
  // summary: 결과 정리 + BGM
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'crawl' | 'summary'>(
    'waiting',
  )
  const endingRef = useRef<HTMLAudioElement>(null)

  // 게임 상태 폴링 + finished 감지 시 즉시 crawl phase 전환
  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const r = await fetch('/api/game/state', { cache: 'no-store' })
        const json = await r.json()
        if (!alive) return
        if (!json.ok) return
        const next = json.data as GameState
        setGame(next)
        if (next.status === 'finished') {
          // waiting → ready (탭 대기). 사용자가 탭해야 crawl 진입.
          setPhase((p) => (p === 'waiting' ? 'ready' : p))
        }
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

  // ── ready phase: 사용자 탭 게이트 (브라우저 autoplay 정책 우회) ──
  if (phase === 'ready') {
    return (
      <main className="min-h-screen p-6 flex flex-col items-center justify-center gap-8 text-center cinematic-bg">
        <div className="text-7xl animate-pulse">🎉</div>
        <h1 className="text-3xl font-bold text-amber-100">게임 종료!</h1>
        <p className="text-amber-200 text-xl">
          <span className="font-bold">{nickname}</span> 가족이 음해자를 찾았습니다
        </p>
        <button
          onClick={() => setPhase('crawl')}
          className="px-8 py-5 bg-amber-100 text-amber-950 rounded-2xl font-bold text-xl shadow-2xl active:scale-95 transition flex items-center gap-3"
        >
          <span className="text-2xl">🎬</span>
          <span>시네마틱 시청 시작</span>
        </button>
        <p className="text-amber-200/60 text-xs">
          탭하여 음성 낭독과 함께 결말을 확인하세요
        </p>
      </main>
    )
  }

  return (
    <>
      {phase === 'crawl' && (
        <ClimaxCrawl
          winnerNickname={nickname}
          onCrawlEnd={() => {
            setPhase('summary')
            requestAnimationFrame(() => {
              endingRef.current?.play().catch(() => {})
            })
          }}
        />
      )}

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
        {phase === 'summary' && (
          <button
            onClick={() => {
              const a = endingRef.current
              if (!a) return
              if (a.paused) a.play().catch(() => {})
              else a.pause()
            }}
            className="px-4 py-2 bg-amber-100 text-amber-950 rounded-xl text-sm font-bold"
          >
            🎵 BGM 재생/정지
          </button>
        )}
      </main>

      <audio ref={endingRef} src="/audio/ending.mp3" preload="auto" />
    </>
  )
}
