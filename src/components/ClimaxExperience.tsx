'use client'
import { useEffect, useRef, useState } from 'react'

// 우승 발표 시 자동 재생되는 시네마틱 클라이맥스.
// 우승 가족 닉네임이 텍스트 첫줄에 들어가고, climax.mp3 1회 + 끝나면 ending.mp3 BGM 재생.
const CLIMAX_TEMPLATE = `{nickname} 가족이 음해자의 이름을 불렀다.

그의 이름은 — 하만.

100세대 동안 잠겨 있던 13지파의 이름이
오늘 다시 빛 가운데 부른다.

우리가 여기 있다.

—

(다 함께 에스더 3:6 낭독)

"하만이 모르드개의 민족을 다 멸하고자 하더라."

—

그러나 그는 자신이 만든 장대에 자신이 매달렸고,
우리는 살아남았다.

13지파의 후예들이여 — 다시 부르자.

우리가 여기 있다!`

export function ClimaxExperience({ winnerNickname }: { winnerNickname: string }) {
  const [showCrawl, setShowCrawl] = useState(true)
  const [duration, setDuration] = useState<number | null>(null)
  const climaxRef = useRef<HTMLAudioElement>(null)
  const endingRef = useRef<HTMLAudioElement>(null)
  const startedRef = useRef(false)

  // climax.mp3 자동 1회 재생 시작
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    requestAnimationFrame(() => {
      climaxRef.current?.play().catch(() => {})
    })
  }, [])

  function closeCrawl() {
    climaxRef.current?.pause()
    setShowCrawl(false)
  }

  // ESC 로 닫기 (BGM 은 그대로)
  useEffect(() => {
    if (!showCrawl) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCrawl()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCrawl])

  const text = CLIMAX_TEMPLATE.replace('{nickname}', winnerNickname || '우승')

  return (
    <>
      {showCrawl && (
        <div className="fixed inset-0 z-[100] overflow-hidden cinematic-bg">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-stone-950 via-stone-950/80 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent z-10" />

          <div className="absolute inset-0 flex justify-center">
            <div
              className="prologue-crawl w-full max-w-2xl px-6 sm:px-10"
              style={{ animationDuration: duration ? `${duration}s` : '24s' }}
            >
              <div className="prologue-text whitespace-pre-line text-center font-serif">
                {text}
              </div>
            </div>
          </div>

          <button
            onClick={closeCrawl}
            className="fixed top-4 right-4 z-20 px-4 py-2 bg-stone-900/70 text-amber-100 rounded-full text-sm font-bold border border-amber-300/40 backdrop-blur active:scale-95"
          >
            ✕ 닫기
          </button>
        </div>
      )}

      <audio
        ref={climaxRef}
        src="/audio/climax.mp3"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || null)}
        onEnded={() => {
          // 낭독 종료 → BGM 자동 재생, 크롤도 종료
          endingRef.current?.play().catch(() => {})
          setShowCrawl(false)
        }}
        preload="auto"
      />
      <audio ref={endingRef} src="/audio/ending.mp3" preload="auto" loop />
    </>
  )
}
