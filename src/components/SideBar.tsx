'use client'

import * as React from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'

import { Button } from '@/components/ui/button'
import Image from 'next/image'

const navItems = [
  { title: 'Home', href: '/' },
  { title: 'About', href: '/about' },
  { title: 'Services', href: '/services' },
  { title: 'Contact', href: '/contact' },
]

export function SideBar() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <Link href="/" className="flex items-center space-x-2">
        <Image
          src={'/assets/images/logo-white.jpg'}
          alt={''}
          width={100}
          height={100}
        />
      </Link>
      <Button variant="ghost" size="icon">
        <Menu className="h-6 w-6" />
      </Button>
    </header>
  )
}
