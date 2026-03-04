import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Route,
  MapPin,
  Truck,
  User,
  Calendar,
  ChevronRight,
  Activity,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react'

interface SearchParams {
  status?: string
  data_inicio?: string
  data_fim?: string
}

interface PageProps {
  searchParams: Promise<SearchParams>
}

export default async function ViagensPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/login')

  const tenantId = profile.tenant_id

  // Build query with filters
  let query = supabase
    .from('viagens')
    .select(
      'id, origem, destino, status, km_inicio, km_fim, created_at, encerrado_em, observacoes, users(id, nome), veiculos(id, placa, modelo)'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (params.status && params.status !== 'todos') {
    query = query.eq('status', params.status)
  }
  if (params.data_inicio) {
    query = query.gte('created_at', params.data_inicio)
  }
  if (params.data_fim) {
    query = query.lte('created_at', params.data_fim + 'T23:59:59')
  }

  query = query.limit(100)

  const { data: viagens } = await query

  // Count by status
  const ativas = viagens?.filter((v) => v.status === 'ativa').length ?? 0
  const encerradas = viagens?.filter((v) => v.status === 'encerrada').length ?? 0
  const canceladas = viagens?.filter((v) => v.status === 'cancelada').length ?? 0

  const statusFilter = params.status ?? 'todos'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Viagens</h1>
          <p className="text-slate-500 mt-1">Acompanhe todas as viagens da frota</p>
        </div>
        <Button asChild>
          <Link href="/viagens/nova">
            <Plus className="size-4" />
            Nova Viagem
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Ativas</p>
            <p className="text-2xl font-bold text-blue-600">{ativas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Encerradas</p>
            <p className="text-2xl font-bold text-slate-700">{encerradas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Canceladas</p>
            <p className="text-2xl font-bold text-red-600">{canceladas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 mr-1">Status:</span>
            {(['todos', 'ativa', 'encerrada', 'cancelada'] as const).map((s) => (
              <Link key={s} href={`/viagens${s !== 'todos' ? `?status=${s}` : ''}`}>
                <Badge
                  variant={statusFilter === s ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                >
                  {s === 'todos'
                    ? 'Todos'
                    : s === 'ativa'
                    ? 'Ativas'
                    : s === 'encerrada'
                    ? 'Encerradas'
                    : 'Canceladas'}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="size-4" />
            {statusFilter === 'todos'
              ? 'Todas as Viagens'
              : statusFilter === 'ativa'
              ? 'Viagens Ativas'
              : statusFilter === 'encerrada'
              ? 'Viagens Encerradas'
              : 'Viagens Canceladas'}
          </CardTitle>
          {!viagens?.length && (
            <CardDescription>
              Nenhuma viagem encontrada com os filtros aplicados.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {viagens && viagens.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rota</TableHead>
                  <TableHead className="hidden sm:table-cell">Motorista</TableHead>
                  <TableHead className="hidden md:table-cell">Veículo</TableHead>
                  <TableHead className="hidden lg:table-cell">Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {viagens.map((v) => {
                  const motorista = v.users as { id: string; nome: string } | null
                  const veiculo = v.veiculos as { id: string; placa: string; modelo: string | null } | null
                  return (
                    <TableRow key={v.id} className="group cursor-pointer hover:bg-slate-50">
                      <TableCell>
                        <Link href={`/viagens/${v.id}`} className="block">
                          <div className="flex items-start gap-1.5">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1 text-sm font-medium text-slate-900">
                                <MapPin className="size-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{v.origem}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-slate-500">
                                <MapPin className="size-3 text-red-400 shrink-0" />
                                <span className="truncate">{v.destino}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {motorista ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <User className="size-3 text-slate-400" />
                            <Link
                              href={`/motoristas/${motorista.id}`}
                              className="hover:underline"
                            >
                              {motorista.nome}
                            </Link>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {veiculo ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <Truck className="size-3 text-slate-400" />
                            <Link
                              href={`/veiculos/${veiculo.id}`}
                              className="font-mono hover:underline"
                            >
                              {veiculo.placa}
                            </Link>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="size-3" />
                          {formatDate(v.created_at)}
                        </div>
                        {v.encerrado_em && (
                          <div className="text-xs text-slate-400">
                            até {formatDate(v.encerrado_em)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="viagem" status={v.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Link href={`/viagens/${v.id}`}>
                            <ChevronRight className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-slate-100 rounded-full p-4 mb-4">
                <Route className="size-8 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-700 mb-1">Nenhuma viagem encontrada</h3>
              <p className="text-sm text-slate-500 mb-4 max-w-xs">
                {statusFilter !== 'todos'
                  ? `Não há viagens com status "${statusFilter}".`
                  : 'Nenhuma viagem registrada ainda. Clique em Nova Viagem para começar.'}
              </p>
              {statusFilter !== 'todos' && (
                <Button variant="outline" asChild>
                  <Link href="/viagens">Ver todas</Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active trips detail */}
      {ativas > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <Activity className="size-4" />
              Viagens em Andamento Agora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {viagens
                ?.filter((v) => v.status === 'ativa')
                .map((v) => {
                  const motorista = v.users as { nome: string } | null
                  const veiculo = v.veiculos as { placa: string } | null
                  return (
                    <Link
                      key={v.id}
                      href={`/viagens/${v.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      <div className="bg-blue-200 p-1.5 rounded">
                        <Truck className="size-4 text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900">
                          {v.origem} → {v.destino}
                        </p>
                        <p className="text-xs text-slate-500">
                          {motorista?.nome ?? '—'} • {veiculo?.placa ?? '—'} • desde{' '}
                          {formatDateTime(v.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-slate-400 shrink-0" />
                    </Link>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Activity className="size-3 text-blue-400" />
            {ativas} ativas
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle className="size-3 text-emerald-400" />
            {encerradas} encerradas
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="size-3 text-red-400" />
            {canceladas} canceladas
          </span>
        </div>
        <span>Exibindo até 100 viagens</span>
      </div>
    </div>
  )
}
