import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TIPOS_CHECKPOINT, CATEGORIAS_GASTO } from '@/lib/constants'
import {
  ArrowLeft,
  MapPin,
  Truck,
  User,
  Gauge,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Square,
  Clock,
  Package,
  Route,
  Fuel,
  AlertTriangle,
  CheckCircle,
  Flag,
  Navigation,
  Wrench,
  Utensils,
  BedDouble,
  Droplets,
  FileText,
} from 'lucide-react'

// Checkpoint type → icon mapping
const checkpointIcons: Record<string, React.ReactNode> = {
  saida: <Navigation className="size-4" />,
  carregamento: <Package className="size-4" />,
  em_rota: <Route className="size-4" />,
  parada_tecnica: <Fuel className="size-4" />,
  entrega_realizada: <CheckCircle className="size-4" />,
  ocorrencia: <AlertTriangle className="size-4" />,
  chegada: <Flag className="size-4" />,
}

const checkpointColors: Record<string, string> = {
  saida: 'bg-blue-100 text-blue-600 border-blue-200',
  carregamento: 'bg-purple-100 text-purple-600 border-purple-200',
  em_rota: 'bg-slate-100 text-slate-600 border-slate-200',
  parada_tecnica: 'bg-amber-100 text-amber-600 border-amber-200',
  entrega_realizada: 'bg-emerald-100 text-emerald-600 border-emerald-200',
  ocorrencia: 'bg-red-100 text-red-600 border-red-200',
  chegada: 'bg-green-100 text-green-600 border-green-200',
}

// Gasto category → icon mapping
const gastoIcons: Record<string, React.ReactNode> = {
  combustivel: <Fuel className="size-4" />,
  pedagio: <Route className="size-4" />,
  manutencao_rota: <Wrench className="size-4" />,
  alimentacao: <Utensils className="size-4" />,
  hospedagem: <BedDouble className="size-4" />,
  lavagem: <Droplets className="size-4" />,
  multa: <AlertTriangle className="size-4" />,
  outros: <FileText className="size-4" />,
}

function checkpointLabel(tipo: string): string {
  return TIPOS_CHECKPOINT.find((t) => t.value === tipo)?.label ?? tipo
}

