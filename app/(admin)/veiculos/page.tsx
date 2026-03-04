import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Truck,
  PlusCircle,
  AlertTriangle,
  ChevronRight,
  User,
  Gauge,
  FileWarning,
} from 'lucide-react'
import { TIPOS_VEICULO } from '@/lib/constants'

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

function getVehicleDocAlerts(v: {
  crlv_vencimento: string | null
  seguro_vencimento: string | null
  antt_vencimento: string | null
}): string[] {
  const alerts: string[] = []
  if (isExpiredDate(v.crlv_vencimento)) alerts.push('CRLV vencido')
  else if (isExpiringSoon(v.crlv_vencimento)) alerts.push('CRLV vence em breve')
  if (isExpiredDate(v.seguro_vencimento)) alerts.push('Seguro vencido')
  else if (isExpiringSoon(v.seguro_vencimento)) alerts.push('Seguro vence em breve')
  if (isExpiredDate(v.antt_vencimento)) alerts.push('ANTT vencida')
  else if (isExpiringSoon(v.antt_vencimento)) alerts.push('ANTT vence em breve')
  return alerts
}

function tipoLabel(tipo: string): string {
  return TIPOS_VEICULO.find((t) => t.value === tipo)?.label ?? tipo
}

export default async function VeiculosPage() {
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

  const { data: veiculos } = await supabase
    .from('veiculos')
    .select(
      '*, motorista_veiculo(motorista_id, ativo, users(nome))'
    )
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('placa')

  // Count by status
  const disponivel = veiculos?.filter((v) => v.status === 'disponivel').length ?? 0
  const emRota = veiculos?.filter((v) => v.status === 'em_rota').length ?? 0
  const manutencao = veiculos?.filter((v) => v.status === 'manutencao').length ?? 0

  // Vehicles with doc alerts
  const comAlerta = veiculos?.filter((v) => {
    return (
      isExpiredDate(v.crlv_vencimento) ||
      isExpiringSoon(v.crlv_vencimento) ||
      isExpiredDate(v.seguro_vencimento) ||
      isExpiringSoon(v.seguro_vencimento) ||
      isExpiredDate(v.antt_vencimento) ||
      isExpiringSoon(v.antt_vencimento)
    )
  }) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Veículos</h1>
          <p className="text-slate-500 mt-1">Gerencie a frota de veículos</p>
        </div>
        <Button asChild>
          <Link href="/veiculos/novo">
            <PlusCircle className="size-4" />
            Novo Veículo
          </Link>
        </Button>
      </div>

      {/* Document expiry alert */}
      {comAlerta.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <FileWarning className="size-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                {comAlerta.length} veículo{comAlerta.length !== 1 ? 's' : ''} com documentação vencida ou próxima do vencimento.
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-400 shrink-0" asChild>
              <Link href="#alertas">Ver</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{veiculos?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Disponíveis</p>
            <p className="text-2xl font-bold text-emerald-600">{disponivel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Em Rota</p>
            <p className="text-2xl font-bold text-blue-600">{emRota}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Manutenção</p>
            <p className="text-2xl font-bold text-amber-600">{manutencao}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicles table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="size-4" />
            Frota Ativa
          </CardTitle>
          {!veiculos?.length && (
            <CardDescription>Nenhum veículo cadastrado ainda.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {veiculos && veiculos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo / Modelo</TableHead>
                  <TableHead className="hidden md:table-cell">Motorista</TableHead>
                  <TableHead className="hidden lg:table-cell">KM Atual</TableHead>
                  <TableHead className="hidden md:table-cell">Documentos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {veiculos.map((v) => {
                  const assignments = v.motorista_veiculo as Array<{
                    motorista_id: string
                    ativo: boolean
                    users: { nome: string } | null
                  }> | null
                  const activeDriver = assignments?.find((a) => a.ativo)?.users ?? null
                  const docAlerts = getVehicleDocAlerts(v)
                  const hasExpired = docAlerts.some(
                    (a) => a.includes('vencido') || a.includes('vencida')
                  )

                  return (
                    <TableRow key={v.id} className="group">
                      <TableCell>
                        <Link
                          href={`/veiculos/${v.id}`}
                          className="font-bold text-slate-900 hover:underline font-mono"
                        >
                          {v.placa}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{tipoLabel(v.tipo)}</p>
                          {(v.marca || v.modelo) && (
                            <p className="text-xs text-slate-400">
                              {[v.marca, v.modelo, v.ano].filter(Boolean).join(' ')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {activeDriver ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-700">
                            <User className="size-3 text-slate-400" />
                            {activeDriver.nome}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Gauge className="size-3 text-slate-400" />
                          {v.km_atual?.toLocaleString('pt-BR')} km
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {docAlerts.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {docAlerts.map((alert) => (
                              <div key={alert} className="flex items-center gap-1">
                                <AlertTriangle
                                  className={`size-3 shrink-0 ${
                                    hasExpired ? 'text-red-500' : 'text-amber-500'
                                  }`}
                                />
                                <span
                                  className={`text-xs ${
                                    hasExpired ? 'text-red-600' : 'text-amber-600'
                                  }`}
                                >
                                  {alert}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-emerald-700 border-emerald-200 bg-emerald-50 text-xs"
                          >
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="veiculo" status={v.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Link href={`/veiculos/${v.id}`}>
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
                <Truck className="size-8 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-700 mb-1">Nenhum veículo cadastrado</h3>
              <p className="text-sm text-slate-500 mb-4 max-w-xs">
                Adicione veículos para começar a gerenciar sua frota.
              </p>
              <Button asChild>
                <Link href="/veiculos/novo">
                  <PlusCircle className="size-4" />
                  Adicionar primeiro veículo
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document alerts section */}
      {comAlerta.length > 0 && (
        <Card id="alertas" className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="size-4" />
              Alertas de Documentação
            </CardTitle>
            <CardDescription>
              Veículos com documentos vencidos ou a vencer nos próximos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comAlerta.map((v) => {
                const alerts = getVehicleDocAlerts(v)
                return (
                  <div
                    key={v.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <Truck className="size-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <Link
                        href={`/veiculos/${v.id}`}
                        className="font-bold text-slate-900 hover:underline font-mono"
                      >
                        {v.placa}
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {alerts.map((alert) => (
                          <Badge
                            key={alert}
                            className={
                              alert.includes('vencido') || alert.includes('vencida')
                                ? 'bg-red-100 text-red-700 border-0'
                                : 'bg-amber-100 text-amber-700 border-0'
                            }
                          >
                            {alert}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-1.5 text-xs text-slate-500 space-x-3">
                        {v.crlv_vencimento && (
                          <span>CRLV: {formatDate(v.crlv_vencimento)}</span>
                        )}
                        {v.seguro_vencimento && (
                          <span>Seguro: {formatDate(v.seguro_vencimento)}</span>
                        )}
                        {v.antt_vencimento && (
                          <span>ANTT: {formatDate(v.antt_vencimento)}</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/veiculos/${v.id}`}>Ver</Link>
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
