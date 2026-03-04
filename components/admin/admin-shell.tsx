'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/admin/sidebar'
import { Header } from '@/components/admin/header'

interface AdminShellProps {
  children: React.ReactNode
  userName: string
  tenantNome: string
}

export function AdminShell({ children, userName, tenantNome }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          userName={userName}
          tenantNome={tenantNome}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
