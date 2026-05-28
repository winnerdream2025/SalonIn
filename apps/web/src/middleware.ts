import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/messages', '/jobs/create']

function decodeJwtPayload(token: string): { sub?: string; role?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json) as { sub?: string; role?: string }
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('accessToken')?.value
  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url),
    )
  }

  if (pathname.startsWith('/jobs/create')) {
    const payload = decodeJwtPayload(token)
    if (!payload || payload.role !== 'SALON') {
      return NextResponse.redirect(new URL('/workers', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/messages/:path*', '/jobs/create'],
}
