'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Truck, MapPin, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { viagemSchema, type ViagemInput } from '@/lib/validations'

interface VeiculoAssignment {
  id: string
  veiculo_id: string
  veiculos: {
    id: string
    placa: string
    modelo: string | null
    status: string
  }
}

export default function NovaViagemPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [atribuicao, setAtribuicao] = useState<VeiculoAssignment | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ViagemInput>({
    resolver: zodResolver(viagemSchema),
    defaultValues: {
      km_inicio: 0,
    },
  })

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setUserId(user.id)

        const { data: profile } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (profile) setTenantId(profile.tenant_id)

        const { data: attr } = await supabase
          .from('motorista_veiculo')
          .select('id, veiculo_id, veiculos(id, placa, modelo, status)')
          .eq('motorista_id', user.id)
          .eq('ativo', true)
          .maybeSingle()

        if (attr) {
          setAtribuicao(attr as VeiculoAssignment)
          setValue('veiculo_id', (attr as VeiculoAssignment).veiculo_id)
        }
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function onSubmit(data: ViagemInput) {
    if (!userId || !tenantId || !atribuicao) return

    setSubmitting(true)
    try {
      // Check for existing active viagem
      const { data: activeViagem } = await supabase
        .from('viagens')
        .select('id')
        .eq('motorista_id', userId)
        .eq('status', 'ativa')
        .maybeSingle()

      if (activeViagem) {
        toast.error('Você já tem uma viagem ativa. Encerre-a antes de iniciar uma nova.')
        return
      }

      const { data: newViagem, error: viagemError } = await supabase
        .from('viagens')
        .insert({
          motorista_id: userId,
          veiculo_id: atribuicao.veiculo_id,
          origem: data.origem,
          destino: data.destino,
          km_inicio: data.km_inicio ?? 0,
          observacoes: data.observacoes ?? null,
          tenant_id: tenantId,
          status: 'ativa',
        })
        .select()
        .single()

      if (viagemError || !newViagem) throw new Error(viagemError?.message ?? 'Erro ao criar viagem')

      // Insert first checkpoint
      await supabase.from('checkpoints').insert({
        viagem_id: newViagem.id,
        tipo: 'saida',
        descricao: 'Viagem iniciada',
        km_atual: data.km_inicio ?? 0,
      })

      // Update vehicle status to em_rota
      await supabase
        .from('veiculos')
        .update({ status: 'em_rota' })
        .eq('id', atribuicao.veiculo_id)

      toast.success('Viagem iniciada com sucesso!')
      router.push(`/motorista/viagem/${newViagem.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao iniciar viagem'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <Link href="/motorista/home" className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">Nova Viagem</h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        {!atribuicao ? (
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h2 className="font-bold text-amber-800 text-lg mb-2">Sem veículo atribuído</h2>
            <p className="text-amber-700 text-sm">
              Você não tem veículo atribuído. Contate o administrador.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-4">
            {/* Vehicle info (read-only) */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Veículo Atribuído</p>
                <p className="font-bold text-blue-800">{atribuicao.veiculos.placa}</p>
                {atribuicao.veiculos.modelo && (
                  <p className="text-sm text-blue-700">{atribuicao.veiculos.modelo}</p>
                )}
              </div>
            </div>

            {/* Origem */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Origem <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  {...register('origem')}
                  placeholder="Cidade de partida"
                  className="w-full pl-10 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              {errors.origem && (
                <p className="text-sm text-red-500">{errors.origem.message}</p>
              )}
            </div>

            {/* Destino */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Destino <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-400" />
                <input
                  {...register('destino')}
                  placeholder="Cidade de destino"
                  className="w-full pl-10 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>
              {errors.destino && (
                <p className="text-sm text-red-500">{errors.destino.message}</p>
              )}
            </div>

            {/* KM Inicial */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                KM Inicial
              </label>
              <input
                {...register('km_inicio')}
                type="number"
                inputMode="numeric"
                placeholder="0"
                min="0"
                className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              {errors.km_inicio && (
                <p className="text-sm text-red-500">{errors.km_inicio.message}</p>
              )}
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Observações <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <textarea
                {...register('observacoes')}
                placeholder="Anotações sobre a viagem..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg shadow-md hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar Viagem 🚀'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
