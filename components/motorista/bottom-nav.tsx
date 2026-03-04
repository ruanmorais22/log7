'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Route, Wallet, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/motorista/home', label: 'Home', icon: Home },
  { href: '/motorista/viagem', label: 'Viagem', icon: Route },
  { href: '/motorista/gastos', label: 'Gastos', icon: Wallet },
  { href: '/motorista/entradas', label: 'Entradas', icon: TrendingUp },
  { href: '/motorista/perfil', label: 'Perfil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-pb">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = item.href === '/motorista/home'
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs transition-colors',
                isActive
                  ? 'text-orange-500'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-orange-500')} />
              <span className={cn('font-medium', isActive && 'text-orange-500')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
