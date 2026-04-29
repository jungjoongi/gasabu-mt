'use client'
import { useEffect, useState } from 'react'
import type { FamilyProgressRow } from '@/types'

const POLL = Number(process.env.NEXT_PUBLIC_PROGRESS_POLL_INTERVAL_MS ?? 5000)

export function ProgressLeaderboard() {
  const [rows, setRows] = useState<FamilyProgressRow[]>([])
  useEffect(() => {
    let alive = true
    async function tick() {
      const res = await fetch('/api/families/progress')
      const json = await res.json()
      if (alive && json.ok) setRows(json.data)
    }
    tick()
    const id = setInterval(tick, POLL)
    return () => { alive = false; clearInterval(id) }
  }, [])
  if (rows.length === 0) return null
  const max = Math.max(7, ...rows.map(r => r.count))
  return (
    <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40">
      <h3 className="text-amber-200/80 text-sm tracking-widest mb-3">🏁 다른 가족 진행도</h3>
      <ul className="space-y-2">
        {rows.map(r => (
          <li key={r.nickname} className="flex items-center gap-3 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
            <span className={`flex-1 truncate ${r.isMe ? 'font-bold' : ''}`}>
              {r.nickname}{r.isMe && ' (나)'}
            </span>
            <div className="w-24 h-2 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-300" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            <span className="w-6 text-right tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
