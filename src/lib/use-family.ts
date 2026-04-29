'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Family, GameState } from '@/types'

const POLL = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 3000)

// 세션이 만료(가족 데이터 사라짐 → 401)되면 메인으로 강제 이동.
// /admin 등은 이 훅을 쓰지 않으므로 영향 없음.
export function useFamilyAndGame() {
  const router = useRouter()
  const [family, setFamily] = useState<Family | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function tick() {
      try {
        const [fRes, gRes] = await Promise.all([
          fetch('/api/family/state', { cache: 'no-store' }),
          fetch('/api/game/state', { cache: 'no-store' }),
        ])
        if (!alive) return

        if (fRes.status === 401) {
          alive = false
          router.replace('/')
          return
        }

        const f = await fRes.json()
        const g = await gRes.json()
        if (!alive) return
        if (f.ok) setFamily(f.data)
        else setError(f.error)
        if (g.ok) setGame(g.data)
      } catch (e) {
        if (alive) setError(String(e))
      }
    }

    tick()
    const id = setInterval(tick, POLL)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [router])

  return { family, game, error }
}
