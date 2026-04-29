'use client'
import { useEffect, useRef, useState } from 'react'
import { PROLOGUE } from '@/lib/content'

// 프롤로그 듣기 — 풀스크린 양피지 시네마틱 크롤.
// 화면 중앙쯤에서 시작해 위로 올라가며, mp3 길이에 맞춰 종료.
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
      a.play().catch(() => {})
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
        <div className="fixed inset-0 z-[100] overflow-hidden cinematic-bg">
          {/* 위/아래 페이드 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-stone-950 via-stone-950/80 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent z-10" />

          {/* 텍스트 크롤 */}
          <div className="absolute inset-0 flex justify-center">
            <div
              className="prologue-crawl w-full max-w-2xl px-6 sm:px-10"
              style={{ animationDuration: duration ? `${duration}s` : '32s' }}
            >
              <div className="prologue-text whitespace-pre-line text-center font-serif">
                {PROLOGUE}
              </div>
            </div>
          </div>

          <button
            onClick={close}
            className="fixed top-4 right-4 z-20 px-4 py-2 bg-stone-900/70 text-amber-100 rounded-full text-sm font-bold border border-amber-300/40 backdrop-blur active:scale-95"
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
        .cinematic-bg {
          background:
            radial-gradient(ellipse at top, rgba(180, 120, 50, 0.15), transparent 60%),
            radial-gradient(ellipse at bottom, rgba(200, 150, 80, 0.08), transparent 70%),
            #0c0907;
        }

        .prologue-crawl {
          /* 화면 약 40% 지점에서 시작 — 즉시 가독 가능 */
          transform: translateY(40vh);
          animation-name: prologue-scroll;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
          animation-timing-function: linear;
        }
        @keyframes prologue-scroll {
          from {
            transform: translateY(40vh);
          }
          to {
            transform: translateY(-110%);
          }
        }

        .prologue-text {
          color: #f5e6c8;
          font-size: clamp(20px, 4.5vw, 30px);
          line-height: 1.8;
          letter-spacing: 0.01em;
          text-shadow:
            0 0 18px rgba(255, 200, 130, 0.35),
            0 2px 6px rgba(0, 0, 0, 0.7);
          word-break: keep-all;
        }

        /* 단락 사이 여유 */
        .prologue-text br + br {
          line-height: 2.5;
        }

        @media (prefers-reduced-motion: reduce) {
          .prologue-crawl {
            animation: none;
            transform: translateY(0);
            overflow-y: auto;
            max-height: 100vh;
          }
        }
      `}</style>
    </>
  )
}
