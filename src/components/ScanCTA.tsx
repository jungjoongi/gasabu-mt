'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QrScannerModal } from './QrScannerModal'

export function ScanCTA() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full text-center px-6 py-5 bg-amber-100 text-amber-950 font-bold rounded-2xl shadow-lg active:scale-95 text-lg"
      >
        📷 보물 QR 스캔
      </button>
      <QrScannerModal
        open={open}
        onClose={() => setOpen(false)}
        onResult={(path) => {
          setOpen(false)
          router.push(path)
        }}
      />
    </>
  )
}
