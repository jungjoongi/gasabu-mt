'use client'
import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
  src: string
  label?: string
  /** 강조 스타일 (큰 버튼). 일기장/프롤로그 등 정성껏 들려주고 싶을 때 */
  prominent?: boolean
  /** 마운트 즉시 재생 시도 (보물 발견 같은 user-gesture 직후) */
  autoplay?: boolean
}

export function AudioPlayer({
  src,
  label = '들려주기',
  prominent = false,
  autoplay = false,
}: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const triedAutoplayRef = useRef(false)

  useEffect(() => {
    if (!autoplay || triedAutoplayRef.current) return
    const a = ref.current
    if (!a) return
    triedAutoplayRef.current = true
    a.play().then(() => setPlaying(true)).catch(() => {
      // 모바일 브라우저 정책으로 차단된 경우 — 사용자 탭에 의존
    })
  }, [autoplay])

  function toggle() {
    const a = ref.current
    if (!a) return
    if (a.paused) {
      a.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      a.pause()
      setPlaying(false)
    }
  }

  if (prominent) {
    return (
      <button
        onClick={toggle}
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-lg transition active:scale-95 shadow-lg ${
          playing
            ? 'bg-amber-300 text-amber-950 ring-4 ring-amber-300/40'
            : 'bg-amber-100 text-amber-950 hover:bg-amber-200'
        }`}
      >
        <span className={`text-2xl ${playing ? 'animate-pulse' : ''}`}>
          {playing ? '⏸️' : '🔊'}
        </span>
        <span>{playing ? '재생 중...' : label}</span>
        <audio
          ref={ref}
          src={src}
          preload="auto"
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className={`inline-flex gap-2 items-center px-3 py-2 rounded-lg text-sm font-bold transition active:scale-95 ${
        playing
          ? 'bg-amber-300 text-amber-950 ring-2 ring-amber-300/60'
          : 'bg-amber-100/90 text-amber-950 hover:bg-amber-200'
      }`}
    >
      <span className={`text-base ${playing ? 'animate-pulse' : ''}`}>
        {playing ? '⏸️' : '🔊'}
      </span>
      <span>{playing ? '재생 중' : label}</span>
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </button>
  )
}
