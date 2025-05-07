'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'

export function AdminSidebarWrapper() {
  const pathname = usePathname()

  if (!pathname.includes('/admin')) return null

  return <AppSidebar />
}
