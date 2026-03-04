import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReceitasClient } from './receitas-client'

export default async function ReceitasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, nome')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const tenantId = profile.tenant_id

  const { data: receitas, error } = await supabase
    .from('receitas')
    .select('*, viagens(origem, destino), users!receitas_registrado_por_fkey(nome)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) console.error('Erro ao buscar receitas:', error)

  // Total do mês atual
  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { data: receitasMes } = await supabase
    .from('receitas')
    .select('valor')
    .eq('tenant_id', tenantId)
    .gte('created_at', inicioMes)

  const totalMes = (receitasMes ?? []).reduce((sum, r) => sum + (r.valor ?? 0), 0)

  // Viagens ativas para o select do formulário
  const { data: viagens } = await supabase
    .from('viagens')
    .select('id, origem, destino')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativa')
    .order('created_at', { ascending: false })

  return (
    <ReceitasClient
      receitas={receitas ?? []}
      totalMes={totalMes}
      viagens={viagens ?? []}
      tenantId={tenantId}
      userId={user.id}
    />
  )
}