function gastoLabel(categoria: string): string {
  return CATEGORIAS_GASTO.find((c) => c.value === categoria)?.label ?? categoria
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ViagemDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const tenantId = profile.tenant_id

  // Fetch viagem with relations
  const { data: viagem } = await supabase
    .from('viagens')
    .select(
      'id, origem, destino, status, km_inicio, km_fim, observacoes, created_at, encerrado_em, motorista_id, veiculo_id, users(id, nome, email, telefone), veiculos(id, placa, modelo, marca, tipo)'
    )
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!viagem) notFound()

  // Fetch checkpoints ordered by created_at
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('viagem_id', id)
    .order('created_at', { ascending: true })

  // Fetch gastos for this viagem
  const { data: gastos } = await supabase
    .from('gastos')
    .select('*')
    .eq('viagem_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // Fetch receitas for this viagem
  const { data: receitas } = await supabase
    .from('receitas')
    .select('*')
    .eq('viagem_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // Financial calculations
  const totalGastos = gastos?.reduce((sum, g) => sum + g.valor, 0) ?? 0
  const totalReceitas = receitas?.reduce((sum, r) => sum + r.valor, 0) ?? 0
  const resultado = totalReceitas - totalGastos
  const kmPercorrido =
    viagem.km_fim && viagem.km_inicio ? viagem.km_fim - viagem.km_inicio : null

  const motorista = viagem.users as {
    id: string
    nome: string
    email: string
    telefone: string | null
  } | null
  const veiculo = viagem.veiculos as {
    id: string
    placa: string
    modelo: string | null
    marca: string | null
    tipo: string
  } | null

  const isActive = viagem.status === 'ativa'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" asChild className="mt-1">
          <Link href="/viagens">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              {viagem.origem} → {viagem.destino}
            </h1>
            <StatusBadge type="viagem" status={viagem.status} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              Iniciada {formatDateTime(viagem.created_at)}
            </span>
            {viagem.encerrado_em && (
              <span className="flex items-center gap-1">
                <CheckCircle className="size-3.5" />
                Encerrada {formatDateTime(viagem.encerrado_em)}
              </span>
            )}
          </div>
        </div>
        {isActive && (
          <Button
            variant="outline"
            className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700 shrink-0"
            asChild
          >
            <Link href={`/viagens/${id}/encerrar`}>
              <Square className="size-4" />
              Encerrar Viagem
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Trip info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações da Viagem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                    <MapPin className="size-3 text-emerald-500" /> Origem
                  </p>
                  <p className="font-medium text-slate-900 text-sm">{viagem.origem}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                    <MapPin className="size-3 text-red-400" /> Destino
                  </p>
                  <p className="font-medium text-slate-900 text-sm">{viagem.destino}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                    <Gauge className="size-3" /> KM Início
                  </p>
                  <p className="text-sm text-slate-900">
                    {viagem.km_inicio != null
                      ? `${viagem.km_inicio?.toLocaleString('pt-BR')} km`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                    <Gauge className="size-3" /> KM Fim
                  </p>
                  <p className="text-sm text-slate-900">
                    {viagem.km_fim != null
                      ? `${viagem.km_fim?.toLocaleString('pt-BR')} km`
                      : isActive
                      ? 'Em andamento'
                      : '—'}
                  </p>
                </div>
                {kmPercorrido != null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">KM Percorrido</p>
                    <p className="font-medium text-slate-900 text-sm">
                      {kmPercorrido.toLocaleString('pt-BR')} km
                    </p>
                  </div>
                )}
                {viagem.observacoes && (
                  <div className="col-span-2 sm:col-span-4">
                    <p className="text-xs text-slate-500 mb-0.5">Observações</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-2">
                      {viagem.observacoes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checkpoint timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Route className="size-4" />
                Timeline de Checkpoints
              </CardTitle>
              <CardDescription>
                {checkpoints?.length ?? 0} checkpoint{checkpoints?.length !== 1 ? 's' : ''}{' '}
                registrado{checkpoints?.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {checkpoints && checkpoints.length > 0 ? (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-200" />

                  <div className="space-y-4">
                    {checkpoints.map((cp, idx) => {
                      const isLast = idx === checkpoints.length - 1
                      const colorClass = checkpointColors[cp.tipo] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                      const icon = checkpointIcons[cp.tipo] ?? <MapPin className="size-4" />

                      return (
                        <div key={cp.id} className="relative flex gap-4">
                          {/* Icon bubble */}
                          <div
                            className={`relative z-10 flex items-center justify-center size-10 rounded-full border-2 shrink-0 ${colorClass}`}
                          >
                            {icon}
                          </div>

                          {/* Content */}
                          <div
                            className={`flex-1 pb-4 ${isLast ? '' : 'border-b border-slate-100'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm text-slate-900">
                                  {checkpointLabel(cp.tipo)}
                                </p>
                                {cp.descricao && (
                                  <p className="text-sm text-slate-600 mt-0.5">{cp.descricao}</p>
                                )}
                                {cp.km_atual != null && (
                                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                    <Gauge className="size-3" />
                                    {cp.km_atual.toLocaleString('pt-BR')} km
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                                {formatDateTime(cp.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Route className="size-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Nenhum checkpoint registrado ainda</p>
                  {isActive && (
                    <p className="text-xs text-slate-400 mt-1">
                      Os checkpoints são registrados pelo motorista no aplicativo.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gastos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="size-4 text-red-500" />
                Gastos da Viagem
              </CardTitle>
              <CardDescription>
                Total: {formatCurrency(totalGastos)} em {gastos?.length ?? 0} lançamento
                {gastos?.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {gastos && gastos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                      <TableHead className="hidden md:table-cell">Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gastos.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-500">
                              {gastoIcons[g.categoria] ?? <FileText className="size-4" />}
                            </span>
                            <span className="text-slate-700">{gastoLabel(g.categoria)}</span>
                          </div>
                          {g.litros && (
                            <p className="text-xs text-slate-400 mt-0.5 ml-6">
                              {g.litros}L • {g.posto_cidade ?? ''}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-600 max-w-[200px] truncate">
                          {g.descricao ?? '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-slate-500">
                          {formatDate(g.created_at)}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600 text-sm">
                          {formatCurrency(g.valor)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge type="gasto" status={g.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <DollarSign className="size-7 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Nenhum gasto registrado nesta viagem</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receitas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-500" />
                Receitas da Viagem
              </CardTitle>
              <CardDescription>
                Total: {formatCurrency(totalReceitas)} em {receitas?.length ?? 0} lançamento
                {receitas?.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {receitas && receitas.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell">Pagador</TableHead>
                      <TableHead className="hidden md:table-cell">Forma</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receitas.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="text-sm text-slate-700">
                            {r.tipo === 'pagamento_entrega'
                              ? 'Pagamento na Entrega'
                              : r.tipo === 'coleta_valor'
                              ? 'Coleta de Valor'
                              : r.tipo === 'reembolso'
                              ? 'Reembolso'
                              : 'Outros'}
                          </div>
                          {r.descricao && (
                            <p className="text-xs text-slate-400 truncate max-w-[150px]">
                              {r.descricao}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-600">
                          {r.nome_pagador ?? '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {r.forma_pagamento && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {r.forma_pagamento.toUpperCase()}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-emerald-600 text-sm">
                          {formatCurrency(r.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <TrendingUp className="size-7 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma receita registrada nesta viagem</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Financial summary */}
          <Card className={resultado >= 0 ? 'border-emerald-200' : 'border-red-200'}>
            <CardHeader>
              <CardTitle className="text-sm">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 flex items-center gap-1">
                  <TrendingUp className="size-3.5 text-emerald-500" />
                  Receitas
                </span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(totalReceitas)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 flex items-center gap-1">
                  <TrendingDown className="size-3.5 text-red-500" />
                  Gastos
                </span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(totalGastos)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Resultado</span>
                <span
                  className={`font-bold text-lg ${
                    resultado >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {resultado >= 0 ? '+' : ''}
                  {formatCurrency(resultado)}
                </span>
              </div>
              {totalReceitas > 0 && (
                <div className="text-xs text-slate-400 text-right">
                  Margem:{' '}
                  {(((totalReceitas - totalGastos) / totalReceitas) * 100).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>

          {/* Motorista card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4" />
                Motorista
              </CardTitle>
            </CardHeader>
            <CardContent>
              {motorista ? (
                <div className="space-y-1.5">
                  <Link
                    href={`/motoristas/${motorista.id}`}
                    className="font-semibold text-slate-900 hover:underline block"
                  >
                    {motorista.nome}
                  </Link>
                  <p className="text-xs text-slate-500">{motorista.email}</p>
                  {motorista.telefone && (
                    <p className="text-xs text-slate-500">{motorista.telefone}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">—</p>
              )}
            </CardContent>
          </Card>

          {/* Vehicle card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="size-4" />
                Veículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {veiculo ? (
                <div className="space-y-1.5">
                  <Link
                    href={`/veiculos/${veiculo.id}`}
                    className="font-bold text-slate-900 hover:underline font-mono block"
                  >
                    {veiculo.placa}
                  </Link>
                  {(veiculo.marca || veiculo.modelo) && (
                    <p className="text-xs text-slate-500">
                      {[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">—</p>
              )}
            </CardContent>
          </Card>

          {/* Checkpoint count */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Checkpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TIPOS_CHECKPOINT.map((tipo) => {
                  const count =
                    checkpoints?.filter((cp) => cp.tipo === tipo.value).length ?? 0
                  if (count === 0) return null
                  const colorClass = checkpointColors[tipo.value] ?? 'bg-slate-100 text-slate-600'
                  return (
                    <div key={tipo.value} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center size-6 rounded-full text-xs ${colorClass}`}
                        >
                          {checkpointIcons[tipo.value]}
                        </span>
                        <span className="text-xs text-slate-600">{tipo.label}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  )
                })}
                {!checkpoints?.length && (
                  <p className="text-xs text-slate-400">Sem checkpoints</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isActive && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-sm text-red-800">Ações Administrativas</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full text-red-700 border-red-300 hover:bg-red-100"
                  asChild
                >
                  <Link href={`/viagens/${id}/encerrar`}>
                    <Square className="size-4" />
                    Forçar encerramento
                  </Link>
                </Button>
                <p className="text-xs text-red-600 mt-2">
                  Use apenas em caso de emergência ou quando o motorista não puder encerrar no app.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
