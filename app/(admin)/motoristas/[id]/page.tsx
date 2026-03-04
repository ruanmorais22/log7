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
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  Truck,
  TrendingDown,
  Route,
  AlertTriangle,
  Calendar,
  MapPin,
  Clock,
} from 'lucide-react'

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

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MotoristaDetailPage({ params }: PageProps) {
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

  // Fetch motorista
  const { data: motorista } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('role', 'motorista')
    .single()

  if (!motorista) notFound()

  // Fetch current vehicle assignment
  const { data: assignment } = await supabase
    .from('motorista_veiculo')
    .select('*, veiculos(id, placa, modelo, marca, tipo, status)')
    .eq('motorista_id', id)
    .eq('ativo', true)
    .maybeSingle()

  // Fetch recent viagens (last 10)
  const { data: viagens } = await supabase
    .from('viagens')
    .select('id, origem, destino, status, km_inicio, km_fim, created_at, encerrado_em, veiculos(placa)')
    .eq('motorista_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch total gastos for this motorista
  const { data: gastosData } = await supabase
    .from('gastos')
    .select('valor, categoria, status')
    .eq('motorista_id', id)
    .eq('tenant_id', tenantId)

  const totalGastos = gastosData?.reduce((sum, g) => sum + (g.valor ?? 0), 0) ?? 0
  const gastosAprovados = gastosData?.filter((g) => g.status === 'aprovado').reduce((sum, g) => sum + g.valor, 0) ?? 0
  const totalViagens = viagens?.length ?? 0

  const cnhExpired = isExpiredDate(motorista.cnh_validade)
  const cnhExpiringSoon = !cnhExpired && isExpiringSoon(motorista.cnh_validade, 30)

  const currentVehicle = assignment?.veiculos as {
    id: string
    placa: string
    modelo: string | null
    marca: string | null
    tipo: string
    status: string
  } | null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/motoristas">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{motorista.nome}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Perfil do motorista</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge type="user" status={motorista.status} />
        </div>
      </div>

      {/* CNH alert */}
      {(cnhExpired || cnhExpiringSoon) && (
        <Card className={cnhExpired ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle
              className={`size-5 shrink-0 ${cnhExpired ? 'text-red-500' : 'text-amber-500'}`}
            />
            <p className={`text-sm font-medium ${cnhExpired ? 'text-red-800' : 'text-amber-800'}`}>
              {cnhExpired
                ? `CNH vencida em ${formatDate(motorista.cnh_validade)}. Regularize antes de escalar viagens.`
                : `CNH vence em ${formatDate(motorista.cnh_validade)}. Providencie a renovação.`}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Nome completo</dt>
                  <dd className="font-medium text-slate-900">{motorista.nome}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                    <Mail className="size-3" /> E-mail
                  </dt>
                  <dd className="text-slate-900 text-sm break-all">{motorista.email}</dd>
                </div>
                {motorista.cpf && (
                  <div>
                    <dt className="text-xs text-slate-500 mb-0.5">CPF</dt>
                    <dd className="text-slate-900 text-sm">{motorista.cpf}</dd>
                  </div>
                )}
                {motorista.telefone && (
                  <div>
                    <dt className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                      <Phone className="size-3" /> Telefone
                    </dt>
                    <dd className="text-slate-900 text-sm">{motorista.telefone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5 flex items-center gap-1">
                    <Calendar className="size-3" /> Cadastrado em
                  </dt>
                  <dd className="text-slate-900 text-sm">{formatDate(motorista.created_at)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* CNH Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="size-4" />
                Habilitação (CNH)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Número</dt>
                  <dd className="font-medium text-slate-900">
                    {motorista.cnh_numero ?? <span className="text-slate-400">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Categoria</dt>
                  <dd>
                    {motorista.cnh_categoria ? (
                      <Badge variant="outline">Cat. {motorista.cnh_categoria}</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 mb-0.5">Validade</dt>
                  <dd
                    className={`font-medium text-sm ${
                      cnhExpired
                        ? 'text-red-600'
                        : cnhExpiringSoon
                        ? 'text-amber-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {motorista.cnh_validade
                      ? formatDate(motorista.cnh_validade)
                      : <span className="text-slate-400">—</span>}
                    {cnhExpired && ' (VENCIDA)'}
                    {cnhExpiringSoon && ' (vence em breve)'}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Recent trips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Route className="size-4" />
                Viagens Recentes
              </CardTitle>
              <CardDescription>Últimas 10 viagens do motorista</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {viagens && viagens.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rota</TableHead>
                      <TableHead className="hidden sm:table-cell">Veículo</TableHead>
                      <TableHead className="hidden md:table-cell">Data</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viagens.map((v) => {
                      const veiculo = v.veiculos as { placa: string } | null
                      return (
                        <TableRow key={v.id} className="group">
                          <TableCell>
                            <Link
                              href={`/viagens/${v.id}`}
                              className="hover:underline text-slate-900 font-medium text-sm"
                            >
                              <div className="flex items-center gap-1">
                                <MapPin className="size-3 text-slate-400 shrink-0" />
                                {v.origem}
                              </div>
                              <div className="flex items-center gap-1 text-slate-500">
                                <MapPin className="size-3 shrink-0" />
                                {v.destino}
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-slate-600">
                            {veiculo?.placa ?? '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-slate-500">
                            {formatDate(v.created_at)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge type="viagem" status={v.status} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Route className="size-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Nenhuma viagem registrada</p>
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
              <CardTitle className="text-sm">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Total de Viagens</p>
                <p className="text-2xl font-bold text-slate-900">{totalViagens}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <TrendingDown className="size-3" />
                  Total de Gastos
                </p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(totalGastos)}
                </p>
                <p className="text-xs text-slate-400">
                  Aprovados: {formatCurrency(gastosAprovados)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current vehicle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="size-4" />
                Veículo Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentVehicle ? (
                <div className="space-y-2">
                  <div>
                    <Link
                      href={`/veiculos/${currentVehicle.id}`}
                      className="font-bold text-lg text-slate-900 hover:underline"
                    >
                      {currentVehicle.placa}
                    </Link>
                    {(currentVehicle.marca || currentVehicle.modelo) && (
                      <p className="text-sm text-slate-500">
                        {[currentVehicle.marca, currentVehicle.modelo].filter(Boolean).join(' ')}
                      </p>
                    )}
                  </div>
                  <StatusBadge type="veiculo" status={currentVehicle.status} />
                  {assignment?.data_inicio && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="size-3" />
                      Desde {formatDate(assignment.data_inicio)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Truck className="size-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Sem veículo atribuído</p>
                  <Button size="sm" variant="outline" className="mt-3" asChild>
                    <Link href="/veiculos">Atribuir veículo</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href={`/motoristas/${id}/editar`}>
                  Editar dados
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                size="sm"
                asChild
              >
                <Link href={`/motoristas/${id}/desativar`}>
                  Desativar motorista
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
