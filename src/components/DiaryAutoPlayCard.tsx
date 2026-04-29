'use client'
import { AudioPlayer } from './AudioPlayer'

// 보물 스캔 직후 결과 페이지에서 사용 — 마운트 즉시 mp3 자동 재생.
// 사용자가 QR 스캔/링크 클릭 직후 진입하므로 user-gesture 직후로 간주되어
// 대부분의 모바일 브라우저에서 autoplay 통과한다.
export function DiaryAutoPlayCard({
  index,
  title,
  body,
}: {
  index: number
  title: string
  body: string
}) {
  return (
    <article className="bg-amber-50 text-amber-950 rounded-xl p-4 font-handwriting mt-3 flex flex-col gap-3">
      <div>
        <h4 className="font-bold mb-1">
          {index + 1}. {title}
        </h4>
        <p className="text-sm leading-relaxed whitespace-pre-line">{body}</p>
      </div>
      <AudioPlayer
        src={`/audio/diary-${index + 1}.mp3`}
        label={`${index + 1}페이지 다시 듣기`}
        prominent
        autoplay
      />
    </article>
  )
}
