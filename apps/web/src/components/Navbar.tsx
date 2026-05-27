'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'

export function Navbar() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => { document.removeEventListener('mousedown', close) }
  }, [dropdownOpen])

  const handleLogout = useCallback(async () => {
    setDropdownOpen(false)
    await logout()
    router.push('/')
  }, [logout, router])

  const role = user?.role

  return (
    <>
      <style>{`
        .nb-root {
          position: sticky; top: 0; z-index: 100;
          height: 64px; display: flex; align-items: center;
          background: color-mix(in srgb, var(--color-background-primary) 88%, transparent);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--color-border-subtle);
        }
        .nb-inner {
          width: 100%; max-width: 1200px; margin: 0 auto;
          padding: 0 24px; display: flex; align-items: center;
          justify-content: space-between; gap: 16px;
        }
        .nb-logo {
          font-size: 20px; font-weight: 800; letter-spacing: -0.6px;
          color: var(--color-text-primary); text-decoration: none; flex-shrink: 0;
        }
        .nb-logo span { color: #D85A30; }
        .nb-links { display: flex; align-items: center; gap: 4px; }
        .nb-link {
          color: var(--color-text-secondary); text-decoration: none;
          font-size: 14px; font-weight: 500; padding: 8px 12px;
          border-radius: 8px; background: transparent; border: none;
          cursor: pointer; transition: color 0.15s; display: inline-block;
        }
        .nb-link:hover { color: var(--color-text-primary); }
        .nb-btn-outline {
          color: var(--color-text-primary); text-decoration: none;
          font-size: 14px; font-weight: 600; padding: 8px 16px;
          border-radius: 8px; border: 1px solid var(--color-border);
          background: transparent; cursor: pointer; transition: border-color 0.15s;
        }
        .nb-btn-outline:hover { border-color: var(--color-text-secondary); }
        .nb-btn-primary {
          color: #FFFFFF; text-decoration: none; font-size: 14px;
          font-weight: 600; padding: 8px 16px; border-radius: 8px;
          background: #D85A30; border: none; cursor: pointer;
          transition: background 0.15s; display: inline-block;
        }
        .nb-btn-primary:hover { background: #E8734E; }
        .nb-profile-wrap { position: relative; }
        .nb-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: #D85A30; display: flex; align-items: center;
          justify-content: center; font-size: 13px; font-weight: 700;
          color: #FFFFFF; cursor: pointer; flex-shrink: 0; border: none;
        }
        .nb-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: var(--color-background-card);
          border: 1px solid var(--color-border);
          border-radius: 12px; min-width: 180px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          overflow: hidden; z-index: 200;
        }
        .nb-dd-item {
          display: block; width: 100%; text-align: left;
          padding: 11px 16px; font-size: 14px; font-weight: 500;
          color: var(--color-text-primary); background: transparent;
          border: none; cursor: pointer; text-decoration: none;
          transition: background 0.1s; box-sizing: border-box;
        }
        .nb-dd-item:hover { background: var(--color-border-subtle); }
        .nb-dd-divider { height: 1px; background: var(--color-border); margin: 4px 0; }
        .nb-dd-danger { color: #E24B4A; }
      `}</style>

      <header className="nb-root">
        <nav className="nb-inner" aria-label="Main navigation">
          <a href="/" className="nb-logo">Salon<span>in</span></a>

          {!isAuthenticated ? (
            <div className="nb-links">
              <a href="/workers" className="nb-link">Browse workers</a>
              <a href="/jobs" className="nb-link">Browse jobs</a>
              <a href="/login" className="nb-btn-outline">Sign in</a>
              <a href="/register" className="nb-btn-primary">Get started</a>
            </div>
          ) : (
            <div className="nb-links">
              <a href="/workers" className="nb-link">Discover</a>
              {role === 'SALON' ? (
                <a href="/jobs/create" className="nb-link">Post a job</a>
              ) : (
                <a href="/jobs" className="nb-link">Jobs</a>
              )}
              <a href="/messages" className="nb-link">Messages</a>

              <div className="nb-profile-wrap" ref={dropdownRef}>
                <button
                  className="nb-avatar"
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  aria-label="Profile menu"
                >
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </button>

                {dropdownOpen && (
                  <div className="nb-dropdown" role="menu">
                    {role === 'SALON' ? (
                      <>
                        <a href="/salons/me" className="nb-dd-item" role="menuitem"
                          onClick={() => setDropdownOpen(false)}>
                          My salon
                        </a>
                        <a href="/jobs/create" className="nb-dd-item" role="menuitem"
                          onClick={() => setDropdownOpen(false)}>
                          Post job
                        </a>
                      </>
                    ) : (
                      <>
                        <a href="/workers/me" className="nb-dd-item" role="menuitem"
                          onClick={() => setDropdownOpen(false)}>
                          My profile
                        </a>
                        <a href="/workers/edit" className="nb-dd-item" role="menuitem"
                          onClick={() => setDropdownOpen(false)}>
                          Edit profile
                        </a>
                      </>
                    )}
                    <div className="nb-dd-divider" />
                    <button
                      className="nb-dd-item nb-dd-danger"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  )
}
