'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
  { label: 'Overview',    href: '/dashboard' },
  { label: 'Visitors',    href: '/dashboard/visitors' },
  { label: 'Membership',  href: '/dashboard/membership' },
  { label: 'Email',       href: '/dashboard/email' },
  { label: 'Paid Social', href: '/dashboard/paid-social' },
  { label: 'Pages',       href: '/dashboard/pages' },
  { label: 'UTMs',        href: '/dashboard/utms' },
]

function NavContent({ isAdmin, pathname, onNav }: { isAdmin?: boolean; pathname: string; onNav?: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pgm-green flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">PGM</span>
          </div>
          <span className="text-white font-semibold text-sm leading-tight">Pure Golf Media</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-pgm-silver/50 text-xs uppercase tracking-widest px-3 pb-2 pt-1">
          Performance
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNav}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-pgm-green/15 text-pgm-green border-l-2 border-pgm-green pl-[10px]'
                  : 'text-pgm-silver hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <p className="text-pgm-silver/50 text-xs uppercase tracking-widest px-3 pb-2 pt-5">
              CRM
            </p>
            <Link
              href="/crm"
              onClick={onNav}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/crm')
                  ? 'bg-pgm-green/15 text-pgm-green border-l-2 border-pgm-green pl-[10px]'
                  : 'text-pgm-silver hover:text-white hover:bg-white/5'
              }`}
            >
              Contacts
            </Link>
            <p className="text-pgm-silver/50 text-xs uppercase tracking-widest px-3 pb-2 pt-5">
              Admin
            </p>
            <Link
              href="/admin"
              onClick={onNav}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-pgm-green/15 text-pgm-green border-l-2 border-pgm-green pl-[10px]'
                  : 'text-pgm-silver hover:text-white hover:bg-white/5'
              }`}
            >
              Clients
            </Link>
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left px-3 py-2 text-sm text-pgm-silver hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </>
  )
}

export default function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-pgm-ink h-14 flex items-center px-4 border-b border-white/10">
        <button
          onClick={() => setOpen(true)}
          className="text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-6 h-6 rounded bg-pgm-green flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">PGM</span>
          </div>
          <span className="text-white text-sm font-semibold">Pure Golf Media</span>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-pgm-ink flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent isAdmin={isAdmin} pathname={pathname} onNav={() => setOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 bg-pgm-ink min-h-screen flex-col">
        <NavContent isAdmin={isAdmin} pathname={pathname} />
      </aside>
    </>
  )
}
