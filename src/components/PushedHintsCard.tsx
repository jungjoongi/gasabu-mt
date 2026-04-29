// 운영자가 /admin → "힌트 전송" 으로 이 가족에게 보낸 추가 힌트 누적 표시.
// family.pushedHints 가 비어 있으면 카드 자체를 숨김.
export function PushedHintsCard({ hints }: { hints: string[] }) {
  if (hints.length === 0) return null
  return (
    <section className="bg-amber-300/15 border-2 border-amber-300/60 rounded-2xl p-5">
      <h3 className="text-amber-200 text-sm tracking-widest mb-3">📨 운영자의 도움말</h3>
      <ul className="space-y-3 text-amber-50">
        {hints.map((h, i) => (
          <li key={i} className="text-sm leading-relaxed flex gap-2">
            <span className="text-amber-300/80 shrink-0">{i + 1}.</span>
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
