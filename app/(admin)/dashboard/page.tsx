import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KpiCard } from '@/components/admin/kpi-card'
import { ReceitasDespesasChart } from '@/components/admin/charts/receitas-despesas-chart'
import { GastosCategoriaChart } from '@/components/admin/charts/gastos-categoria-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, calcularVariacao } from '@/lib/utils'
import {
  Users, Car, DollarSign, TrendingUp, AlertTriangle,
  Truck, Clock, CheckCircle, Wrench
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
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

  // Buscar KPIs via function
  const { data: kpis } = await supabase.rpc('dashboard_kpis', { p_tenant_id: tenantId })
  const k = (kpis as Record<string, number>) ?? {}

  // Buscar histórico financeiro
  const { data: historico } = await supabase.rpc('historico_financeiro', { p_tenant_id: tenantId })

  // Buscar gastos por categoria
  const { data: gastosCat } = await supabase.rpc('gastos_por_categoria', {
    p_tenant_id: tenantId,
    p_meses: 1,
  })

  // Buscar viagens ativas recentes
  const { data: viagens } = await supabase
    .from('viagens')
    .select('id, origem, destino, status, created_at, users(nome), veiculos(placa)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativa')
    .order('created_at', { ascending: false })
    .limit(5)

  // Buscar alertas de vencimento
  const hoje = new Date()
  const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: vencimentos } = await supabase
    .from('veiculos')
    .select('id, placa, crlv_vencimento, seguro_vencimento, antt_vencimento')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .or(`crlv_vencimento.lte.${em30dias},seguro_vencimento.lte.${em30dias},antt_vencimento.lte.${em30dias}`)
    .limit(5)

  const variacaoReceitas = calcularVariacao(k.receitas_mes, k.receitas_mes_anterior)
  const margemOperacional = k.receitas_mes > 0
    ? ((k.receitas_mes - k.gastos_mes) / k.receitas_mes) * 100
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Visão geral da operação</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Motoristas em Rota"
          value={k.motoristas_em_rota ?? 0}
          subtitle={`${k.total_motoristas ?? 0} motoristas no total`}
          icon={Users}
          iconColor="text-blue-500"
        />
        <KpiCard
          title="Veículos em Uso"
          value={k.veiculos_em_uso ?? 0}
          subtitle={`${k.veiculos_disponiveis ?? 0} disponíveis • ${k.veiculos_manutencao ?? 0} em manutenção`}
          icon={Truck}
          iconColor="text-orange-500"
        />
        <KpiCard
          title="Gastos do Mês"
          value={formatCurrency(k.gastos_mes ?? 0)}
          subtitle={`Hoje: ${formatCurrency(k.gastos_hoje ?? 0)}`}
          icon={DollarSign}
          iconColor="text-red-500"
        />
        <KpiCard
          title="Receitas do Mês"
          value={formatCurrency(k.receitas_mes ?? 0)}
          subtitle={`Margem: ${margemOperacional.toFixed(1)}%`}
          icon={TrendingUp}
          iconColor="text-emerald-500"
          trend={variacaoReceitas}
        />
      </div>

      {/* Alertas */}
      {((k.gastos_pendentes_aprovacao ?? 0) > 0 || (vencimentos?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(k.gastos_pendentes_aprovacao ?? 0) > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 text-sm">
                    {k.gastos_pendentes_aprovacao} gasto{k.gastos_pendentes_aprovacao !== 1 ? 's' : ''} aguardando aprovação
                  </p>
                </div>
                <Button size="sm" variant="outline" className="border-amber-400" asChild>
                  <Link href="/financeiro/gastos?status=pendente">Ver</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {(vencimentos?.length ?? 0) > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="font-medium text-red-800 text-sm">
                    {vencimentos?.length} documento{vencimentos?.length !== 1 ? 's' : ''} vencendo em 30 dias
                  </p>
                </div>
                <Button size="sm" variant="outline" className="border-red-400" asChild>
                  <Link href="/veiculos">Ver</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Receitas vs. Despesas — Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ReceitasDespesasChart data={historico ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por Categoria — Mês Atual</CardTitle>
          </CardHeader>
          <CardContent>
            {gastosCat && gastosCat.length > 0 ? (
              <GastosCategoriaChart data={gastosCat} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
                Nenhum gasto registrado este mês
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Viagens ativas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Viagens em Andamento</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/viagens">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {viagens && viagens.length > 0 ? (
            <div className="space-y-3">
              {viagens.map((v) => {
                const motorista = v.users as { nome: string } | null
                const veiculo = v.veiculos as { placa: string } | null
                return (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="bg-blue-100 p-2 rounded">
                      <Car className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {v.origem} → {v.destino}
                      </p>
                      <p className="text-xs text-slate-500">
                        {motorista?.nome} • {veiculo?.placa}
                      </p>
                    </div>
                    <StatusBadge type="viagem" status={v.status} />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma viagem ativa no momento</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
