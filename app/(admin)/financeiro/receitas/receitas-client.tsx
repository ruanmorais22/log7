'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, downloadCSV } from '@/lib/utils'
import { TIPOS_RECEITA, FORMAS_PAGAMENTO } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Download, TrendingUp, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

const TIPO_LABELS: Record<string, string> = {
  pagamento_entrega: 'Pagamento na Entrega',
  coleta_valor: 'Coleta de Valor',
  reembolso: 'Reembolso',
  outros: 'Outros',
}

const FORMA_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  ted: 'TED',
  cheque: 'Cheque',
}

type Receita = {
  id: string
  created_at: string
  tipo: string
  descricao: string | null
  forma_pagamento: string
  nome_pagador: string | null
  valor: number
  viagens: { origem: string; destino: string } | null
  users: { nome: string } | null
}

type Viagem = {
  id: string
  origem: string
  destino: string
}

interface ReceitasClientProps {
  receitas: Receita[]
  totalMes: number
  viagens: Viagem[]
  tenantId: string
  userId: string
}

const emptyForm = {
  tipo: '',
  valor: '',
  descricao: '',
  forma_pagamento: 'pix',
  nome_pagador: '',
  viagem_id: '',
}

export function ReceitasClient({ receitas: initialReceitas, totalMes, viagens, tenantId, userId }: ReceitasClientProps) {
  const [receitas, setReceitas] = useState<Receita[]>(initialReceitas)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const totalGeral = receitas.reduce((sum, r) => sum + (r.valor ?? 0), 0)

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tipo) { toast.error('Selecione o tipo de receita'); return }
    if (!form.valor || Number(form.valor) <= 0) { toast.error('Informe um valor válido'); return }

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        tipo: form.tipo,
        valor: Number(form.valor),
        descricao: form.descricao || null,
        forma_pagamento: form.forma_pagamento,
        nome_pagador: form.nome_pagador || null,
        tenant_id: tenantId,
        registrado_por: userId,
      }
      if (form.viagem_id && form.viagem_id !== '_nenhuma') {
        payload.viagem_id = form.viagem_id
      }

      const { data, error } = await supabase
        .from('receitas')
        .insert(payload)
        .select('*, viagens(origem, destino), users!receitas_registrado_por_fkey(nome)')
        .single()

      if (error) {
        toast.error('Erro ao registrar receita')
        console.error(error)
        return
      }

      setReceitas((prev) => [data as Receita, ...prev])
      toast.success('Receita registrada com sucesso!')
      setForm(emptyForm)
      setDialogOpen(false)
    })
  }

  function handleExportCSV() {
    const rows = receitas.map((r) => ({
      Data: formatDate(r.created_at),
      Tipo: TIPO_LABELS[r.tipo] ?? r.tipo,
      Descricao: r.descricao ?? '',
      Forma_Pagamento: FORMA_LABELS[r.forma_pagamento] ?? r.forma_pagamento,
      Pagador: r.nome_pagador ?? '',
      Valor: r.valor,
      Viagem: r.viagens ? `${r.viagens.origem} → ${r.viagens.destino}` : '',
    }))
    downloadCSV(rows, `receitas-${new Date().toISOString().slice(0, 10)}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receitas</h1>
          <p className="text-slate-500 text-sm">Controle de receitas e recebimentos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nova Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Registrar Nova Receita</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select value={form.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                      <SelectTrigger id="tipo">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_RECEITA.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="valor">Valor (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={form.valor}
                      onChange={(e) => handleChange('valor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Input
                    id="descricao"
                    placeholder="Descrição opcional"
                    value={form.descricao}
                    onChange={(e) => handleChange('descricao', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                    <Select value={form.forma_pagamento} onValueChange={(v) => handleChange('forma_pagamento', v)}>
                      <SelectTrigger id="forma_pagamento">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="nome_pagador">Nome do Pagador</Label>
                    <Input
                      id="nome_pagador"
                      placeholder="Opcional"
                      value={form.nome_pagador}
                      onChange={(e) => handleChange('nome_pagador', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="viagem_id">Viagem Relacionada</Label>
                  <Select value={form.viagem_id} onValueChange={(v) => handleChange('viagem_id', v)}>
                    <SelectTrigger id="viagem_id">
                      <SelectValue placeholder="Nenhuma (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_nenhuma">Nenhuma</SelectItem>
                      {viagens.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.origem} → {v.destino}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    disabled={isPending}
                  >
                    {isPending ? 'Salvando...' : 'Registrar Receita'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Receitas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalMes)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Total Geral (últimas 100)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalGeral)}</p>
            <p className="text-xs text-blue-600 mt-1">{receitas.length} receitas listadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {receitas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <DollarSign className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm">Nenhuma receita registrada.</p>
          <p className="text-xs mt-1">Clique em &quot;Nova Receita&quot; para começar.</p>
        </div>
      ) : (
        <Card>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Forma Pgto.</TableHead>
                  <TableHead className="text-xs">Pagador</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs">Viagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas.map((receita) => {
                  const viagem = receita.viagens as { origem: string; destino: string } | null
                  return (
                    <TableRow key={receita.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {formatDate(receita.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {TIPO_LABELS[receita.tipo] ?? receita.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[180px] truncate">
                        {receita.descricao ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {FORMA_LABELS[receita.forma_pagamento] ?? receita.forma_pagamento}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {receita.nome_pagador ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right text-emerald-700 whitespace-nowrap">
                        {formatCurrency(receita.valor)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {viagem ? `${viagem.origem} → ${viagem.destino}` : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-3 border-t flex items-center justify-between bg-slate-50">
            <span className="text-xs text-slate-500">{receitas.length} receitas</span>
            <div className="text-sm font-semibold text-emerald-700">
              Total: {formatCurrency(totalGeral)}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
