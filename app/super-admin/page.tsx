import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Building2, Users, Truck, TrendingUp } from 'lucide-react'

const PLANO_LABELS: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
}

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verificar se é super_admin
  const { data: me } = await supabase
    .from('users')
    .select('role, nome')
    .eq('id', user.id)
    .maybeSingle()

  if (me?.role !== 'super_admin') redirect('/dashboard')

  // Buscar todos os tenants com contagens
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, nome, cnpj, plano, ativo, trial_expires_at, created_at')
    .order('created_at', { ascending: false })

  // Contagens por tenant
  const tenantIds = tenants?.map((t) => t.id) ?? []
  const [motoristasResult, veiculosResult, viagensResult, receitasResult] = await Promise.all([
    supabase.from('users').select('tenant_id').eq('role', 'motorista').in('tenant_id', tenantIds),
    supabase.from('veiculos').select('tenant_id').eq('ativo', true).in('tenant_id', tenantIds),
    supabase.from('viagens').select('tenant_id').in('tenant_id', tenantIds),
    supabase.from('receitas').select('tenant_id, valor').in('tenant_id', tenantIds),
  ])

  const countByTenant = (rows: { tenant_id: string }[] | null, tid: string) =>
    rows?.filter((r) => r.tenant_id === tid).length ?? 0

  const receitaByTenant = (tid: string) =>
    receitasResult.data?.filter((r) => r.tenant_id === tid).reduce((s, r) => s + (r.valor ?? 0), 0) ?? 0

  const totalTenants = tenants?.length ?? 0
  const totalMotoristas = motoristasResult.data?.length ?? 0
  const totalReceitas = receitasResult.data?.reduce((s, r) => s + (r.valor ?? 0), 0) ?? 0
  const ativos = tenants?.filter((t) => t.ativo && new Date(t.trial_expires_at) >= new Date()).length ?? 0

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">FreteLog — Super Admin</h1>
        <p className="text-slate-400 text-sm mt-1">Bem-vindo, {me.nome}. Visão geral de todos os tenants.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="size-8 text-orange-400" />
            <div>
              <p className="text-xs text-slate-400">Transportadoras</p>
              <p className="text-2xl font-bold">{totalTenants}</p>
              <p className="text-xs text-emerald-400">{ativos} ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="size-8 text-blue-400" />
            <div>
              <p className="text-xs text-slate-400">Motoristas</p>
              <p className="text-2xl font-bold">{totalMotoristas}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <Truck className="size-8 text-purple-400" />
            <div>
              <p className="text-xs text-slate-400">Veículos</p>
              <p className="text-2xl font-bold">{veiculosResult.data?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="size-8 text-emerald-400" />
            <div>
              <p className="text-xs text-slate-400">Receitas totais</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalReceitas)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tenants table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Todas as Transportadoras</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Empresa</TableHead>
                <TableHead className="text-slate-400">Plano</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 hidden md:table-cell">Trial / Expira</TableHead>
                <TableHead className="text-slate-400 hidden lg:table-cell text-right">Motoristas</TableHead>
                <TableHead className="text-slate-400 hidden lg:table-cell text-right">Veículos</TableHead>
                <TableHead className="text-slate-400 hidden xl:table-cell text-right">Viagens</TableHead>
                <TableHead className="text-slate-400 text-right">Receita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants?.map((t) => {
                const trialExpired = !t.ativo || new Date(t.trial_expires_at) < new Date()
                return (
                  <TableRow key={t.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{t.nome}</p>
                        {t.cnpj && <p className="text-xs text-slate-400">{t.cnpj}</p>}
                        <p className="text-xs text-slate-500">{formatDate(t.created_at)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-500/20 text-orange-300 border-0 text-xs">
                        {PLANO_LABELS[t.plano] ?? t.plano}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {trialExpired ? (
                        <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Expirado</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-400">
                      {formatDate(t.trial_expires_at)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-sm text-slate-300">
                      {countByTenant(motoristasResult.data ?? [], t.id)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right text-sm text-slate-300">
                      {countByTenant(veiculosResult.data ?? [], t.id)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-right text-sm text-slate-300">
                      {countByTenant(viagensResult.data ?? [], t.id)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-400">
                      {formatCurrency(receitaByTenant(t.id))}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
