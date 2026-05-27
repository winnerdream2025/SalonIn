export const metadata = {
  title: 'Salonin — Beauty professionals, connected',
  description:
    'Connect with salon owners hiring now. Browse portfolios, check availability, and message directly — no middleman.',
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Navbar ── */
        .ln-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 64px;
          display: flex;
          align-items: center;
          background: color-mix(in srgb, var(--color-background-primary) 88%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .ln-nav-inner {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .ln-logo {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.6px;
          color: var(--color-text-primary);
          text-decoration: none;
          flex-shrink: 0;
        }
        .ln-logo span { color: #D85A30; }
        .ln-nav-links {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ln-nav-link {
          color: var(--color-text-secondary);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 8px;
          transition: color 0.15s;
        }
        .ln-nav-link:hover { color: var(--color-text-primary); }
        .ln-btn-outline {
          color: var(--color-text-primary);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: transparent;
          transition: border-color 0.15s;
        }
        .ln-btn-outline:hover { border-color: var(--color-text-secondary); }
        .ln-btn-primary {
          color: #FFFFFF;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          background: #D85A30;
          transition: background 0.15s;
        }
        .ln-btn-primary:hover { background: #E8734E; }

        /* ── Hero ── */
        .ln-hero {
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          padding: 80px 24px;
          background: var(--color-background-primary);
        }
        .ln-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        .ln-hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        /* ── Hero left ── */
        .ln-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(216, 90, 48, 0.12);
          border: 1px solid rgba(216, 90, 48, 0.25);
          font-size: 12px;
          font-weight: 600;
          color: #D85A30;
          letter-spacing: 0.2px;
          margin-bottom: 28px;
        }
        .ln-h1 {
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 800;
          letter-spacing: -1.2px;
          line-height: 1.1;
          color: var(--color-text-primary);
          margin-bottom: 20px;
        }
        .ln-h1 span { color: #D85A30; }
        .ln-subtitle {
          font-size: 16px;
          line-height: 1.65;
          color: var(--color-text-secondary);
          max-width: 460px;
          margin-bottom: 36px;
        }
        .ln-ctas {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .ln-cta-primary {
          display: inline-block;
          padding: 14px 24px;
          border-radius: 12px;
          background: #D85A30;
          color: #FFFFFF;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.2px;
          transition: background 0.15s;
        }
        .ln-cta-primary:hover { background: #E8734E; }
        .ln-cta-ghost {
          display: inline-block;
          padding: 14px 24px;
          border-radius: 12px;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.2px;
          transition: border-color 0.15s;
        }
        .ln-cta-ghost:hover { border-color: var(--color-text-secondary); }
        .ln-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--color-text-tertiary);
        }
        .ln-note-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1D9E75;
          flex-shrink: 0;
        }

        /* ── Phone mockup ── */
        .ln-phone-col {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .ln-phone {
          width: 220px;
          background: #0A0A0A;
          border: 1.5px solid #222222;
          border-radius: 44px;
          padding: 4px;
          box-shadow:
            0 32px 80px rgba(0, 0, 0, 0.5),
            0 8px 24px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .ph-screen {
          border-radius: 40px;
          overflow: hidden;
          background: #0F0F0F;
          display: flex;
          flex-direction: column;
        }
        .ph-notch-row {
          display: flex;
          justify-content: center;
          padding: 10px 0 4px;
        }
        .ph-notch {
          width: 64px;
          height: 18px;
          border-radius: 999px;
          background: #000000;
        }
        .ph-header {
          padding: 4px 14px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ph-logo { font-size: 15px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; }
        .ph-accent { color: #D85A30; }
        .ph-avatar-sm {
          width: 26px; height: 26px; border-radius: 50%;
          background: #2A2A2A; border: 1px solid #333333;
        }
        .ph-search {
          margin: 0 10px 8px;
          background: #1A1A1A;
          border: 1px solid #2A2A2A;
          border-radius: 10px;
          padding: 7px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ph-search-circle {
          width: 10px; height: 10px;
          border-radius: 50%;
          border: 1.5px solid #5A5A5A;
          flex-shrink: 0;
        }
        .ph-search-ph { font-size: 10px; color: #5A5A5A; }
        .ph-chips { display: flex; gap: 5px; padding: 0 10px 10px; }
        .ph-chip {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 600;
          background: #1A1A1A;
          color: #9A9A9A;
          border: 1px solid #2A2A2A;
        }
        .ph-chip-on {
          background: rgba(216, 90, 48, 0.15);
          color: #D85A30;
          border-color: rgba(216, 90, 48, 0.30);
        }
        .ph-section-hd {
          padding: 0 10px 6px;
          font-size: 9px;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: 0.1px;
        }
        .ph-worker {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .ph-av {
          width: 34px; height: 34px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #FFFFFF;
        }
        .ph-wi { flex: 1; min-width: 0; }
        .ph-wn { font-size: 10px; font-weight: 600; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ph-ws { font-size: 9px; color: #6A6A6A; }
        .ph-wr { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex-shrink: 0; }
        .ph-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 600;
        }
        .ph-now   { background: rgba(29,158,117,0.15); color: #2DD4A0; }
        .ph-today { background: rgba(239,159,39,0.15);  color: #FABC4E; }
        .ph-dot {
          width: 4px; height: 4px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .ph-now   .ph-dot { background: #1D9E75; }
        .ph-today .ph-dot { background: #EF9F27; }
        .ph-dm { display: flex; align-items: center; gap: 4px; }
        .ph-d  { font-size: 8px; color: #5A5A5A; }
        .ph-m  {
          background: rgba(216, 90, 48, 0.12);
          color: #D85A30;
          border-radius: 5px;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 600;
        }
        .ph-nav {
          display: flex;
          justify-content: space-around;
          padding: 10px 4px 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: #0A0A0A;
          margin-top: 4px;
        }
        .ph-ni     { font-size: 7px; font-weight: 600; color: #5A5A5A; }
        .ph-ni-on  { color: #D85A30; }
        .ph-home {
          height: 18px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #0A0A0A;
        }
        .ph-bar {
          width: 56px; height: 3px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.15);
        }

        /* ── Footer ── */
        .ln-footer {
          background: var(--color-background-primary);
          border-top: 1px solid var(--color-border-subtle);
          padding: 24px;
        }
        .ln-footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ln-footer-logo {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text-primary);
          text-decoration: none;
        }
        .ln-footer-logo span { color: #D85A30; }
        .ln-footer-links {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 13px;
          color: var(--color-text-tertiary);
        }
        .ln-footer-links a {
          color: var(--color-text-tertiary);
          text-decoration: none;
        }
        .ln-footer-links a:hover { color: var(--color-text-secondary); }

        /* ── Mobile ── */
        @media (max-width: 900px) {
          .ln-hero-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .ln-hero { padding: 56px 24px; }
          .ln-nav-links .ln-nav-link { display: none; }
        }
        @media (max-width: 640px) {
          .ln-phone { display: none; }
        }
        @media (max-width: 480px) {
          .ln-ctas { flex-direction: column; }
          .ln-cta-primary, .ln-cta-ghost { text-align: center; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="ln-nav">
        <nav className="ln-nav-inner" aria-label="Main navigation">
          <a href="/" className="ln-logo">Salon<span>in</span></a>
          <div className="ln-nav-links">
            <a href="/workers" className="ln-nav-link">Browse workers</a>
            <a href="/login" className="ln-btn-outline">Sign in</a>
            <a href="/register" className="ln-btn-primary">Get started</a>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <main>
        <section className="ln-hero">
          <div className="ln-container">
            <div className="ln-hero-grid">

              {/* Left — copy */}
              <div>
                <div className="ln-eyebrow">DMV · Atlanta · Houston</div>
                <h1 className="ln-h1">
                  Where beauty pros<br />get <span>hired</span> locally.
                </h1>
                <p className="ln-subtitle">
                  Connect with salon owners hiring now. Browse portfolios, check
                  availability, and message directly — no middleman.
                </p>
                <div className="ln-ctas">
                  <a href="/register" className="ln-cta-primary">Create free account</a>
                  <a href="/workers" className="ln-cta-ghost">Browse workers →</a>
                </div>
                <p className="ln-note">
                  <span className="ln-note-dot" aria-hidden="true" />
                  No credit card required · Free to browse
                </p>
              </div>

              {/* Right — phone mockup */}
              <div className="ln-phone-col">
                <div className="ln-phone" aria-hidden="true">
                  <div className="ph-screen">

                    <div className="ph-notch-row"><div className="ph-notch" /></div>

                    <div className="ph-header">
                      <span className="ph-logo">Salon<span className="ph-accent">in</span></span>
                      <div className="ph-avatar-sm" />
                    </div>

                    <div className="ph-search">
                      <div className="ph-search-circle" />
                      <span className="ph-search-ph">Search professionals…</span>
                    </div>

                    <div className="ph-chips">
                      <span className="ph-chip ph-chip-on">All</span>
                      <span className="ph-chip">Hair</span>
                      <span className="ph-chip">Nails</span>
                    </div>

                    <div className="ph-section-hd">Available now · 14 nearby</div>

                    <div className="ph-worker">
                      <div className="ph-av" style={{ background: 'linear-gradient(135deg,#D85A30,#993C1D)' }}>A</div>
                      <div className="ph-wi">
                        <div className="ph-wn">Aisha K.</div>
                        <div className="ph-ws">Stylist · 6 yrs</div>
                      </div>
                      <div className="ph-wr">
                        <span className="ph-badge ph-now"><span className="ph-dot" />Now</span>
                        <div className="ph-dm"><span className="ph-d">0.4 mi</span><span className="ph-m">Msg</span></div>
                      </div>
                    </div>

                    <div className="ph-worker">
                      <div className="ph-av" style={{ background: 'linear-gradient(135deg,#8B5CF6,#5B21B6)' }}>M</div>
                      <div className="ph-wi">
                        <div className="ph-wn">Maya L.</div>
                        <div className="ph-ws">Colorist · 4 yrs</div>
                      </div>
                      <div className="ph-wr">
                        <span className="ph-badge ph-today"><span className="ph-dot" />Today</span>
                        <div className="ph-dm"><span className="ph-d">1.1 mi</span><span className="ph-m">Msg</span></div>
                      </div>
                    </div>

                    <div className="ph-worker">
                      <div className="ph-av" style={{ background: 'linear-gradient(135deg,#0EA5E9,#0369A1)' }}>D</div>
                      <div className="ph-wi">
                        <div className="ph-wn">Devon C.</div>
                        <div className="ph-ws">Nail Tech · 2 yrs</div>
                      </div>
                      <div className="ph-wr">
                        <span className="ph-badge ph-now"><span className="ph-dot" />Now</span>
                        <div className="ph-dm"><span className="ph-d">1.8 mi</span><span className="ph-m">Msg</span></div>
                      </div>
                    </div>

                    <div className="ph-nav">
                      <span className="ph-ni ph-ni-on">Discover</span>
                      <span className="ph-ni">Jobs</span>
                      <span className="ph-ni">Messages</span>
                      <span className="ph-ni">Profile</span>
                    </div>

                    <div className="ph-home"><div className="ph-bar" /></div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="ln-footer">
        <div className="ln-footer-inner">
          <a href="/" className="ln-footer-logo">Salon<span>in</span></a>
          <div className="ln-footer-links">
            <a href="/privacy">Privacy Policy</a>
            <span aria-hidden="true">·</span>
            <a href="/terms">Terms</a>
            <span aria-hidden="true">·</span>
            <span>© 2026 Salonin</span>
          </div>
        </div>
      </footer>
    </>
  )
}
