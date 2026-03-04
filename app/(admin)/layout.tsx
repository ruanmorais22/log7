import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrialBanner } from '@/components/shared/trial-banner'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('nome, tenant_id, role, tenants(nome, trial_expires_at, ativo)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'motorista') redirect('/motorista/home')

  const tenant = profile.tenants as { nome: string; trial_expires_at: string; ativo: boolean } | null

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {tenant && <TrialBanner trialExpiresAt={tenant.trial_expires_at} />}
      <div className="flex-1 overflow-hidden">
        <AdminShell
          userName={profile.nome}
          tenantNome={tenant?.nome ?? 'Transportadora'}
        >
          {children}
        </AdminShell>
      </div>
    </div>
  )
}
