import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'

const categoriaLabels: Record<string, string> = {
  combustivel: 'Combustível',
  pedagio: 'Pedágio',
  manutencao_rota: 'Manutenção',
  alimentacao: 'Alimentação',
  hospedagem: 'Hospedagem',
  lavagem: 'Lavagem',
  multa: 'Multa',
  outros: 'Outros',
}

const categoriaIcons: Record<string, string> = {
  combustivel: '⛽',
  pedagio: '🛣️',
  manutencao_rota: '🔧',
  alimentacao: '🍽️',
  hospedagem: '🏨',
  lavagem: '🚿',
  multa: '📋',
  outros: '📦',
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mes?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = await searchParams
  const statusFilter = params.status ?? 'todos'
  const mesFilter = params.mes ?? ''

  let query = supabase
    .from('gastos')
    .select('*, viagens(origem, destino)')
    .eq('motorista_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (statusFilter !== 'todos') {
    query = query.eq('status', statusFilter)
  }

  if (mesFilter) {
    const [year, month] = mesFilter.split('-')
    const startDate = new Date(Number(year), Number(month) - 1, 1).toISOString()
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString()
    query = query.gte('created_at', startDate).lte('created_at', endDate)
  }

  const { data: gastos } = await query

  // Monthly total (current month, all statuses)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data: gastosDoMes } = await supabase
    .from('gastos')
    .select('valor')
    .eq('motorista_id', user.id)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)

  const totalMes = (gastosDoMes ?? []).reduce((sum, g) => sum + (g.valor ?? 0), 0)

  // Generate months list for filter
  const months: { value: string; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    months.push({ value, label })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Meus Gastos</h1>
        <Link
          href="/motorista/gastos/novo"
          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo
        </Link>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Monthly total card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Total do mês</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalMes)}</p>
          </div>
          <span className="text-4xl">💸</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['todos', 'pendente', 'aprovado', 'rejeitado'].map((s) => (
            <Link
              key={s}
              href={`/motorista/gastos?status=${s}${mesFilter ? `&mes=${mesFilter}` : ''}`}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Link>
          ))}
        </div>

        {/* Month filter */}
        <div>
          <select
            defaultValue={mesFilter}
            onChange={(e) => {
              const url = `/motorista/gastos?status=${statusFilter}${e.target.value ? `&mes=${e.target.value}` : ''}`
              window.location.href = url
            }}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Todos os meses</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Gastos list */}
        {!gastos || gastos.length === 0 ? (
          <div className="mt-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-slate-500 text-sm">Nenhum gasto encontrado</p>
            <Link
              href="/motorista/gastos/novo"
              className="inline-flex items-center gap-2 mt-4 bg-orange-500 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Registrar Gasto
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {gastos.map((gasto) => {
                const viagem = gasto.viagens as { origem: string; destino: string } | null
                return (
                  <div key={gasto.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                      {categoriaIcons[gasto.categoria] ?? '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {categoriaLabels[gasto.categoria] ?? gasto.categoria}
                      </p>
                      {gasto.descricao && (
                        <p className="text-xs text-slate-500 truncate">{gasto.descricao}</p>
                      )}
                      {viagem && (
                        <p className="text-xs text-slate-400 truncate">
                          {viagem.origem} → {viagem.destino}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">{formatDate(gasto.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-red-600 text-lg">{formatCurrency(gasto.valor)}</p>
                      <StatusBadge type="gasto" status={gasto.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
