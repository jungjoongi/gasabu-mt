'use client'
import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'

// SCANNING / PAUSED 상태일 때만 stop 호출 가능 — 그 외 호출 시 라이브러리가 throw.
async function safeStop(inst: Html5Qrcode): Promise<void> {
  try {
    const state = inst.getState()
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
      await inst.stop()
    }
  } catch {
    // 어떤 경우에도 cleanup 은 silent
  }
  try {
    inst.clear()
  } catch {
    /* noop */
  }
}

const SCANNER_ID = 'qr-scanner-region'

// QR 스캔 후 같은 출처면 path만, 다른 호스트면 UUID 추출 시도, 아니면 raw 텍스트 표시.
function extractScanTarget(text: string): string | null {
  try {
    const url = new URL(text)
    const m = url.pathname.match(/\/scan\/([0-9a-f-]{36})/i)
    if (m) return `/scan/${m[1]}`
  } catch {
    // URL 이 아닌 경우: 그대로 UUID 인지 확인
    const m = text.match(/^[0-9a-f-]{36}$/i)
    if (m) return `/scan/${text}`
  }
  return null
}

export function QrScannerModal({
  open,
  onClose,
  onResult,
}: {
  open: boolean
  onClose: () => void
  onResult: (path: string) => void
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    const html5 = new Html5Qrcode(SCANNER_ID, { verbose: false })
    scannerRef.current = html5

    html5
      .start(
        { facingMode: 'environment' }, // 후면 카메라 우선
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (cancelled) return
          const target = extractScanTarget(decodedText)
          if (target) {
            cancelled = true
            void safeStop(html5).then(() => onResult(target))
          } else {
            setError('이 게임의 QR이 아닙니다')
          }
        },
        () => { /* 매 프레임 미인식은 무시 */ },
      )
      .then(() => { if (!cancelled) setStarting(false) })
      .catch((e: unknown) => {
        if (cancelled) return
        setStarting(false)
        const msg = e instanceof Error ? e.message : String(e)
        setError(`카메라를 켤 수 없습니다 — ${msg}`)
      })

    return () => {
      cancelled = true
      const inst = scannerRef.current
      scannerRef.current = null
      if (inst) void safeStop(inst)
    }
  }, [open, onResult])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h3 className="text-amber-50 text-center text-lg font-bold">
          📷 QR 스캔
        </h3>
        <div
          id={SCANNER_ID}
          className="qr-scanner-region w-full aspect-square bg-stone-900 rounded-2xl overflow-hidden relative"
        />
        <style jsx global>{`
          .qr-scanner-region video,
          .qr-scanner-region canvas,
          .qr-scanner-region img {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
        `}</style>
        {starting && (
          <p className="text-amber-200/70 text-center text-sm">
            카메라를 여는 중...
          </p>
        )}
        {error && (
          <p className="text-red-300 text-center text-sm">
            {error}
            <br />
            <span className="text-xs text-amber-200/60">
              (HTTPS 또는 localhost 에서만 동작합니다)
            </span>
          </p>
        )}
        <button
          onClick={onClose}
          className="px-4 py-3 bg-stone-800 text-amber-100 rounded-xl font-bold border border-amber-300/40"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
