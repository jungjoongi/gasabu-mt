'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch('/api/family/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    const json = await res.json()
    if (!json.ok) {
      setError(json.error)
      setLoading(false)
      return
    }
    router.push('/play')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h2 className="text-2xl font-bold">우리 가족 이름</h2>
      <p className="text-amber-200/70 text-sm text-center">
        기존 가족이라면 같은 이름으로 다시 입장할 수 있습니다.
      </p>
      <form onSubmit={submit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="예: 김씨네"
          maxLength={20}
          className="px-4 py-3 rounded-xl bg-amber-50 text-amber-950 text-lg"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-4 bg-amber-100 text-amber-950 rounded-xl font-bold disabled:opacity-50"
        >
          {loading ? '등록 중...' : '입장하기'}
        </button>
        {error && <p className="text-red-300 text-sm text-center">{error}</p>}
      </form>
    </main>
  )
}
