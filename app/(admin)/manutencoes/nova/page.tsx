'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TIPOS_MANUTENCAO } from '@/lib/constants'
import { manutencaoSchema } from '@/lib/validations'
import { FileUpload } from '@/components/shared/file-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Wrench } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Veiculo = {
  id: string
  placa: string
  modelo: string | null
  km_atual: number
}

const today = new Date().toISOString().slice(0, 10)

export default function NovaManutencaoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [notaFiscalUrl, setNotaFiscalUrl] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    veiculo_id: '',
    tipo: '',
    descricao: '',
    custo: '',
    km_na_manutencao: '',
    data: today,
    oficina: '',
    status: 'concluida',
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile) { router.push('/login'); return }

      setTenantId(profile.tenant_id)

      const { data: vs } = await supabase
        .from('veiculos')
        .select('id, placa, modelo, km_atual')
        .eq('tenant_id', profile.tenant_id)
        .eq('ativo', true)
        .order('placa')

      setVeiculos(vs ?? [])
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) return

    const parsed = manutencaoSchema.safeParse({
      ...form,
      custo: form.custo || 0,
      km_na_manutencao: form.km_na_manutencao || undefined,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message
      })
      setErrors(fieldErrors)
      toast.error('Corrija os campos indicados')
      return
    }

    startTransition(async () => {
      const payload: Record<string, unknown> = {
        ...parsed.data,
        tenant_id: tenantId,
      }
      if (notaFiscalUrl) payload.nota_fiscal_url = notaFiscalUrl

      const { data: inserted, error } = await supabase
        .from('manutencoes')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        toast.error('Erro ao salvar manutenção')
        console.error(error)
        return
      }

      // Update vehicle km if provided and greater than current
      if (parsed.data.km_na_manutencao && parsed.data.veiculo_id) {
        const veiculo = veiculos.find((v) => v.id === parsed.data.veiculo_id)
        if (veiculo && parsed.data.km_na_manutencao > (veiculo.km_atual ?? 0)) {
          await supabase
            .from('veiculos')
            .update({ km_atual: parsed.data.km_na_manutencao })
            .eq('id', parsed.data.veiculo_id)
        }
      }

      toast.success('Manutenção registrada com sucesso!')
      router.push('/manutencoes')
    })
  }

  const selectedVeiculo = veiculos.find((v) => v.id === form.veiculo_id)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-700 -ml-2">
          <Link href="/manutencoes">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wrench className="h-6 w-6 text-orange-500" />
          Nova Manutenção
        </h1>
        <p className="text-slate-500 text-sm">Registre uma manutenção para um veículo da frota</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da Manutenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Veiculo + Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="veiculo_id">
                  Veículo <span className="text-red-500">*</span>
                </Label>
                <Select value={form.veiculo_id} onValueChange={(v) => handleChange('veiculo_id', v)}>
                  <SelectTrigger id="veiculo_id" className={errors.veiculo_id ? 'border-red-400' : ''}>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {veiculos.length === 0 ? (
                      <SelectItem value="_empty" disabled>Nenhum veículo ativo</SelectItem>
                    ) : (
                      veiculos.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.placa} {v.modelo ? `— ${v.modelo}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.veiculo_id && (
                  <p className="text-xs text-red-500">{errors.veiculo_id}</p>
                )}
                {selectedVeiculo && (
                  <p className="text-xs text-slate-500">
                    KM atual: {selectedVeiculo.km_atual.toLocaleString('pt-BR')} km
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tipo">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Select value={form.tipo} onValueChange={(v) => handleChange('tipo', v)}>
                  <SelectTrigger id="tipo" className={errors.tipo ? 'border-red-400' : ''}>
                    <SelectValue placeholder="Tipo de manutenção" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_MANUTENCAO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-xs text-red-500">{errors.tipo}</p>}
              </div>
            </div>

            {/* Descricao */}
            <div className="space-y-1.5">
              <Label htmlFor="descricao">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="descricao"
                rows={3}
                placeholder="Descreva o serviço realizado..."
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  errors.descricao ? 'border-red-400' : 'border-slate-200'
                }`}
              />
              {errors.descricao && <p className="text-xs text-red-500">{errors.descricao}</p>}
            </div>

            {/* Data + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="data">
                  Data <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="data"
                  type="date"
                  value={form.data}
                  onChange={(e) => handleChange('data', e.target.value)}
                  className={errors.data ? 'border-red-400' : ''}
                />
                {errors.data && <p className="text-xs text-red-500">{errors.data}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => handleChange('status', v)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custo + KM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="custo">Custo (R$)</Label>
                <Input
                  id="custo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.custo}
                  onChange={(e) => handleChange('custo', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="km_na_manutencao">KM na Manutenção</Label>
                <Input
                  id="km_na_manutencao"
                  type="number"
                  min="0"
                  placeholder="Ex: 85000"
                  value={form.km_na_manutencao}
                  onChange={(e) => handleChange('km_na_manutencao', e.target.value)}
                />
                {form.km_na_manutencao && selectedVeiculo && Number(form.km_na_manutencao) > selectedVeiculo.km_atual && (
                  <p className="text-xs text-emerald-600">
                    KM do veículo será atualizado para {Number(form.km_na_manutencao).toLocaleString('pt-BR')} km
                  </p>
                )}
              </div>
            </div>

            {/* Oficina */}
            <div className="space-y-1.5">
              <Label htmlFor="oficina">Oficina / Prestador</Label>
              <Input
                id="oficina"
                placeholder="Nome da oficina ou prestador"
                value={form.oficina}
                onChange={(e) => handleChange('oficina', e.target.value)}
              />
            </div>

            {/* Nota Fiscal */}
            {tenantId && (
              <div className="space-y-1.5">
                <Label>Nota Fiscal / Comprovante</Label>
                <FileUpload
                  bucket="comprovantes"
                  tenantId={tenantId}
                  onUpload={setNotaFiscalUrl}
                  currentUrl={notaFiscalUrl}
                  label="Nota Fiscal"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/manutencoes">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isPending || !tenantId}
          >
            {isPending ? 'Salvando...' : 'Registrar Manutenção'}
          </Button>
        </div>
      </form>
    </div>
  )
}
