import type { CSSProperties } from 'react'

export const metadata = {
  title: 'Terms of Service — Salonin',
  description: 'Salonin terms of service',
}

const page: CSSProperties = {
  backgroundColor: 'var(--color-background-primary)',
  minHeight: '100vh',
  padding: '56px 24px 80px',
}

const inner: CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
}

const logoLink: CSSProperties = {
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: 48,
}

const logoText: CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  letterSpacing: '-0.5px',
  color: 'var(--color-text-primary)',
}

const accent: CSSProperties = { color: '#D85A30' }

const h1Style: CSSProperties = {
  fontSize: 32,
  fontWeight: 700,
  letterSpacing: '-0.5px',
  color: 'var(--color-text-primary)',
  margin: '0 0 8px 0',
}

const metaText: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  margin: '0 0 56px 0',
}

const section: CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  paddingTop: 32,
  marginBottom: 32,
}

const h2Style: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: '-0.2px',
  color: 'var(--color-text-primary)',
  margin: '0 0 14px 0',
}

const bodyText: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 15,
  lineHeight: 1.7,
  margin: '0 0 12px 0',
}

const listStyle: CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 15,
  lineHeight: 1.7,
  paddingLeft: 20,
  margin: '0 0 12px 0',
}

const footer: CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  paddingTop: 28,
  marginTop: 48,
  display: 'flex',
  gap: 16,
  alignItems: 'center',
  color: 'var(--color-text-tertiary)',
  fontSize: 13,
}

const footerLink: CSSProperties = {
  color: 'var(--color-text-tertiary)',
  textDecoration: 'none',
}

export default function TermsPage() {
  return (
    <main style={page}>
      <div style={inner}>

        <a href="/" style={logoLink}>
          <span style={logoText}>
            Salon<span style={accent}>in</span>
          </span>
        </a>

        <h1 style={h1Style}>Terms of Service</h1>
        <p style={metaText}>Last updated: May 26, 2026</p>

        <section style={section}>
          <h2 style={h2Style}>1. Platform Description</h2>
          <p style={bodyText}>
            Salonin is a marketplace connecting beauty professionals with salon owners.
            We are not a staffing agency.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2Style}>2. Independent Contractor Status</h2>
          <p style={bodyText}>
            Beauty professionals on Salonin are independent contractors, not employees
            of Salonin or any salon. Salonin does not control work schedules, rates,
            or methods.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2Style}>3. User Responsibilities</h2>
          <ul style={listStyle}>
            <li>Provide accurate, truthful profile information</li>
            <li>Maintain valid professional licenses where required</li>
            <li>Communicate professionally with other users</li>
            <li>Honor commitments made through the platform</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2Style}>4. Prohibited Conduct</h2>
          <ul style={listStyle}>
            <li>False or misleading profile information</li>
            <li>Harassment or discriminatory behavior</li>
            <li>Spam or unsolicited commercial messages</li>
            <li>Circumventing the platform after initial connection</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2Style}>5. Account Termination</h2>
          <p style={bodyText}>
            Salonin may suspend or terminate accounts that violate these terms,
            with or without prior notice.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2Style}>6. Limitation of Liability</h2>
          <p style={bodyText}>
            Salonin is not liable for disputes between workers and salon owners,
            quality of services, or lost income.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2Style}>7. Governing Law</h2>
          <p style={bodyText}>
            Commonwealth of Virginia, United States of America.
          </p>
        </section>

        <footer style={footer}>
          <a href="/privacy" style={footerLink}>Privacy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms" style={footerLink}>Terms</a>
          <span aria-hidden="true">·</span>
          <span>© 2026 Salonin</span>
        </footer>

      </div>
    </main>
  )
}
