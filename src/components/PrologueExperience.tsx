'use client'
import { useEffect, useRef, useState } from 'react'
import { PROLOGUE } from '@/lib/content'

// 프롤로그 듣기 — 풀스크린 오버레이에서 mp3 재생과 함께 텍스트가 위로 크롤한다.
// 오디오 메타데이터에서 duration 을 읽어 애니메이션과 정확히 sync.
export function PrologueExperience() {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  function start() {
    setOpen(true)
    setDuration(null)
    requestAnimationFrame(() => {
      const a = audioRef.current
      if (!a) return
      a.currentTime = 0
      a.play().catch(() => { /* autoplay 차단되면 사용자가 다시 누름 */ })
    })
  }

  function close() {
    const a = audioRef.current
    if (a) {
      a.pause()
      a.currentTime = 0
    }
    setOpen(false)
  }

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        onClick={start}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-lg transition active:scale-95 shadow-lg bg-amber-100 text-amber-950 hover:bg-amber-200"
      >
        <span className="text-2xl">🎙️</span>
        <span>프롤로그 듣기</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex items-stretch">
          {/* 위/아래 페이드 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent z-10" />

          {/* 텍스트 크롤 */}
          <div className="absolute inset-0 flex justify-center">
            <div
              className="prologue-crawl w-full max-w-2xl px-6 sm:px-10 text-amber-50 leading-loose whitespace-pre-line text-center font-serif"
              style={{
                fontSize: 'clamp(18px, 4vw, 28px)',
                animationDuration: duration ? `${duration}s` : '30s',
              }}
            >
              {'\n\n\n\n'}
              {PROLOGUE}
              {'\n\n\n\n'}
            </div>
          </div>

          {/* 닫기 */}
          <button
            onClick={close}
            className="fixed top-4 right-4 z-20 px-4 py-2 bg-stone-800/80 text-amber-100 rounded-full text-sm font-bold border border-amber-300/30 backdrop-blur"
          >
            ✕ 닫기
          </button>

          <audio
            ref={audioRef}
            src="/audio/prologue.mp3"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || null)}
            onEnded={close}
            preload="auto"
          />
        </div>
      )}

      <style jsx global>{`
        .prologue-crawl {
          transform: translateY(100vh);
          animation-name: prologue-scroll;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
          animation-timing-function: linear;
        }
        @keyframes prologue-scroll {
          from {
            transform: translateY(100vh);
          }
          to {
            transform: translateY(-100%);
          }
        }
      `}</style>
    </>
  )
}
