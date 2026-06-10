import './globals.css'
import type { ReactNode } from 'react'
import { Providers } from '../components/Providers'
import { NavbarWrapper } from '../components/NavbarWrapper'

export const metadata = {
  title: 'My Salon In — Beauty Workforce Marketplace',
  description: 'Connect with salon owners hiring now. Browse portfolios, check availability, and message directly.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'My Salon In',
    description: 'Connect beauty professionals with salons hiring now.',
    url: 'https://mysalonin.com',
    siteName: 'My Salon In',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Salon In',
    description: 'Connect beauty professionals with salons hiring now.',
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
