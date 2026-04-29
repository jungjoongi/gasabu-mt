'use client'
import { useEffect, useRef, useState } from 'react'
import { PROLOGUE } from '@/lib/content'

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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-stone-950 via-stone-950/80 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent z-10" />
          <div className="absolute inset-0 flex justify-center">
            <div
              className="cinematic-crawl w-full max-w-2xl px-6 sm:px-10"
              style={{ animationDuration: duration ? `${duration}s` : '32s' }}
            >
              <div className="cinematic-text whitespace-pre-line text-center font-serif">
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
    </>
  )
}
