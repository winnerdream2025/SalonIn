import type { CSSProperties } from 'react'

export const metadata = {
  title: 'Salonin — Beauty professionals, connected',
  description: 'The network where beauty professionals and salon owners connect — locally.',
}

const page: CSSProperties = {
  backgroundColor: 'var(--color-background-primary)',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
}

const hero: CSSProperties = {
  textAlign: 'center',
  maxWidth: 480,
  width: '100%',
}

const logoStyle: CSSProperties = {
  fontSize: 40,
  fontWeight: 800,
  letterSpacing: '-1.5px',
  color: 'var(--color-text-primary)',
  margin: '0 0 24px 0',
  lineHeight: 1,
}

const accent: CSSProperties = { color: '#D85A30' }

const tagline: CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  letterSpacing: '-0.4px',
  color: 'var(--color-text-primary)',
  margin: '0 0 12px 0',
}

const subtitle: CSSProperties = {
  fontSize: 15,
  color: 'var(--color-text-secondary)',
  lineHeight: 1.6,
  margin: '0 0 40px 0',
}

const ctaGroup: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginBottom: 56,
}

const btnPrimary: CSSProperties = {
  display: 'block',
  padding: '15px 24px',
  borderRadius: 12,
  backgroundColor: '#D85A30',
  color: '#FFFFFF',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 600,
  textAlign: 'center',
  letterSpacing: '-0.2px',
}

const btnOutlined: CSSProperties = {
  display: 'block',
  padding: '15px 24px',
  borderRadius: 12,
  backgroundColor: 'transparent',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-primary)',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 600,
  textAlign: 'center',
  letterSpacing: '-0.2px',
}

const footerRow: CSSProperties = {
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--color-text-tertiary)',
  fontSize: 13,
}

const footerLink: CSSProperties = {
  color: 'var(--color-text-tertiary)',
  textDecoration: 'none',
}

export default function LandingPage() {
  return (
    <main style={page}>
      <div style={hero}>

        <p style={logoStyle}>
          Salon<span style={accent}>in</span>
        </p>

        <h1 style={tagline}>Your beauty career, connected.</h1>

        <p style={subtitle}>
          The network where beauty professionals and salon owners connect — locally.
        </p>

        <nav style={ctaGroup} aria-label="Get started">
          <a href="/register" style={btnPrimary}>Create account</a>
          <a href="/login" style={btnOutlined}>Sign in</a>
        </nav>

        <footer style={footerRow}>
          <a href="/privacy" style={footerLink}>Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms" style={footerLink}>Terms</a>
          <span aria-hidden="true">·</span>
          <span>© 2026 Salonin</span>
        </footer>

      </div>
    </main>
  )
}
