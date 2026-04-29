'use client'
import { useEffect, useState } from 'react'
import type { Family, GameState } from '@/types'

const POLL = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 3000)

export function useFamilyAndGame() {
  const [family, setFamily] = useState<Family | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function tick() {
      try {
        const [fRes, gRes] = await Promise.all([
          fetch('/api/family/state'),
          fetch('/api/game/state'),
        ])
        const f = await fRes.json()
        const g = await gRes.json()
        if (!alive) return
        if (f.ok) setFamily(f.data); else setError(f.error)
        if (g.ok) setGame(g.data)
      } catch (e) {
        if (alive) setError(String(e))
      }
    }
    tick()
    const id = setInterval(tick, POLL)
    return () => { alive = false; clearInterval(id) }
  }, [])
  return { family, game, error }
}
