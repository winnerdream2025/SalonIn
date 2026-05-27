import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/messages']

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
  return NextResponse.next()
}

export const config = {
  matcher: ['/messages/:path*'],
}
