'use client'

export function ScanCTA() {
  return (
    <a
      href="#"
      onClick={e => { e.preventDefault(); alert('휴대폰 카메라로 보물의 QR을 비추면 자동으로 페이지가 열립니다.') }}
      className="block text-center px-6 py-5 bg-amber-100 text-amber-950 font-bold rounded-2xl shadow-lg active:scale-95"
    >
      📷 보물 스캔 안내
    </a>
  )
}
