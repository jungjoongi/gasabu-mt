'use client'
import { useRef, useState } from 'react'

export function AudioPlayer({
  src,
  label = '들려주기',
}: {
  src: string
  label?: string
}) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  return (
    <button
      onClick={() => {
        const a = ref.current
        if (!a) return
        if (a.paused) {
          a.play()
          setPlaying(true)
        } else {
          a.pause()
          setPlaying(false)
        }
      }}
      className="text-sm text-amber-200/80 hover:text-amber-100 inline-flex gap-2 items-center"
    >
      <span>{playing ? '⏸️' : '🔊'}</span> {label}
      <audio
        ref={ref}
        src={src}
        preload="none"
        onEnded={() => setPlaying(false)}
      />
    </button>
  )
}
