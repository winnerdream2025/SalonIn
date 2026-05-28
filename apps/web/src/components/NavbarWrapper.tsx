'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'

const HIDE_NAVBAR = ['/login', '/register', '/privacy', '/terms', '/forgot-password', '/reset-password']

export function NavbarWrapper() {
  const pathname = usePathname()
  if (HIDE_NAVBAR.some((p) => pathname.startsWith(p))) return null
  return <Navbar />
}
