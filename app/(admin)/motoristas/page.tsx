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
  UserPlus,
  Users,
  AlertTriangle,
  Phone,
  Mail,
  ChevronRight,
  Info,
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

export default async function MotoristasPage() {
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

  const { data: motoristas } = await supabase
    .from('users')
    .select(
      'id, nome, email, cpf, cnh_validade, cnh_categoria, telefone, status, ativo, created_at'
    )
    .eq('tenant_id', tenantId)
    .eq('role', 'motorista')
    .order('nome')

  const { data: limiteData } = await supabase.rpc('verificar_limite_plano', {
    p_tenant_id: tenantId,
  })

  const limite = limiteData as { motoristas_atual: number; motoristas_limite: number } | null
  const totalMotoristas = motoristas?.length ?? 0
  const limiteMotoristas = limite?.motoristas_limite ?? 0
  const nearLimit = limiteMotoristas > 0 && totalMotoristas >= limiteMotoristas - 2
  const atLimit = limiteMotoristas > 0 && totalMotoristas >= limiteMotoristas

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Motoristas</h1>
          <p className="text-slate-500 mt-1">
            Gerencie os motoristas da sua frota
          </p>
        </div>
        <Button asChild disabled={atLimit}>
          <Link href="/motoristas/novo">
            <UserPlus className="size-4" />
            Novo Motorista
          </Link>
        </Button>
      </div>

      {/* Plan limit alert */}
      {nearLimit && (
        <Card className={atLimit ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle
              className={`size-5 shrink-0 ${atLimit ? 'text-red-500' : 'text-amber-500'}`}
            />
            <div className="flex-1">
              {atLimit ? (
                <p className="text-sm font-medium text-red-800">
                  Você atingiu o limite de motoristas do seu plano ({limiteMotoristas}). Faça upgrade para adicionar mais.
                </p>
              ) : (
                <p className="text-sm font-medium text-amber-800">
                  Você está próximo do limite do seu plano: {totalMotoristas}/{limiteMotoristas} motoristas. Considere fazer upgrade.
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/configuracoes/plano">Ver planos</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{totalMotoristas}</p>
            {limiteMotoristas > 0 && (
              <p className="text-xs text-slate-400">de {limiteMotoristas} no plano</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Ativos</p>
            <p className="text-2xl font-bold text-emerald-600">
              {motoristas?.filter((m) => m.status === 'ativo').length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Em Férias / Afastados</p>
            <p className="text-2xl font-bold text-amber-600">
              {motoristas?.filter((m) => m.status === 'ferias' || m.status === 'afastado').length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">CNH Vencida</p>
            <p className="text-2xl font-bold text-red-600">
              {motoristas?.filter((m) => isExpiredDate(m.cnh_validade)).length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            Lista de Motoristas
          </CardTitle>
          {!motoristas?.length && (
            <CardDescription>
              Nenhum motorista cadastrado ainda. Clique em &quot;Novo Motorista&quot; para começar.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {motoristas && motoristas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Contato</TableHead>
                  <TableHead className="hidden md:table-cell">CNH Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {motoristas.map((motorista) => {
                  const cnhExpired = isExpiredDate(motorista.cnh_validade)
                  const cnhExpiringSoon = !cnhExpired && isExpiringSoon(motorista.cnh_validade, 30)
                  return (
                    <TableRow key={motorista.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{motorista.nome}</p>
                          {motorista.cpf && (
                            <p className="text-xs text-slate-400">CPF: {motorista.cpf}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{motorista.email}</span>
                          </div>
                          {motorista.telefone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Phone className="size-3 shrink-0" />
                              {motorista.telefone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {motorista.cnh_validade ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                cnhExpired
                                  ? 'text-red-600 font-medium text-sm'
                                  : cnhExpiringSoon
                                  ? 'text-amber-600 font-medium text-sm'
                                  : 'text-slate-600 text-sm'
                              }
                            >
                              {formatDate(motorista.cnh_validade)}
                            </span>
                            {motorista.cnh_categoria && (
                              <Badge variant="outline" className="text-xs">
                                Cat. {motorista.cnh_categoria}
                              </Badge>
                            )}
                            {cnhExpired && (
                              <AlertTriangle className="size-3.5 text-red-500" />
                            )}
                            {cnhExpiringSoon && (
                              <AlertTriangle className="size-3.5 text-amber-500" />
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="user" status={motorista.status} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Link href={`/motoristas/${motorista.id}`}>
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
                <Users className="size-8 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-700 mb-1">Nenhum motorista cadastrado</h3>
              <p className="text-sm text-slate-500 mb-4 max-w-xs">
                Adicione motoristas para começar a gerenciar sua frota.
              </p>
              <Button asChild>
                <Link href="/motoristas/novo">
                  <UserPlus className="size-4" />
                  Adicionar primeiro motorista
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <Info className="size-3.5 shrink-0 mt-0.5" />
        <p>
          CNH destacada em vermelho indica vencimento expirado. Amarelo indica vencimento nos próximos 30 dias.
        </p>
      </div>
    </div>
  )
}
