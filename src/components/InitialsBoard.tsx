import type { Family } from '@/types'

export function InitialsBoard({ family }: { family: Family }) {
  const slots = Array.from({ length: 7 }, (_, i) => {
    const found = family.initialsRevealed.find(r => r.position === i)
    return found?.char ?? null
  })
  return (
    <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40">
      <h3 className="text-amber-200/80 text-sm tracking-widest mb-3">🔮 음해자의 흔적</h3>
      <div className="flex justify-center gap-2 sm:gap-3">
        {slots.map((c, i) => (
          <div
            key={i}
            className={`w-10 h-12 sm:w-12 sm:h-14 flex items-center justify-center rounded-lg text-2xl font-bold ${
              c ? 'bg-amber-100 text-amber-950' : 'bg-stone-800 text-stone-600'
            }`}
          >
            {c ?? '·'}
          </div>
        ))}
      </div>
    </section>
  )
}
