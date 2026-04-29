import { SPECIAL_HINTS } from '@/lib/content'

export function SpecialHintCard({ seen }: { seen: number[] }) {
  if (seen.length === 0) return null
  return (
    <section className="bg-amber-100/10 border border-amber-300/40 rounded-2xl p-5">
      <h3 className="text-amber-200 text-sm tracking-widest mb-3">🏆 스페셜 힌트</h3>
      <ul className="space-y-2 text-amber-50">
        {seen.map(n => (
          <li key={n} className="text-sm leading-relaxed">
            <span className="text-amber-300/80 mr-2">#{n}</span>
            {SPECIAL_HINTS[n]}
          </li>
        ))}
      </ul>
    </section>
  )
}
