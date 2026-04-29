'use client'
import { useEffect, useRef, useState } from 'react'

const CLIMAX_TEXT = (nickname: string) => `${nickname} 가족이 음해자의 이름을 불렀다.

그의 이름은 — 하만.

100세대 동안 잠겨 있던
13지파의 이름이
오늘 다시 빛 가운데 부른다.

우리가 여기 있다.

—

(다 함께 에스더 3:6 낭독)

"하만이 모르드개의 민족을
다 멸하고자 하더라."

—

그러나 그는 자신이 만든 장대에
자신이 매달렸고,
우리는 살아남았다.

13지파의 후예들이여 —
다시 부르자.

우리가 여기 있다!`

interface Props {
  winnerNickname: string
  /** 크롤 종료 (climax 끝났을 때) 호출됨 */
  onCrawlEnd: () => void
}

// 우승 즉시 풀스크린 시네마틱 크롤 + climax.mp3 1회 재생.
// 끝나면 onCrawlEnd 호출하여 부모가 다음 단계 (summary + BGM) 로 전환.
export function ClimaxCrawl({ winnerNickname, onCrawlEnd }: Props) {
  const [duration, setDuration] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const startedRef = useRef(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    requestAnimationFrame(() => {
      audioRef.current?.play().catch(() => {})
    })
  }, [])

  function finish() {
    if (closed) return
    setClosed(true)
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    onCrawlEnd()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (closed) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden cinematic-bg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-stone-950 via-stone-950/80 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent z-10" />
      <div className="absolute inset-0 flex justify-center">
        <div
          className="cinematic-crawl w-full max-w-2xl px-6 sm:px-10"
          style={{ animationDuration: duration ? `${duration}s` : '24s' }}
        >
          <div className="cinematic-text whitespace-pre-line text-center font-serif">
            {CLIMAX_TEXT(winnerNickname)}
          </div>
        </div>
      </div>
      <button
        onClick={finish}
        className="fixed top-4 right-4 z-20 px-4 py-2 bg-stone-900/70 text-amber-100 rounded-full text-sm font-bold border border-amber-300/40 backdrop-blur active:scale-95"
      >
        ✕ 건너뛰기
      </button>
      <audio
        ref={audioRef}
        src="/audio/climax.mp3"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || null)}
        onEnded={finish}
        preload="auto"
      />
    </div>
  )
}
