'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Truck, LayoutDashboard, Users, Car, Route,
  DollarSign, Wrench, Settings, ChevronRight, X,
  BarChart3, TrendingUp, Wallet
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/motoristas', label: 'Motoristas', icon: Users },
  { href: '/veiculos', label: 'Veículos', icon: Car },
  { href: '/viagens', label: 'Viagens', icon: Route },
  {
    label: 'Financeiro',
    icon: DollarSign,
    children: [
      { href: '/financeiro/gastos', label: 'Gastos', icon: Wallet },
      { href: '/financeiro/receitas', label: 'Receitas', icon: TrendingUp },
      { href: '/financeiro/dre', label: 'DRE', icon: BarChart3 },
    ],
  },
  { href: '/manutencoes', label: 'Manutenções', icon: Wrench },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-300',
          'lg:relative lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-orange-500 p-1.5 rounded">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">FreteLog</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            if ('children' in item) {
              const isGroupActive = item.children.some((child) =>
                pathname.startsWith(child.href)
              )
              return (
                <div key={item.label}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                      isGroupActive ? 'text-orange-400' : 'text-slate-400'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => {
                      const isActive = pathname.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                            isActive
                              ? 'bg-orange-500/10 text-orange-400 font-medium'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          {child.label}
                          {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            }

            const isActive = item.href === '/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <p className="text-slate-600 text-xs text-center">FreteLog v1.0</p>
        </div>
      </aside>
    </>
  )
}
