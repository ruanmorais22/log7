import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from './configuracoes-client'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, nome, telefone, role, tenant_id, tenants(id, nome, cnpj, plano, aprovacao_gastos, limite_aprovacao)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const tenant = profile.tenants as {
    id: string
    nome: string
    cnpj: string | null
    plano: string
    aprovacao_gastos: boolean
    limite_aprovacao: number | null
  }

  // Usage counts
  const [{ count: totalMotoristas }, { count: totalVeiculos }] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'motorista'),
    supabase
      .from('veiculos')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id)
      .eq('ativo', true),
  ])

  return (
    <ConfiguracoesClient
      profile={{
        id: profile.id,
        nome: profile.nome,
        telefone: profile.telefone ?? '',
        role: profile.role,
      }}
      tenant={tenant}
      usage={{
        motoristas: totalMotoristas ?? 0,
        veiculos: totalVeiculos ?? 0,
      }}
      email={user.email ?? ''}
    />
  )
}
