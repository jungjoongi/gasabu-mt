'use client'
import { useEffect, useState } from 'react'

const READ_KEY = 'tribe13:readHintCount'

// 운영자가 보낸 공지가 새로 도착하면 모달로 강조 표시.
// 이미 본 공지는 PushedHintsCard 에 누적 표시되고, 모달은 미확인 항목만 노출.
// localStorage 로 "확인 완료" 상태를 디바이스에 보존.
export function HintBroadcastModal({ hints }: { hints: string[] }) {
  const [readCount, setReadCount] = useState<number | null>(null)

  // 첫 마운트: localStorage 로부터 readCount 복원
  useEffect(() => {
    const raw = localStorage.getItem(READ_KEY)
    const stored = raw ? parseInt(raw, 10) : 0
    setReadCount(Number.isFinite(stored) ? stored : 0)
  }, [])

  if (readCount === null) return null
  if (hints.length <= readCount) return null

  const newHints = hints.slice(readCount)

  function dismiss() {
    localStorage.setItem(READ_KEY, String(hints.length))
    setReadCount(hints.length)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-amber-100 text-amber-950 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl border-4 border-amber-400 animate-pulse-once">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📨</span>
          <h3 className="text-xl font-bold">운영자 공지</h3>
        </div>
        <ul className="space-y-3">
          {newHints.map((h, i) => (
            <li key={i} className="text-base leading-relaxed border-l-4 border-amber-700 pl-3 py-1 bg-amber-50 rounded">
              {h}
            </li>
          ))}
        </ul>
        <button
          onClick={dismiss}
          className="px-6 py-3 bg-amber-700 text-amber-50 rounded-xl font-bold text-lg active:scale-95"
        >
          확인했어요
        </button>
      </div>
      <style jsx>{`
        @keyframes pulse-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-once {
          animation: pulse-once 0.6s ease-in-out 2;
        }
      `}</style>
    </div>
  )
}
