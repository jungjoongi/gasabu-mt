import { DIARY_PAGES } from '@/lib/content'
import { AudioPlayer } from './AudioPlayer'

export function DiaryStack({ pagesRead }: { pagesRead: number }) {
  if (pagesRead === 0) {
    return (
      <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40 text-amber-200/60 text-sm">
        📜 첫 보물을 찾으면 13지파의 일기가 열립니다.
      </section>
    )
  }
  return (
    <section className="bg-stone-900/60 rounded-2xl p-5 border border-amber-700/40">
      <h3 className="text-amber-200/80 text-sm tracking-widest mb-3">
        📜 13지파의 일기 ({pagesRead}/7)
      </h3>
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {DIARY_PAGES.slice(0, pagesRead).map((p, idx) => (
          <article
            key={idx}
            className="bg-amber-50/95 text-amber-950 rounded-xl p-4 font-handwriting"
          >
            <h4 className="font-bold mb-1">
              {idx + 1}. {p.title}
            </h4>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {p.body}
            </p>
            <div className="mt-2">
              <AudioPlayer src={`/audio/diary-${idx + 1}.mp3`} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
