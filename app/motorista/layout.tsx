import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/motorista/bottom-nav'
import { Truck, Bell } from 'lucide-react'

export default async function MotoristaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('nome, role, tenant_id, tenants(trial_expires_at, ativo)')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/login')
  if (profile.role !== 'motorista') redirect('/dashboard')

  const tenant = profile.tenants as { trial_expires_at: string; ativo: boolean } | null
  if (tenant) {
    const trialExpired = !tenant.ativo || new Date(tenant.trial_expires_at) < new Date()
    if (trialExpired) redirect('/trial-expirado')
  }

  const { count: naoLidas } = await supabase
    .from('notificacoes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('lida', false)

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">FreteLog</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">{profile.nome.split(' ')[0]}</span>
            <div className="relative p-2">
              <Bell className="h-5 w-5 text-slate-600" />
              {(naoLidas ?? 0) > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
