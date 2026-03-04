'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MapPin, Route } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  motorista_id: z.string().uuid('Selecione um motorista'),
  veiculo_id: z.string().uuid('Selecione um veículo'),
  origem: z.string().min(2, 'Informe a origem'),
  destino: z.string().min(2, 'Informe o destino'),
  km_inicio: z.coerce.number().min(0).default(0),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Motorista { id: string; nome: string }
interface Veiculo { id: string; placa: string; modelo: string | null; status: string }

export default function AdminNovaViagemPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [adminId, setAdminId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { km_inicio: 0 } })

  const motoristaId = watch('motorista_id')

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        setAdminId(user.id)

        const { data: profile } = await supabase
          .from('users').select('tenant_id').eq('id', user.id).maybeSingle()
        if (!profile) { router.push('/login'); return }
        setTenantId(profile.tenant_id)

        const [{ data: m }, { data: v }] = await Promise.all([
          supabase.from('users')
            .select('id, nome')
            .eq('tenant_id', profile.tenant_id)
            .eq('role', 'motorista')
            .eq('ativo', true)
            .order('nome'),
          supabase.from('veiculos')
            .select('id, placa, modelo, status')
            .eq('tenant_id', profile.tenant_id)
            .eq('ativo', true)
            .order('placa'),
        ])
        setMotoristas(m ?? [])
        setVeiculos(v ?? [])
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Quando motorista muda, tenta pré-selecionar o veículo atribuído
  useEffect(() => {
    if (!motoristaId) return
    supabase
      .from('motorista_veiculo')
      .select('veiculo_id')
      .eq('motorista_id', motoristaId)
      .eq('ativo', true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setValue('veiculo_id', data.veiculo_id)
      })
  }, [motoristaId])

  async function onSubmit(data: FormValues) {
    if (!tenantId || !adminId) return
    setSubmitting(true)
    try {
      const { data: newViagem, error } = await supabase
        .from('viagens')
        .insert({
          tenant_id: tenantId,
          motorista_id: data.motorista_id,
          veiculo_id: data.veiculo_id,
          origem: data.origem,
          destino: data.destino,
          km_inicio: data.km_inicio ?? 0,
          observacoes: data.observacoes ?? null,
          status: 'ativa',
        })
        .select()
        .single()

      if (error || !newViagem) throw new Error(error?.message ?? 'Erro ao criar viagem')

      await supabase.from('checkpoints').insert({
        viagem_id: newViagem.id,
        tipo: 'saida',
        descricao: 'Viagem iniciada pelo administrador',
        km_atual: data.km_inicio ?? 0,
      })

      await supabase.from('veiculos').update({ status: 'em_rota' }).eq('id', data.veiculo_id)

      toast.success('Viagem criada com sucesso!')
      router.push(`/viagens/${newViagem.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar viagem')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/viagens"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nova Viagem</h1>
          <p className="text-slate-500 text-sm">Registre uma viagem para um motorista da frota</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="size-4" />
            Dados da Viagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Motorista */}
            <div className="space-y-2">
              <Label>Motorista *</Label>
              <Select onValueChange={(v) => setValue('motorista_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {motoristas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.motorista_id && (
                <p className="text-red-500 text-xs">{errors.motorista_id.message}</p>
              )}
              {motoristas.length === 0 && (
                <p className="text-amber-600 text-xs">Nenhum motorista ativo cadastrado.</p>
              )}
            </div>

            {/* Veículo */}
            <div className="space-y-2">
              <Label>Veículo *</Label>
              <Select onValueChange={(v) => setValue('veiculo_id', v)} value={watch('veiculo_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {veiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.placa}{v.modelo ? ` — ${v.modelo}` : ''}
                      {v.status === 'em_rota' ? ' (em rota)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.veiculo_id && (
                <p className="text-red-500 text-xs">{errors.veiculo_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Origem */}
              <div className="space-y-2">
                <Label>Origem *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  <Input
                    {...register('origem')}
                    placeholder="Cidade de partida"
                    className="pl-9"
                  />
                </div>
                {errors.origem && (
                  <p className="text-red-500 text-xs">{errors.origem.message}</p>
                )}
              </div>

              {/* Destino */}
              <div className="space-y-2">
                <Label>Destino *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-400" />
                  <Input
                    {...register('destino')}
                    placeholder="Cidade de destino"
                    className="pl-9"
                  />
                </div>
                {errors.destino && (
                  <p className="text-red-500 text-xs">{errors.destino.message}</p>
                )}
              </div>
            </div>

            {/* KM Inicial */}
            <div className="space-y-2">
              <Label>KM Inicial</Label>
              <Input
                {...register('km_inicio')}
                type="number"
                min="0"
                placeholder="0"
              />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações <span className="text-slate-400 font-normal">(opcional)</span></Label>
              <textarea
                {...register('observacoes')}
                placeholder="Anotações sobre a viagem..."
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" asChild className="flex-1">
                <Link href="/viagens">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Criando...</>
                ) : (
                  'Criar Viagem'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
