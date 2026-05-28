import './globals.css'
import type { ReactNode } from 'react'
import { Providers } from '../components/Providers'
import { NavbarWrapper } from '../components/NavbarWrapper'

export const metadata = {
  title: 'Salonin — Where beauty pros get hired locally',
  description: 'Connect with salon owners hiring now. Browse portfolios, check availability, and message directly.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Salonin',
    description: 'Where beauty pros get hired locally.',
    url: 'https://salonin-production-77fc.up.railway.app',
    siteName: 'Salonin',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Salonin',
    description: 'Where beauty pros get hired locally.',
  },
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
        <Providers>
          <NavbarWrapper />
          {children}
        </Providers>
      </body>
    </html>
  )
}
