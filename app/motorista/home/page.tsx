import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDateTime, formatRelative, isExpired, expiresInDays } from '@/lib/utils'
import { AlertTriangle, MapPin, Plus, Wallet, TrendingUp, ChevronRight, Truck } from 'lucide-react'

export default async function MotoristaHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, tenants(trial_expires_at, ativo)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch active viagem
  const { data: viagemAtiva } = await supabase
    .from('viagens')
    .select('*, veiculos(placa, modelo)')
    .eq('motorista_id', user.id)
    .eq('status', 'ativa')
    .maybeSingle()

  // Fetch current vehicle assignment
  const { data: atribuicao } = await supabase
    .from('motorista_veiculo')
    .select('*, veiculos(placa, modelo, status)')
    .eq('motorista_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  // Monthly summary - start and end of current month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  const { data: gastosDoMes } = await supabase
    .from('gastos')
    .select('valor')
    .eq('motorista_id', user.id)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)

  const { data: entradasDoMes } = await supabase
    .from('receitas')
    .select('valor')
    .eq('registrado_por', user.id)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)

  const totalGastos = (gastosDoMes ?? []).reduce((sum, g) => sum + (g.valor ?? 0), 0)
  const totalEntradas = (entradasDoMes ?? []).reduce((sum, r) => sum + (r.valor ?? 0), 0)

  // Last 5 checkpoints
  const { data: recentCheckpoints } = await supabase
    .from('checkpoints')
    .select('*, viagens(origem, destino)')
    .order('created_at', { ascending: false })
    .limit(5)

  // Filter checkpoints for this motorista's viagens
  const viagemIds: string[] = []
  if (viagemAtiva) viagemIds.push(viagemAtiva.id)

  const { data: myCheckpoints } = await supabase
    .from('checkpoints')
    .select('*, viagens!inner(origem, destino, motorista_id)')
    .eq('viagens.motorista_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const cnhExpired = isExpired(profile.cnh_validade ?? null)
  const cnhExpiringSoon = !cnhExpired && expiresInDays(profile.cnh_validade ?? null, 30)

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

  const veiculo = viagemAtiva
    ? (viagemAtiva.veiculos as { placa: string; modelo: string | null } | null)
    : atribuicao
      ? (atribuicao.veiculos as { placa: string; modelo: string | null; status: string } | null)
      : null

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      {/* Welcome */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-slate-800">
          Olá, {profile.nome.split(' ')[0]}! 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* CNH Alert */}
      {(cnhExpired || cnhExpiringSoon) && (
        <div className={`flex items-start gap-3 rounded-xl p-4 ${cnhExpired ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${cnhExpired ? 'text-red-500' : 'text-amber-500'}`} />
          <div>
            <p className={`font-semibold text-sm ${cnhExpired ? 'text-red-800' : 'text-amber-800'}`}>
              {cnhExpired ? 'CNH Vencida!' : 'CNH próxima do vencimento'}
            </p>
            <p className={`text-xs mt-0.5 ${cnhExpired ? 'text-red-700' : 'text-amber-700'}`}>
              {cnhExpired
                ? `Venceu em ${profile.cnh_validade ? new Date(profile.cnh_validade).toLocaleDateString('pt-BR') : '—'}. Regularize sua situação.`
                : `Vence em ${profile.cnh_validade ? new Date(profile.cnh_validade).toLocaleDateString('pt-BR') : '—'}.`}
            </p>
          </div>
        </div>
      )}

      {/* Active trip card OR start trip button */}
      {viagemAtiva ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-sm overflow-hidden">
          <div className="bg-emerald-500 px-4 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-semibold text-sm">Viagem em andamento</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-slate-700 font-medium text-sm">{viagemAtiva.origem}</span>
              <span className="text-slate-400 mx-1">→</span>
              <MapPin className="h-4 w-4 text-orange-400 shrink-0" />
              <span className="text-slate-700 font-medium text-sm">{viagemAtiva.destino}</span>
            </div>
            {veiculo && (
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 text-sm">
                  {veiculo.placa} {veiculo.modelo ? `· ${veiculo.modelo}` : ''}
                </span>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Iniciada {formatRelative(viagemAtiva.created_at)}
            </p>
            <div className="flex gap-2 pt-1">
              <Link
                href={`/motorista/viagem/${viagemAtiva.id}`}
                className="flex-1 bg-emerald-500 text-white text-center py-3 rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors"
              >
                Ver Viagem
              </Link>
              <Link
                href={`/motorista/viagem/${viagemAtiva.id}/checkpoint`}
                className="flex-1 bg-slate-100 text-slate-700 text-center py-3 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                + Checkpoint
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href="/motorista/viagem/nova"
          className="flex items-center justify-center gap-3 w-full bg-orange-500 text-white py-5 rounded-2xl font-bold text-lg shadow-md hover:bg-orange-600 active:scale-95 transition-all"
        >
          <Plus className="h-6 w-6" />
          Iniciar Nova Viagem
        </Link>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Wallet className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Gastos do Mês</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totalGastos)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">Entradas do Mês</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totalEntradas)}</p>
        </div>
      </div>

      {/* Recent activity */}
      {myCheckpoints && myCheckpoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Atividade Recente</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {myCheckpoints.map((cp) => {
              const viagem = cp.viagens as { origem: string; destino: string } | null
              return (
                <div key={cp.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">{checkpointIcons[cp.tipo] ?? '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{checkpointLabels[cp.tipo] ?? cp.tipo}</p>
                    {cp.descricao && (
                      <p className="text-xs text-slate-500 truncate">{cp.descricao}</p>
                    )}
                    {viagem && (
                      <p className="text-xs text-slate-400 truncate">{viagem.origem} → {viagem.destino}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{formatRelative(cp.created_at)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <Link
          href="/motorista/gastos/novo"
          className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
        >
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">Registrar</p>
            <p className="text-xs text-slate-500">Gasto</p>
          </div>
        </Link>
        <Link
          href="/motorista/entradas/nova"
          className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors active:scale-95"
        >
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-700 text-sm">Registrar</p>
            <p className="text-xs text-slate-500">Entrada</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
