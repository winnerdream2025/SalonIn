'use client'
import type { ReactNode } from 'react'
import { configureClient } from '@salonin/api-client'

configureClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
})

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
}
