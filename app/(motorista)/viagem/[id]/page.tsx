import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import { ArrowLeft, MapPin, Truck, Plus, DollarSign, TrendingUp } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { EncerrarViagemButton } from './encerrar-viagem-button'

const checkpointIcons: Record<string, string> = {
  saida: '🚀',
  carregamento: '📦',
  em_rota: '🗺️',
  parada_tecnica: '⛽',
  entrega_realizada: '✅',
  ocorrencia: '⚠️',
  chegada: '🏁',
}

const checkpointLabels: Record<string, string> = {
  saida: 'Saída',
  carregamento: 'Carregamento',
  em_rota: 'Em Rota',
  parada_tecnica: 'Parada Técnica',
  entrega_realizada: 'Entrega Realizada',
  ocorrencia: 'Ocorrência',
  chegada: 'Chegada',
}

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

export default async function ViagemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: viagem } = await supabase
    .from('viagens')
    .select('*, veiculos(id, placa, modelo, km_atual)')
    .eq('id', id)
    .eq('motorista_id', user.id)
    .single()

  if (!viagem) notFound()

  const veiculo = viagem.veiculos as { id: string; placa: string; modelo: string | null; km_atual: number } | null

  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('viagem_id', id)
    .order('created_at', { ascending: true })

  const { data: gastos } = await supabase
    .from('gastos')
    .select('*')
    .eq('viagem_id', id)
    .order('created_at', { ascending: false })

  const { data: receitas } = await supabase
    .from('receitas')
    .select('*')
    .eq('viagem_id', id)
    .order('created_at', { ascending: false })

  const totalGastos = (gastos ?? []).reduce((sum, g) => sum + (g.valor ?? 0), 0)
  const totalReceitas = (receitas ?? []).reduce((sum, r) => sum + (r.valor ?? 0), 0)
  const isAtiva = viagem.status === 'ativa'
  const kmPercorrido = viagem.km_fim && viagem.km_inicio ? viagem.km_fim - viagem.km_inicio : null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/motorista/viagem" className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-800 truncate">
            {viagem.origem} → {viagem.destino}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge type="viagem" status={viagem.status} />
            <span className="text-xs text-slate-400">{formatDate(viagem.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Trip info card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="w-0.5 h-8 bg-slate-200" />
              <MapPin className="h-4 w-4 text-orange-500" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs text-slate-400 font-medium">ORIGEM</p>
                <p className="font-semibold text-slate-800">{viagem.origem}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">DESTINO</p>
                <p className="font-semibold text-slate-800">{viagem.destino}</p>
              </div>
            </div>
          </div>

          {veiculo && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600">{veiculo.placa}</span>
              {veiculo.modelo && <span className="text-sm text-slate-400">· {veiculo.modelo}</span>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <div className="text-center">
              <p className="text-xs text-slate-400">KM Inicial</p>
              <p className="font-bold text-slate-700">{viagem.km_inicio?.toLocaleString('pt-BR') ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">KM Final</p>
              <p className="font-bold text-slate-700">{viagem.km_fim?.toLocaleString('pt-BR') ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Percorrido</p>
              <p className="font-bold text-slate-700">{kmPercorrido ? `${kmPercorrido.toLocaleString('pt-BR')} km` : '—'}</p>
            </div>
          </div>

          {viagem.observacoes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400 font-medium">OBSERVAÇÕES</p>
              <p className="text-sm text-slate-600 mt-0.5">{viagem.observacoes}</p>
            </div>
          )}
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 font-medium">GASTOS DA VIAGEM</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalGastos)}</p>
            <p className="text-xs text-slate-400 mt-1">{gastos?.length ?? 0} lançamentos</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs text-slate-400 font-medium">ENTRADAS DA VIAGEM</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalReceitas)}</p>
            <p className="text-xs text-slate-400 mt-1">{receitas?.length ?? 0} lançamentos</p>
          </div>
        </div>

        {/* Action buttons for active trip */}
        {isAtiva && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h2 className="font-semibold text-slate-800">Ações</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/motorista/viagem/${id}/checkpoint`}
                className="flex flex-col items-center gap-2 py-4 px-3 bg-blue-50 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl">📍</span>
                <span className="text-xs font-semibold text-center">Adicionar Checkpoint</span>
              </Link>
              <Link
                href={`/motorista/gastos/novo?viagem_id=${id}`}
                className="flex flex-col items-center gap-2 py-4 px-3 bg-red-50 rounded-xl text-red-700 hover:bg-red-100 transition-colors"
              >
                <DollarSign className="h-6 w-6" />
                <span className="text-xs font-semibold text-center">Registrar Gasto</span>
              </Link>
              <Link
                href={`/motorista/entradas/nova?viagem_id=${id}`}
                className="flex flex-col items-center gap-2 py-4 px-3 bg-emerald-50 rounded-xl text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <TrendingUp className="h-6 w-6" />
                <span className="text-xs font-semibold text-center">Registrar Entrada</span>
              </Link>
              <EncerrarViagemButton
                viagemId={id}
                veiculoId={veiculo?.id ?? null}
                kmAtual={veiculo?.km_atual ?? 0}
              />
            </div>
          </div>
        )}

        {/* Timeline of checkpoints */}
        {checkpoints && checkpoints.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Timeline de Checkpoints</h2>
            </div>
            <div className="p-4">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100" />
                <div className="space-y-4">
                  {checkpoints.map((cp, index) => (
                    <div key={cp.id} className="flex items-start gap-3 relative">
                      <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-lg shrink-0 z-10">
                        {checkpointIcons[cp.tipo] ?? '📍'}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="font-semibold text-slate-800 text-sm">{checkpointLabels[cp.tipo] ?? cp.tipo}</p>
                        {cp.descricao && (
                          <p className="text-sm text-slate-600 mt-0.5">{cp.descricao}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400">{formatDateTime(cp.created_at)}</span>
                          {cp.km_atual != null && (
                            <span className="text-xs text-slate-500 font-medium">{cp.km_atual.toLocaleString('pt-BR')} km</span>
                          )}
                        </div>
                        {cp.foto_url && (
                          <a
                            href={cp.foto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 underline mt-1 block"
                          >
                            Ver foto
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gastos list */}
        {gastos && gastos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Gastos</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {gastos.map((g) => (
                <div key={g.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">{categoriaIcons[g.categoria] ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{categoriaLabels[g.categoria] ?? g.categoria}</p>
                    {g.descricao && <p className="text-xs text-slate-500 truncate">{g.descricao}</p>}
                    <p className="text-xs text-slate-400">{formatDateTime(g.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(g.valor)}</p>
                    <StatusBadge type="gasto" status={g.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receitas list */}
        {receitas && receitas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Entradas</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {receitas.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{r.tipo.replace(/_/g, ' ')}</p>
                    {r.nome_pagador && <p className="text-xs text-slate-500 truncate">{r.nome_pagador}</p>}
                    <p className="text-xs text-slate-400">{formatDateTime(r.created_at)}</p>
                  </div>
                  <p className="font-bold text-emerald-600">{formatCurrency(r.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
