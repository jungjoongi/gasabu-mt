'use client'
import { useState } from 'react'

/**
 * 운영자 페이지 — 비밀번호 헤더 기반 admin API 호출.
 * - 게임 시작 / 전체 리셋 / 가족별 힌트 푸시.
 */
export default function AdminPage() {
  const [pwd, setPwd] = useState('')
  const [log, setLog] = useState<string[]>([])

  async function call(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-password': pwd,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await res.json().catch(() => ({ ok: false, error: 'invalid json' }))
    setLog((l) => [
      `[${new Date().toLocaleTimeString()}] ${path} → ${JSON.stringify(json)}`,
      ...l,
    ])
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto flex flex-col gap-4">
      <h2 className="text-xl font-bold">운영자 페이지</h2>
      <input
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        type="password"
        placeholder="관리자 비밀번호"
        className="px-3 py-2 rounded-lg bg-amber-50 text-amber-950"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => call('/api/admin/start-game')}
          className="bg-green-700 rounded-lg p-3 font-bold"
        >
          게임 시작
        </button>
        <button
          onClick={() => {
            if (confirm('정말 모든 데이터를 지웁니까?'))
              call('/api/admin/reset-game')
          }}
          className="bg-red-700 rounded-lg p-3 font-bold"
        >
          전체 리셋
        </button>
      </div>
      <PushHintForm
        onSubmit={(nickname, hint) =>
          call('/api/admin/push-hint', { nickname, hint })
        }
      />
      <pre className="bg-stone-900 text-xs rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">
        {log.join('\n')}
      </pre>
    </main>
  )
}

function PushHintForm({
  onSubmit,
}: {
  onSubmit: (nickname: string, hint: string) => void
}) {
  const [n, setN] = useState('')
  const [h, setH] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(n, h)
        setH('')
      }}
      className="flex flex-col gap-2 border border-amber-700/40 rounded-lg p-3"
    >
      <h3 className="text-sm font-bold">힌트 푸시</h3>
      <input
        value={n}
        onChange={(e) => setN(e.target.value)}
        placeholder="가족 닉네임"
        className="px-2 py-1 rounded bg-amber-50 text-amber-950"
      />
      <input
        value={h}
        onChange={(e) => setH(e.target.value)}
        placeholder="힌트 본문"
        className="px-2 py-1 rounded bg-amber-50 text-amber-950"
      />
      <button
        type="submit"
        className="bg-amber-200 text-amber-950 rounded p-2 text-sm font-bold"
      >
        전송
      </button>
    </form>
  )
}
