import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Truck,
  Gauge,
  Wrench,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  FileText,
  Shield,
  Activity,
} from 'lucide-react'
import { TIPOS_VEICULO, COMBUSTIVEIS, TIPOS_MANUTENCAO } from '@/lib/constants'

function isExpiredDate(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

function isExpiringSoon(date: string | null, days = 30): boolean {
  if (!date) return false
  const d = new Date(date)
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + days)
  return d >= new Date() && d <= threshold
}

function DocStatus({ date, label }: { date: string | null; label: string }) {
  const expired = isExpiredDate(date)
  const expiringSoon = !expired && isExpiringSoon(date, 30)
  const ok = date && !expired && !expiringSoon

  return (
    <div
      className={`p-3 rounded-lg border ${
        expired
          ? 'bg-red-50 border-red-200'
          : expiringSoon
          ? 'bg-amber-50 border-amber-200'
          : ok
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        {expired ? (
          <AlertTriangle className="size-3.5 text-red-500" />
        ) : expiringSoon ? (
          <AlertTriangle className="size-3.5 text-amber-500" />
        ) : ok ? (
          <CheckCircle className="size-3.5 text-emerald-500" />
        ) : (
          <FileText className="size-3.5 text-slate-400" />
        )}
      </div>
      {date ? (
        <p
          className={`text-sm font-semibold ${
            expired ? 'text-red-700' : expiringSoon ? 'text-amber-700' : 'text-emerald-700'
          }`}
        >
          {formatDate(date)}
          {expired && ' — VENCIDO'}
          {expiringSoon && ' — Vence em breve'}
        </p>
      ) : (
        <p className="text-sm text-slate-400">Não informado</p>
      )}
    </div>
  )
}

function tipoLabel(tipo: string): string {
  return TIPOS_VEICULO.find((t) => t.value === tipo)?.label ?? tipo
}

function combustivelLabel(c: string | null): string {
  if (!c) return '—'
  return COMBUSTIVEIS.find((f) => f.value === c)?.label ?? c
}

function manutencaoTipoLabel(tipo: string): string {
  return TIPOS_MANUTENCAO.find((t) => t.value === tipo)?.label ?? tipo
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VeiculoDetailPage({ params }: PageProps) {
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

  // Fetch vehicle
  const { data: veiculo } = await supabase
    .from('veiculos')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!veiculo) notFound()

  // Current driver
  const { data: assignment } = await supabase
    .from('motorista_veiculo')
    .select('*, users(id, nome, email, status, cnh_validade, cnh_categoria)')
    .eq('veiculo_id', id)
    .eq('ativo', true)
    .maybeSingle()

  // Recent maintenance history (last 10)
  const { data: manutencoes } = await supabase
    .from('manutencoes')
    .select('*')
    .eq('veiculo_id', id)
    .eq('tenant_id', tenantId)
    .order('data', { ascending: false })
    .limit(10)

  // Total maintenance cost
  const totalManutencao =
    manutencoes?.reduce((sum, m) => sum + (m.custo ?? 0), 0) ?? 0

  // Recent trips for this vehicle
  const { data: viagens } = await supabase
    .from('viagens')
    .select('id, origem, destino, status, created_at, users(nome)')
    .eq('veiculo_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(5)

  const currentDriver = assignment?.users as {
    id: string
    nome: string
    email: string
    status: string
    cnh_validade: string | null
    cnh_categoria: string | null
  } | null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/veiculos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{veiculo.placa}</h1>
            <StatusBadge type="veiculo" status={veiculo.status} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {tipoLabel(veiculo.tipo)}
            {(veiculo.marca || veiculo.modelo) &&
              ` — ${[veiculo.marca, veiculo.modelo, veiculo.ano].filter(Boolean).join(' ')}`}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/veiculos/${id}/editar`}>Editar</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Vehicle info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="size-4" />
                Dados do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Placa</dt>
                  <dd className="font-bold text-slate-900 font-mono">{veiculo.placa}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Tipo</dt>
                  <dd className="text-sm text-slate-900">{tipoLabel(veiculo.tipo)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Combustível</dt>
                  <dd className="text-sm text-slate-900">{combustivelLabel(veiculo.combustivel)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Marca</dt>
                  <dd className="text-sm text-slate-900">{veiculo.marca ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Modelo</dt>
                  <dd className="text-sm text-slate-900">{veiculo.modelo ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Ano</dt>
                  <dd className="text-sm text-slate-900">{veiculo.ano ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                    <Gauge className="size-3" /> KM Atual
                  </dt>
                  <dd className="font-medium text-slate-900">
                    {veiculo.km_atual?.toLocaleString('pt-BR')} km
                  </dd>
                </div>
                {veiculo.km_proxima_revisao && (
                  <div>
                    <dt className="text-xs text-slate-500 mb-0.5">Próxima Revisão</dt>
                    <dd
                      className={`text-sm font-medium ${
                        veiculo.km_atual >= veiculo.km_proxima_revisao
                          ? 'text-red-600'
                          : veiculo.km_proxima_revisao - veiculo.km_atual <= 5000
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {veiculo.km_proxima_revisao?.toLocaleString('pt-BR')} km
                      {veiculo.km_atual >= veiculo.km_proxima_revisao && ' — ATRASADA'}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4" />
                Documentação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <DocStatus date={veiculo.crlv_vencimento} label="CRLV" />
                <div className="space-y-2">
                  <DocStatus date={veiculo.antt_vencimento} label="ANTT / RNTRC" />
                  {veiculo.antt && (
                    <p className="text-xs text-slate-500 px-1">Nº: {veiculo.antt}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <DocStatus date={veiculo.seguro_vencimento} label="Seguro" />
                  {veiculo.seguro_seguradora && (
                    <p className="text-xs text-slate-500 px-1">{veiculo.seguro_seguradora}</p>
                  )}
                  {veiculo.seguro_apolice && (
                    <p className="text-xs text-slate-400 px-1">Apólice: {veiculo.seguro_apolice}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance history */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="size-4" />
                  Histórico de Manutenção
                </CardTitle>
                <CardDescription>Últimas 10 manutenções</CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/manutencoes/nova?veiculo=${id}`}>Nova manutenção</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {manutencoes && manutencoes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                      <TableHead className="hidden md:table-cell">Oficina</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manutencoes.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm text-slate-600">
                          {formatDate(m.data)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              m.tipo === 'emergencial'
                                ? 'bg-red-100 text-red-700 border-0'
                                : m.tipo === 'corretiva'
                                ? 'bg-amber-100 text-amber-700 border-0'
                                : 'bg-blue-100 text-blue-700 border-0'
                            }
                          >
                            {manutencaoTipoLabel(m.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-slate-600 max-w-[200px] truncate">
                          {m.descricao}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-500">
                          {m.oficina ?? '—'}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {formatCurrency(m.custo ?? 0)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge type="manutencao" status={m.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Wrench className="size-7 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma manutenção registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="size-4" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Viagens realizadas</p>
                <p className="text-2xl font-bold text-slate-900">{viagens?.length ?? 0}</p>
                <p className="text-xs text-slate-400">(últimas 5 exibidas)</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Custo de Manutenção</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatCurrency(totalManutencao)}
                </p>
                <p className="text-xs text-slate-400">Últimas 10 manutenções</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Cadastrado em</p>
                <p className="text-sm text-slate-700 flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDate(veiculo.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current driver */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="size-4" />
                Motorista Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentDriver ? (
                <div className="space-y-2">
                  <Link
                    href={`/motoristas/${currentDriver.id}`}
                    className="font-semibold text-slate-900 hover:underline block"
                  >
                    {currentDriver.nome}
                  </Link>
                  <StatusBadge type="user" status={currentDriver.status} />
                  {currentDriver.cnh_categoria && (
                    <p className="text-xs text-slate-500">
                      CNH Cat. {currentDriver.cnh_categoria}
                      {currentDriver.cnh_validade &&
                        ` — válida até ${formatDate(currentDriver.cnh_validade)}`}
                    </p>
                  )}
                  {assignment?.data_inicio && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="size-3" />
                      Desde {formatDate(assignment.data_inicio)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="size-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Sem motorista atribuído</p>
                  <Button size="sm" variant="outline" className="mt-3 w-full" asChild>
                    <Link href="/motoristas">Atribuir motorista</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent viagens */}
          {viagens && viagens.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Viagens Recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {viagens.map((v) => {
                  const motorista = v.users as { nome: string } | null
                  return (
                    <Link
                      key={v.id}
                      href={`/viagens/${v.id}`}
                      className="block p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {v.origem} → {v.destino}
                          </p>
                          {motorista?.nome && (
                            <p className="text-xs text-slate-500">{motorista.nome}</p>
                          )}
                        </div>
                        <StatusBadge type="viagem" status={v.status} />
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
