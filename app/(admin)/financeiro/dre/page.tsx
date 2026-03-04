import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'

interface DREPageProps {
  searchParams: Promise<{ inicio?: string; fim?: string }>
}

function getDefaultDates() {
  const now = new Date()
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const fim = now.toISOString().slice(0, 10)
  return { inicio, fim }
}

function getPreviousPeriod(inicio: string, fim: string) {
  const start = new Date(inicio)
  const end = new Date(fim)
  const diffMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  return {
    inicio: prevStart.toISOString().slice(0, 10),
    fim: prevEnd.toISOString().slice(0, 10),
  }
}

type DRERow = {
  receita_fretes: number
  outras_receitas: number
  receita_total: number
  custo_combustivel: number
  custo_pedagio: number
  custo_manutencao: number
  custo_alimentacao: number
  custo_hospedagem: number
  outros_custos: number
  total_despesas: number
  resultado_operacional: number
}

function DRELine({
  prefix,
  label,
  value,
  bold = false,
  colorClass,
}: {
  prefix: string
  label: string
  value: number
  bold?: boolean
  colorClass?: string
}) {
  return (
    <tr className={bold ? 'bg-slate-50' : ''}>
      <td className={`py-2 px-4 text-sm ${bold ? 'font-semibold' : 'font-normal'} text-slate-600 w-8`}>
        {prefix}
      </td>
      <td className={`py-2 px-2 text-sm ${bold ? 'font-semibold text-slate-900' : 'text-slate-700'} flex-1`}>
        {label}
      </td>
      <td className={`py-2 px-4 text-sm text-right tabular-nums whitespace-nowrap ${bold ? 'font-bold' : 'font-medium'} ${colorClass ?? 'text-slate-800'}`}>
        {formatCurrency(value)}
      </td>
    </tr>
  )
}

function DRESeparator() {
  return (
    <tr>
      <td colSpan={3} className="px-4 py-0">
        <div className="h-px bg-slate-200" />
      </td>
    </tr>
  )
}

