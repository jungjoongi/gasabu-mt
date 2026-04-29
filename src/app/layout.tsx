import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '잃어버린 13지파의 후예',
  description: '음해자를 찾아라',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gradient-to-b from-amber-950 to-stone-950 text-amber-50 font-serif antialiased">
        {children}
      </body>
    </html>
  )
}
