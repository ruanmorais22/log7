import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

const tipoLabels: Record<string, string> = {
  pagamento_entrega: 'Pagamento na Entrega',
  coleta_valor: 'Coleta de Valor',
  reembolso: 'Reembolso',
  outros: 'Outros',
}

const tipoIcons: Record<string, string> = {
  pagamento_entrega: '🤝',
  coleta_valor: '💵',
  reembolso: '↩️',
  outros: '💰',
}

const formaPagamentoLabels: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  ted: 'TED',
  cheque: 'Cheque',
}

export default async function EntradasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: receitas } = await supabase
    .from('receitas')
    .select('*, viagens(origem, destino)')
    .eq('registrado_por', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Monthly total
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data: entradasDoMes } = await supabase
    .from('receitas')
    .select('valor')
    .eq('registrado_por', user.id)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)

  const totalMes = (entradasDoMes ?? []).reduce((sum, r) => sum + (r.valor ?? 0), 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Minhas Entradas</h1>
        <Link
          href="/motorista/entradas/nova"
          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova
        </Link>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Monthly total card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Total do mês</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalMes)}</p>
          </div>
          <span className="text-4xl">💰</span>
        </div>

        {/* Receitas list */}
        {!receitas || receitas.length === 0 ? (
          <div className="mt-8 text-center">
            <div className="text-5xl mb-3">💰</div>
            <p className="text-slate-500 text-sm">Nenhuma entrada registrada</p>
            <Link
              href="/motorista/entradas/nova"
              className="inline-flex items-center gap-2 mt-4 bg-orange-500 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Registrar Entrada
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {receitas.map((receita) => {
                const viagem = receita.viagens as { origem: string; destino: string } | null
                return (
                  <div key={receita.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                      {tipoIcons[receita.tipo] ?? '💰'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">
                        {tipoLabels[receita.tipo] ?? receita.tipo}
                      </p>
                      {receita.nome_pagador && (
                        <p className="text-xs text-slate-500 truncate">{receita.nome_pagador}</p>
                      )}
                      {receita.descricao && (
                        <p className="text-xs text-slate-500 truncate">{receita.descricao}</p>
                      )}
                      {viagem && (
                        <p className="text-xs text-slate-400 truncate">
                          {viagem.origem} → {viagem.destino}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400">{formatDate(receita.created_at)}</p>
                        {receita.forma_pagamento && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">
                            {formaPagamentoLabels[receita.forma_pagamento] ?? receita.forma_pagamento}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-emerald-600 text-lg">{formatCurrency(receita.valor)}</p>
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
