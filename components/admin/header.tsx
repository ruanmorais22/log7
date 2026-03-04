'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelative } from '@/lib/utils'

interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  created_at: string
  link?: string
}

interface HeaderProps {
  userName: string
  tenantNome: string
  onMenuClick: () => void
}

export function Header({ userName, tenantNome, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const naoLidas = notificacoes.filter((n) => !n.lida).length

  useEffect(() => {
    async function loadNotificacoes() {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setNotificacoes(data)
    }
    loadNotificacoes()
  }, [supabase])

  async function handleMarkAllRead() {
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('lida', false)
    setNotificacoes([])
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1">
        <p className="text-sm text-slate-500 hidden lg:block">{tenantNome}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notificações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {naoLidas > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {naoLidas}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-2 border-b">
              <span className="font-semibold text-sm">Notificações</span>
              {naoLidas > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            {notificacoes.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                Nenhuma notificação
              </div>
            ) : (
              notificacoes.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-1 p-3"
                  onClick={() => n.link && router.push(n.link)}
                >
                  <span className="font-medium text-sm">{n.titulo}</span>
                  <span className="text-xs text-slate-500">{n.mensagem}</span>
                  <span className="text-xs text-slate-400">{formatRelative(n.created_at)}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden lg:block text-sm">{userName}</span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push('/configuracoes')}>
              <User className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
