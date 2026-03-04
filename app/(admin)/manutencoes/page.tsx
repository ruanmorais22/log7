import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ManutencoesClient } from './manutencoes-client'

export default async function ManutencoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const tenantId = profile.tenant_id

  const { data: manutencoes, error } = await supabase
    .from('manutencoes')
    .select('*, veiculos(placa, modelo), users(nome)')
    .eq('tenant_id', tenantId)
    .order('data', { ascending: false })
    .limit(100)

  if (error) console.error('Erro ao buscar manutenções:', error)

  const all = manutencoes ?? []
  const totais = {
    geral: all.reduce((sum, m) => sum + (m.custo ?? 0), 0),
    preventiva: all.filter((m) => m.tipo === 'preventiva').reduce((sum, m) => sum + (m.custo ?? 0), 0),
    corretiva: all.filter((m) => m.tipo === 'corretiva').reduce((sum, m) => sum + (m.custo ?? 0), 0),
    emergencial: all.filter((m) => m.tipo === 'emergencial').reduce((sum, m) => sum + (m.custo ?? 0), 0),
  }

  // Get unique vehicles for filter
  const veiculos = Array.from(
    new Map(
      all
        .filter((m) => m.veiculos)
        .map((m) => {
          const v = m.veiculos as { placa: string; modelo: string | null }
          return [m.veiculo_id, { id: m.veiculo_id, placa: v.placa, modelo: v.modelo }]
        })
    ).values()
  )

  return (
    <ManutencoesClient
      manutencoes={all}
      totais={totais}
      veiculos={veiculos}
    />
  )
}
