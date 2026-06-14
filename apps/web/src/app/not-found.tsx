export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background-primary)',
        padding: 24,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <a href="/" style={{ textDecoration: 'none', marginBottom: 40 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)' }}>My Salon </span>
        <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-brand)' }}>In</span>
      </a>

      <p
        style={{
          fontSize: 96,
          fontWeight: 800,
          color: 'var(--color-border)',
          margin: 0,
          lineHeight: 1,
          letterSpacing: '-4px',
        }}
      >
        404
      </p>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '20px 0 8px 0',
          letterSpacing: '-0.4px',
        }}
      >
        Page not found
      </h1>

      <p
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 14,
          textAlign: 'center',
          maxWidth: 340,
          lineHeight: 1.6,
          margin: '0 0 32px 0',
        }}
      >
        This page doesn&apos;t exist or may have been moved.
      </p>

      <a
        href="/"
        style={{
          backgroundColor: 'var(--color-brand)',
          color: '#FFFFFF',
          textDecoration: 'none',
          borderRadius: 10,
          padding: '11px 28px',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Back to home
      </a>
    </div>
  )
}
