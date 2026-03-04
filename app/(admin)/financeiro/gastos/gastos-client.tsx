'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, downloadCSV } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/status-badge'
import { CATEGORIAS_GASTO } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Download, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIA_LABELS: Record<string, string> = {
  combustivel: 'Combustível',
  pedagio: 'Pedágio',
  manutencao_rota: 'Manutenção em Rota',
  alimentacao: 'Alimentação',
  hospedagem: 'Hospedagem',
  lavagem: 'Lavagem',
  multa: 'Multa',
  outros: 'Outros',
}

type Gasto = {
  id: string
  created_at: string
  categoria: string
  descricao: string | null
  valor: number
  status: string
  motivo_rejeicao: string | null
  users: { nome: string } | null
  veiculos: { placa: string } | null
  viagens: { origem: string; destino: string } | null
}

interface GastosClientProps {
  gastos: Gasto[]
  totais: { aprovado: number; pendente: number; rejeitado: number }
}

export function GastosClient({ gastos: initialGastos, totais: initialTotais }: GastosClientProps) {
  const [gastos, setGastos] = useState<Gasto[]>(initialGastos)
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todos')
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingGasto, setRejectingGasto] = useState<Gasto | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const totais = {
    aprovado: gastos.filter((g) => g.status === 'aprovado').reduce((s, g) => s + (g.valor ?? 0), 0),
    pendente: gastos.filter((g) => g.status === 'pendente').reduce((s, g) => s + (g.valor ?? 0), 0),
    rejeitado: gastos.filter((g) => g.status === 'rejeitado').reduce((s, g) => s + (g.valor ?? 0), 0),
  }

  function filterGastos(statusFilter: string) {
    return gastos
      .filter((g) => statusFilter === 'todos' || g.status === statusFilter)
      .filter((g) => categoriaFilter === 'todos' || g.categoria === categoriaFilter)
  }

  async function handleApprove(gasto: Gasto) {
    startTransition(async () => {
      const { error } = await supabase
        .from('gastos')
        .update({ status: 'aprovado' })
        .eq('id', gasto.id)

      if (error) {
        toast.error('Erro ao aprovar gasto')
        return
      }

      setGastos((prev) =>
        prev.map((g) => (g.id === gasto.id ? { ...g, status: 'aprovado' } : g))
      )
      toast.success('Gasto aprovado com sucesso!')
    })
  }

  function openRejectDialog(gasto: Gasto) {
    setRejectingGasto(gasto)
    setMotivoRejeicao('')
    setRejectDialogOpen(true)
  }

  async function handleReject() {
    if (!rejectingGasto) return

    startTransition(async () => {
      const { error } = await supabase
        .from('gastos')
        .update({ status: 'rejeitado', motivo_rejeicao: motivoRejeicao || null })
        .eq('id', rejectingGasto.id)

      if (error) {
        toast.error('Erro ao rejeitar gasto')
        return
      }

      setGastos((prev) =>
        prev.map((g) =>
          g.id === rejectingGasto.id
            ? { ...g, status: 'rejeitado', motivo_rejeicao: motivoRejeicao || null }
            : g
        )
      )
      toast.success('Gasto rejeitado.')
      setRejectDialogOpen(false)
      setRejectingGasto(null)
    })
  }

  function handleExportCSV() {
    const rows = gastos.map((g) => ({
      Data: formatDate(g.created_at),
      Motorista: (g.users as { nome: string } | null)?.nome ?? '—',
      Categoria: CATEGORIA_LABELS[g.categoria] ?? g.categoria,
      Descricao: g.descricao ?? '',
      Valor: g.valor,
      Viagem: g.viagens ? `${g.viagens.origem} → ${g.viagens.destino}` : '—',
      Status: g.status,
    }))
    downloadCSV(rows, `gastos-${new Date().toISOString().slice(0, 10)}`)
  }

  function GastosTable({ statusFilter }: { statusFilter: string }) {
    const filtered = filterGastos(statusFilter)

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <TrendingDown className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm">Nenhum gasto encontrado.</p>
        </div>
      )
    }

    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Motorista</TableHead>
              <TableHead className="text-xs">Categoria</TableHead>
              <TableHead className="text-xs">Descrição</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
              <TableHead className="text-xs">Viagem</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs w-[140px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((gasto) => {
              const motorista = (gasto.users as { nome: string } | null)
              const viagem = (gasto.viagens as { origem: string; destino: string } | null)
              return (
                <TableRow key={gasto.id} className="hover:bg-slate-50/50">
                  <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                    {formatDate(gasto.created_at)}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {motorista?.nome ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {CATEGORIA_LABELS[gasto.categoria] ?? gasto.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[200px] truncate">
                    {gasto.descricao ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-right whitespace-nowrap">
                    {formatCurrency(gasto.valor)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {viagem ? `${viagem.origem} → ${viagem.destino}` : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="gasto" status={gasto.status} />
                    {gasto.motivo_rejeicao && (
                      <p className="text-[10px] text-red-500 mt-0.5 max-w-[120px] truncate">
                        {gasto.motivo_rejeicao}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {gasto.status === 'pendente' && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleApprove(gasto)}
                          disabled={isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openRejectDialog(gasto)}
                          disabled={isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Central de Gastos</h1>
          <p className="text-slate-500 text-sm">Gerencie e aprove os gastos registrados pelos motoristas</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
              Total Aprovado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totais.aprovado)}</p>
            <p className="text-xs text-emerald-600 mt-1">
              {gastos.filter((g) => g.status === 'aprovado').length} gastos
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-amber-700 uppercase tracking-wide">
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-800">{formatCurrency(totais.pendente)}</p>
            <p className="text-xs text-amber-600 mt-1">
              {gastos.filter((g) => g.status === 'pendente').length} aguardando aprovação
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-red-700 uppercase tracking-wide">
              Total Rejeitado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-800">{formatCurrency(totais.rejeitado)}</p>
            <p className="text-xs text-red-600 mt-1">
              {gastos.filter((g) => g.status === 'rejeitado').length} rejeitados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500 whitespace-nowrap">Categoria:</Label>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {CATEGORIAS_GASTO.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="todos">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="todos" className="text-xs">
            Todos ({gastos.length})
          </TabsTrigger>
          <TabsTrigger value="pendente" className="text-xs">
            Pendentes ({gastos.filter((g) => g.status === 'pendente').length})
          </TabsTrigger>
          <TabsTrigger value="aprovado" className="text-xs">
            Aprovados ({gastos.filter((g) => g.status === 'aprovado').length})
          </TabsTrigger>
          <TabsTrigger value="rejeitado" className="text-xs">
            Rejeitados ({gastos.filter((g) => g.status === 'rejeitado').length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="mt-4">
          <GastosTable statusFilter="todos" />
        </TabsContent>
        <TabsContent value="pendente" className="mt-4">
          <GastosTable statusFilter="pendente" />
        </TabsContent>
        <TabsContent value="aprovado" className="mt-4">
          <GastosTable statusFilter="aprovado" />
        </TabsContent>
        <TabsContent value="rejeitado" className="mt-4">
          <GastosTable statusFilter="rejeitado" />
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rejeitar Gasto</DialogTitle>
          </DialogHeader>
          {rejectingGasto && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">
                  {CATEGORIA_LABELS[rejectingGasto.categoria] ?? rejectingGasto.categoria}
                  {' — '}
                  <span className="text-red-600 font-semibold">
                    {formatCurrency(rejectingGasto.valor)}
                  </span>
                </p>
                {rejectingGasto.descricao && (
                  <p className="text-slate-500 text-xs mt-1">{rejectingGasto.descricao}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="motivo" className="text-sm">
                  Motivo da rejeição <span className="text-slate-400">(opcional)</span>
                </Label>
                <Input
                  id="motivo"
                  placeholder="Ex: Comprovante inválido, valor incorreto..."
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isPending}
                >
                  {isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
