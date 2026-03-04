import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GastosClient } from './gastos-client'

export default async function GastosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, nome, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const tenantId = profile.tenant_id

  const { data: gastos, error } = await supabase
    .from('gastos')
    .select('*, users(nome), veiculos(placa), viagens(origem, destino)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) console.error('Erro ao buscar gastos:', error)

  const aprovados = gastos?.filter((g) => g.status === 'aprovado') ?? []
  const pendentes = gastos?.filter((g) => g.status === 'pendente') ?? []
  const rejeitados = gastos?.filter((g) => g.status === 'rejeitado') ?? []

  const totalAprovado = aprovados.reduce((sum, g) => sum + (g.valor ?? 0), 0)
  const totalPendente = pendentes.reduce((sum, g) => sum + (g.valor ?? 0), 0)
  const totalRejeitado = rejeitados.reduce((sum, g) => sum + (g.valor ?? 0), 0)

  return (
    <GastosClient
      gastos={gastos ?? []}
      totais={{ aprovado: totalAprovado, pendente: totalPendente, rejeitado: totalRejeitado }}
    />
  )
}
