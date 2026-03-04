'use client'

import { useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/status-badge'
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
import { Badge } from '@/components/ui/badge'
import { Plus, Wrench, ShieldCheck, AlertTriangle, Zap } from 'lucide-react'
import Link from 'next/link'

type Manutencao = {
  id: string
  data: string
  tipo: string
  descricao: string
  custo: number
  km_na_manutencao: number | null
  oficina: string | null
  status: string
  veiculo_id: string
  veiculos: { placa: string; modelo: string | null } | null
  users: { nome: string } | null
}

type VeiculoFilter = {
  id: string
  placa: string
  modelo: string | null
}

interface ManutencoesClientProps {
  manutencoes: Manutencao[]
  totais: {
    geral: number
    preventiva: number
    corretiva: number
    emergencial: number
  }
  veiculos: VeiculoFilter[]
}

const TIPO_LABELS: Record<string, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  emergencial: 'Emergencial',
}

const TIPO_COLORS: Record<string, string> = {
  preventiva: 'bg-blue-100 text-blue-700',
  corretiva: 'bg-amber-100 text-amber-700',
  emergencial: 'bg-red-100 text-red-700',
}

export function ManutencoesClient({ manutencoes, totais, veiculos }: ManutencoesClientProps) {
  const [tipoFilter, setTipoFilter] = useState<string>('todos')
  const [veiculoFilter, setVeiculoFilter] = useState<string>('todos')

  const filtered = manutencoes
    .filter((m) => tipoFilter === 'todos' || m.tipo === tipoFilter)
    .filter((m) => veiculoFilter === 'todos' || m.veiculo_id === veiculoFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manutenções</h1>
          <p className="text-slate-500 text-sm">Controle de manutenções preventivas e corretivas da frota</p>
        </div>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" asChild>
          <Link href="/manutencoes/nova">
            <Plus className="h-4 w-4 mr-2" />
            Nova Manutenção
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              Total Gasto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(totais.geral)}</p>
            <p className="text-xs text-slate-500 mt-1">{manutencoes.length} manutenções</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Preventiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(totais.preventiva)}</p>
            <p className="text-xs text-blue-500 mt-1">
              {manutencoes.filter((m) => m.tipo === 'preventiva').length} registros
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Corretiva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(totais.corretiva)}</p>
            <p className="text-xs text-amber-500 mt-1">
              {manutencoes.filter((m) => m.tipo === 'corretiva').length} registros
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-red-600 uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Emergencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-red-700">{formatCurrency(totais.emergencial)}</p>
            <p className="text-xs text-red-500 mt-1">
              {manutencoes.filter((m) => m.tipo === 'emergencial').length} registros
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="preventiva">Preventiva</SelectItem>
            <SelectItem value="corretiva">Corretiva</SelectItem>
            <SelectItem value="emergencial">Emergencial</SelectItem>
          </SelectContent>
        </Select>

        {veiculos.length > 0 && (
          <Select value={veiculoFilter} onValueChange={setVeiculoFilter}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os veículos</SelectItem>
              {veiculos.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.placa} {v.modelo ? `— ${v.modelo}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {(tipoFilter !== 'todos' || veiculoFilter !== 'todos') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500"
            onClick={() => { setTipoFilter('todos'); setVeiculoFilter('todos') }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Wrench className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm">Nenhuma manutenção encontrada.</p>
          {manutencoes.length > 0 && (
            <p className="text-xs mt-1">Tente remover os filtros.</p>
          )}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Veículo</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Descrição</TableHead>
                <TableHead className="text-xs">KM</TableHead>
                <TableHead className="text-xs">Oficina</TableHead>
                <TableHead className="text-xs text-right">Custo</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const veiculo = m.veiculos as { placa: string; modelo: string | null } | null
                return (
                  <TableRow key={m.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(m.data)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium">{veiculo?.placa ?? '—'}</span>
                      {veiculo?.modelo && (
                        <span className="text-slate-400 ml-1">({veiculo.modelo})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs font-normal border-0 ${TIPO_COLORS[m.tipo] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TIPO_LABELS[m.tipo] ?? m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 max-w-[220px] truncate">
                      {m.descricao}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {m.km_na_manutencao ? `${m.km_na_manutencao.toLocaleString('pt-BR')} km` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {m.oficina ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right whitespace-nowrap">
                      {m.custo > 0 ? formatCurrency(m.custo) : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge type="manutencao" status={m.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex justify-between items-center text-xs text-slate-500 px-1">
          <span>{filtered.length} manutenção(ões) exibida(s)</span>
          <span className="font-semibold text-slate-700">
            Total: {formatCurrency(filtered.reduce((s, m) => s + (m.custo ?? 0), 0))}
          </span>
        </div>
      )}
    </div>
  )
}
