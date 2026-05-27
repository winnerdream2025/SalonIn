import './globals.css'
import type { ReactNode } from 'react'
import { Providers } from '../components/Providers'

export const metadata = {
  title: 'SalonIn',
  description: 'Beauty marketplace',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: 'var(--color-background-primary)',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
