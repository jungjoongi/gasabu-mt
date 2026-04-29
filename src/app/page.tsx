import Link from 'next/link'
import { AudioPlayer } from '@/components/AudioPlayer'

export default function Splash() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="text-6xl">🕯️</div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-wide">
        잃어버린 13지파의 후예
      </h1>
      <p className="text-amber-200/80 max-w-md leading-relaxed">
        100세대 만에 너희가 다시 모였다.
        <br />
        흩어진 단서를 모아 음해자의 이름을 부르라.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <AudioPlayer
          src="/audio/prologue.mp3"
          label="🎙️ 프롤로그 듣기"
          prominent
        />
        <Link
          href="/register"
          className="block text-center px-8 py-4 bg-amber-300 text-amber-950 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition"
        >
          시작하기
        </Link>
      </div>
    </main>
  )
}
