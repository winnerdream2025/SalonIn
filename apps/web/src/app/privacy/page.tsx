import type { CSSProperties } from 'react'

export const metadata = {
  title: 'Privacy Policy — Salonin',
  description: 'How Salonin collects and uses your data',
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

const strong: CSSProperties = {
  color: 'var(--color-text-primary)',
  fontWeight: 600,
}

const link: CSSProperties = {
  color: '#D85A30',
  textDecoration: 'none',
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

export default function PrivacyPage() {
  return (
    <main style={page}>
      <div style={inner}>

        <a href="/" style={logoLink}>
          <span style={logoText}>
            Salon<span style={accent}>in</span>
          </span>
        </a>

        <h1 style={h1Style}>Privacy Policy</h1>
        <p style={metaText}>Last updated: May 26, 2026</p>

        <section style={section}>
          <h2 style={h2Style}>1. Data We Collect</h2>
          <ul style={listStyle}>
            <li><span style={strong}>Account</span> — name, email, phone number</li>
            <li><span style={strong}>Location</span> — precise GPS to show nearby workers and salons</li>
            <li><span style={strong}>Media</span> — profile photos, portfolio images and videos</li>
            <li><span style={strong}>Device</span> — push notification token, device type</li>
            <li><span style={strong}>Usage</span> — app interactions, search queries</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2Style}>2. How We Use Your Data</h2>
          <ul style={listStyle}>
            <li>Connect beauty professionals with salon owners</li>
            <li>Send relevant job opportunity notifications</li>
            <li>Monitor app stability via Sentry</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2Style}>3. Third-Party Services</h2>
          <ul style={listStyle}>
            <li><span style={strong}>AWS S3</span> — media file storage</li>
            <li><span style={strong}>Sentry</span> — error monitoring (no personal data sold)</li>
          </ul>
          <p style={{ ...bodyText, ...strong }}>
            We do NOT sell your data to advertisers. Ever.
          </p>
        </section>

        <section style={section}>
          <h2 style={h2Style}>4. Data Retention</h2>
          <ul style={listStyle}>
            <li><span style={strong}>Active account</span> — data retained while account exists</li>
            <li><span style={strong}>Deleted account</span> — all data removed within 30 days</li>
            <li>You can delete your account anytime from the app</li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2Style}>5. Your Rights</h2>
          <ul style={listStyle}>
            <li>
              <span style={strong}>Access your data</span> — contact{' '}
              <a href="mailto:privacy@salonin.com" style={link}>privacy@salonin.com</a>
            </li>
            <li>
              <span style={strong}>Delete your data</span> — Settings → Delete Account in the app
            </li>
            <li>
              <span style={strong}>Correction</span> — edit your profile anytime
            </li>
          </ul>
        </section>

        <section style={section}>
          <h2 style={h2Style}>6. Contact</h2>
          <p style={bodyText}>
            <a href="mailto:privacy@salonin.com" style={link}>privacy@salonin.com</a>
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