export default async function DREPage({ searchParams }: DREPageProps) {
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

  const params = await searchParams
  const defaults = getDefaultDates()
  const inicio = params.inicio ?? defaults.inicio
  const fim = params.fim ?? defaults.fim

  // Fetch current period DRE
  const { data: dreRaw, error: dreError } = await supabase.rpc('calcular_dre', {
    p_tenant_id: tenantId,
    p_inicio: inicio,
    p_fim: fim,
  })

  if (dreError) console.error('Erro ao calcular DRE:', dreError)

  const dre: DRERow = (dreRaw as DRERow[] | null)?.[0] ?? {
    receita_fretes: 0,
    outras_receitas: 0,
    receita_total: 0,
    custo_combustivel: 0,
    custo_pedagio: 0,
    custo_manutencao: 0,
    custo_alimentacao: 0,
    custo_hospedagem: 0,
    outros_custos: 0,
    total_despesas: 0,
    resultado_operacional: 0,
  }

  // Fetch comparison period (previous period)
  const prev = getPreviousPeriod(inicio, fim)
  const { data: dreAnteriorRaw } = await supabase.rpc('calcular_dre', {
    p_tenant_id: tenantId,
    p_inicio: prev.inicio,
    p_fim: prev.fim,
  })

  const dreAnterior: DRERow = (dreAnteriorRaw as DRERow[] | null)?.[0] ?? {
    receita_fretes: 0,
    outras_receitas: 0,
    receita_total: 0,
    custo_combustivel: 0,
    custo_pedagio: 0,
    custo_manutencao: 0,
    custo_alimentacao: 0,
    custo_hospedagem: 0,
    outros_custos: 0,
    total_despesas: 0,
    resultado_operacional: 0,
  }

  const margemOperacional = dre.receita_total > 0
    ? (dre.resultado_operacional / dre.receita_total) * 100
    : 0

  const margemAnterior = dreAnterior.receita_total > 0
    ? (dreAnterior.resultado_operacional / dreAnterior.receita_total) * 100
    : 0

  const isPositive = dre.resultado_operacional >= 0
  const variacaoReceita = dreAnterior.receita_total > 0
    ? ((dre.receita_total - dreAnterior.receita_total) / dreAnterior.receita_total) * 100
    : null

  // Shortcuts helpers
  const now = new Date()
  const mesAtualInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const mesAtualFim = now.toISOString().slice(0, 10)
  const mesAnteriorInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const mesAnteriorFim = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
  const trimestreInicio = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10)
  const anoInicio = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">DRE — Demonstrativo de Resultado</h1>
          <p className="text-slate-500 text-sm">
            Período: {new Date(inicio + 'T00:00:00').toLocaleDateString('pt-BR')} a{' '}
            {new Date(fim + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button variant="outline" size="sm" disabled className="text-slate-400 cursor-not-allowed">
          <FileText className="h-4 w-4 mr-2" />
          Exportar PDF
          <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Em breve</span>
        </Button>
      </div>

      {/* Period Shortcuts */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium">Período:</span>
        <Link
          href={`/financeiro/dre?inicio=${mesAtualInicio}&fim=${mesAtualFim}`}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            inicio === mesAtualInicio && fim === mesAtualFim
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
          }`}
        >
          Mês Atual
        </Link>
        <Link
          href={`/financeiro/dre?inicio=${mesAnteriorInicio}&fim=${mesAnteriorFim}`}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            inicio === mesAnteriorInicio && fim === mesAnteriorFim
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
          }`}
        >
          Mês Anterior
        </Link>
        <Link
          href={`/financeiro/dre?inicio=${trimestreInicio}&fim=${mesAtualFim}`}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            inicio === trimestreInicio && fim === mesAtualFim
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
          }`}
        >
          Trimestre
        </Link>
        <Link
          href={`/financeiro/dre?inicio=${anoInicio}&fim=${mesAtualFim}`}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            inicio === anoInicio && fim === mesAtualFim
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:text-orange-600'
          }`}
        >
          Ano
        </Link>
      </div>

      {/* Date Filter Form */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <form method="GET" action="/financeiro/dre" className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1">
              <label htmlFor="inicio" className="text-xs font-medium text-slate-600">
                Data inicial
              </label>
              <input
                id="inicio"
                name="inicio"
                type="date"
                defaultValue={inicio}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="fim" className="text-xs font-medium text-slate-600">
                Data final
              </label>
              <input
                id="fim"
                name="fim"
                type="date"
                defaultValue={fim}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-emerald-600 font-medium uppercase tracking-wide">
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-emerald-700">{formatCurrency(dre.receita_total)}</p>
            {variacaoReceita !== null && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${variacaoReceita >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {variacaoReceita >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {variacaoReceita >= 0 ? '+' : ''}{variacaoReceita.toFixed(1)}% vs período anterior
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-red-600 font-medium uppercase tracking-wide">
              Total Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-red-700">{formatCurrency(dre.total_despesas)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Anterior: {formatCurrency(dreAnterior.total_despesas)}
            </p>
          </CardContent>
        </Card>
        <Card className={isPositive ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-xs font-medium uppercase tracking-wide ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              Resultado Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
              {formatCurrency(dre.resultado_operacional)}
            </p>
            <p className={`text-xs mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              Margem: {margemOperacional.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
            Demonstrativo de Resultado do Exercício
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <tbody>
              <DRELine prefix="(+)" label="Receita Bruta de Fretes" value={dre.receita_fretes} />
              <DRELine prefix="(+)" label="Outras Receitas" value={dre.outras_receitas} />
              <DRESeparator />
              <DRELine
                prefix="(=)"
                label="RECEITA TOTAL"
                value={dre.receita_total}
                bold
                colorClass="text-emerald-700"
              />
              <tr><td colSpan={3} className="py-2" /></tr>
              <DRELine prefix="(-)" label="Combustível" value={dre.custo_combustivel} colorClass="text-red-600" />
              <DRELine prefix="(-)" label="Pedágios" value={dre.custo_pedagio} colorClass="text-red-600" />
              <DRELine prefix="(-)" label="Manutenções" value={dre.custo_manutencao} colorClass="text-red-600" />
              <DRELine prefix="(-)" label="Alimentação e Hospedagem" value={dre.custo_alimentacao + dre.custo_hospedagem} colorClass="text-red-600" />
              <DRELine prefix="(-)" label="Outros Custos Operacionais" value={dre.outros_custos} colorClass="text-red-600" />
              <DRESeparator />
              <DRELine
                prefix="(=)"
                label="TOTAL DE DESPESAS"
                value={dre.total_despesas}
                bold
                colorClass="text-red-700"
              />
              <DRESeparator />
              <DRELine
                prefix="(=)"
                label="RESULTADO OPERACIONAL"
                value={dre.resultado_operacional}
                bold
                colorClass={isPositive ? 'text-emerald-700' : 'text-red-700'}
              />
              <tr className="bg-slate-50">
                <td className="py-2 px-4 text-sm font-medium text-slate-600 w-8">
                  <Minus className="h-3 w-3" />
                </td>
                <td className="py-2 px-2 text-sm font-semibold text-slate-800">
                  Margem Operacional
                </td>
                <td className={`py-2 px-4 text-sm text-right font-bold tabular-nums ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                  {margemOperacional.toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Period Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700">
            Comparativo com Período Anterior
          </CardTitle>
          <p className="text-xs text-slate-500">
            {new Date(prev.inicio + 'T00:00:00').toLocaleDateString('pt-BR')} a{' '}
            {new Date(prev.fim + 'T00:00:00').toLocaleDateString('pt-BR')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Receita Total', current: dre.receita_total, previous: dreAnterior.receita_total },
              { label: 'Total Despesas', current: dre.total_despesas, previous: dreAnterior.total_despesas },
              { label: 'Resultado', current: dre.resultado_operacional, previous: dreAnterior.resultado_operacional },
              { label: 'Margem Operacional', current: margemOperacional, previous: margemAnterior, isPercent: true },
            ].map((item) => {
              const diff = item.current - item.previous
              const positive = item.label === 'Total Despesas' ? diff <= 0 : diff >= 0
              return (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {item.isPercent ? `${item.current.toFixed(1)}%` : formatCurrency(item.current)}
                  </span>
                  <span className={`text-xs flex items-center gap-1 ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {item.isPercent
                      ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`
                      : `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
