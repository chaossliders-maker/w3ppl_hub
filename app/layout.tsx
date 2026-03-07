import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'W3 NET — Web3 Networking Hub',
  description: 'Web3 professional network with karma trust system.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
