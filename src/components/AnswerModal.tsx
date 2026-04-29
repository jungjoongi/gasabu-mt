'use client'
import { useState } from 'react'
import type { Family } from '@/types'

export function AnswerModal({
  family, open, onClose, onWin,
}: { family: Family; open: boolean; onClose: () => void; onWin: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const remaining = family.treasuresFound.length - family.attemptsUsed

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const res = await fetch('/api/answer', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answer: value }),
    })
    const json = await res.json()
    setBusy(false)
    if (!json.ok) { setError(json.error); return }
    if (json.data.won) { onWin(); return }
    if (json.data.tooLate) { setError(`이미 ${json.data.winnerNickname} 가족이 먼저 찾았습니다`); return }
    if (json.data.wrong) {
      setError(`아직 아닙니다. 보물을 더 찾아 단서를 모으세요. (남은 시도: ${json.data.attemptsRemaining})`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-stone-900 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4 border border-amber-700/40">
        <div>
          <h3 className="text-xl font-bold">🔍 정답 입력</h3>
          <p className="text-amber-200/60 text-sm mt-1">
            이건 힌트입니다 — 음해자의 이름을 적어주세요.
          </p>
          <p className="text-amber-300 text-sm mt-2">남은 시도 {remaining}회</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            disabled={remaining === 0 || busy}
            placeholder="이름을 입력하세요"
            className="px-4 py-3 rounded-xl bg-amber-50 text-amber-950 text-lg disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={remaining === 0 || busy || !value.trim()}
            className="px-6 py-3 bg-amber-100 text-amber-950 font-bold rounded-xl disabled:opacity-50"
          >
            {busy ? '확인 중...' : '제출'}
          </button>
          {error && <p className="text-red-300 text-sm">{error}</p>}
          <button type="button" onClick={onClose} className="text-amber-200/60 text-sm">닫기</button>
        </form>
      </div>
    </div>
  )
}
