'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { gastoSchema, type GastoInput } from '@/lib/validations'
import { CATEGORIAS_GASTO } from '@/lib/constants'
import { FileUpload } from '@/components/shared/file-upload'
import { cn } from '@/lib/utils'

interface ViagemAtiva {
  id: string
  origem: string
  destino: string
}

export default function NovoGastoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viagemIdParam = searchParams.get('viagem_id')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [veiculoId, setVeiculoId] = useState<string | null>(null)
  const [viagemAtiva, setViagemAtiva] = useState<ViagemAtiva | null>(null)
  const [comprovanteUrl, setComprovanteUrl] = useState<string>('')
  const [selectedCategoria, setSelectedCategoria] = useState<GastoInput['categoria'] | null>(null)
  const [aprovacaoAutomatica, setAprovacaoAutomatica] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<GastoInput>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      valor: 0,
    },
  })

  const watchLitros = watch('litros')
  const watchPrecoLitro = watch('preco_litro')
  const isCombustivel = selectedCategoria === 'combustivel'

  // Auto-calculate value when litros * preco_litro
  useEffect(() => {
    if (isCombustivel && watchLitros && watchPrecoLitro) {
      const calculado = Number(watchLitros) * Number(watchPrecoLitro)
      if (!isNaN(calculado) && calculado > 0) {
        setValue('valor', parseFloat(calculado.toFixed(2)))
      }
    }
  }, [watchLitros, watchPrecoLitro, isCombustivel, setValue])

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
          .select('tenant_id, tenants(aprovacao_gastos)')
          .eq('id', user.id)
          .single()

        if (profile) {
          setTenantId(profile.tenant_id)
          const tenant = profile.tenants as { aprovacao_gastos: boolean } | null
          setAprovacaoAutomatica(!(tenant?.aprovacao_gastos ?? true))
        }

        // Get vehicle assignment
        const { data: atribuicao } = await supabase
          .from('motorista_veiculo')
          .select('veiculo_id')
          .eq('motorista_id', user.id)
          .eq('ativo', true)
          .maybeSingle()

        if (atribuicao) setVeiculoId(atribuicao.veiculo_id)

        // Get active viagem - use param or auto-detect
        if (viagemIdParam) {
          const { data: v } = await supabase
            .from('viagens')
            .select('id, origem, destino')
            .eq('id', viagemIdParam)
            .eq('motorista_id', user.id)
            .single()
          if (v) {
            setViagemAtiva(v)
            setValue('viagem_id', v.id)
          }
        } else {
          const { data: activeV } = await supabase
            .from('viagens')
            .select('id, origem, destino')
            .eq('motorista_id', user.id)
            .eq('status', 'ativa')
            .maybeSingle()
          if (activeV) {
            setViagemAtiva(activeV)
            setValue('viagem_id', activeV.id)
          }
        }
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [viagemIdParam])

  function handleCategoriaSelect(cat: GastoInput['categoria']) {
    setSelectedCategoria(cat)
    setValue('categoria', cat)
    // Reset fuel fields when switching away
    if (cat !== 'combustivel') {
      setValue('litros', undefined)
      setValue('preco_litro', undefined)
      setValue('posto_cidade', undefined)
    }
  }

  async function onSubmit(data: GastoInput) {
    if (!userId || !tenantId) return

    setSubmitting(true)
    try {
      const status = aprovacaoAutomatica ? 'aprovado' : 'pendente'

      const { error } = await supabase.from('gastos').insert({
        motorista_id: userId,
        tenant_id: tenantId,
        veiculo_id: veiculoId ?? null,
        viagem_id: data.viagem_id ?? null,
        categoria: data.categoria,
        valor: data.valor,
        descricao: data.descricao ?? null,
        litros: data.litros ?? null,
        preco_litro: data.preco_litro ?? null,
        posto_cidade: data.posto_cidade ?? null,
        comprovante_url: comprovanteUrl || null,
        status,
      })

      if (error) throw error

      toast.success('Gasto registrado com sucesso!')
      router.push('/motorista/gastos')
      router.refresh()
    } catch {
      toast.error('Erro ao registrar gasto')
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
        <Link href="/motorista/gastos" className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">Novo Gasto</h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Active viagem info */}
          {viagemAtiva && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="text-xl">🚛</span>
              <div>
                <p className="text-xs text-blue-600 font-medium">Vinculado à viagem ativa</p>
                <p className="text-sm font-semibold text-blue-800">
                  {viagemAtiva.origem} → {viagemAtiva.destino}
                </p>
              </div>
            </div>
          )}

          {/* Categoria selector */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Categoria <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIAS_GASTO.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleCategoriaSelect(cat.value as GastoInput['categoria'])}
                  className={cn(
                    'flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all',
                    selectedCategoria === cat.value
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <span className={cn(
                    'text-xs font-semibold text-center leading-tight',
                    selectedCategoria === cat.value ? 'text-orange-700' : 'text-slate-600'
                  )}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
            {errors.categoria && (
              <p className="text-sm text-red-500">{errors.categoria.message}</p>
            )}
          </div>

          {/* Combustível extra fields */}
          {isCombustivel && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-4">
              <p className="text-sm font-semibold text-amber-800">Detalhes do Combustível</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Litros</label>
                  <input
                    {...register('litros')}
                    type="number"
                    inputMode="decimal"
                    placeholder="Ex: 80"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">Preço/Litro (R$)</label>
                  <input
                    {...register('preco_litro')}
                    type="number"
                    inputMode="decimal"
                    placeholder="Ex: 5.89"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600">Posto / Cidade</label>
                <input
                  {...register('posto_cidade')}
                  type="text"
                  placeholder="Ex: Posto BR - Campinas/SP"
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          )}

          {/* Valor */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Valor (R$) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">R$</span>
              <input
                {...register('valor')}
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                step="0.01"
                min="0"
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-2xl font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            {errors.valor && (
              <p className="text-sm text-red-500">{errors.valor.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Descrição <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              {...register('descricao')}
              type="text"
              placeholder="Detalhes sobre o gasto..."
              className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Comprovante */}
          {tenantId && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Comprovante <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <FileUpload
                bucket="comprovantes"
                tenantId={tenantId}
                onUpload={setComprovanteUrl}
                currentUrl={comprovanteUrl || undefined}
                label="Comprovante do gasto"
              />
            </div>
          )}

          {!aprovacaoAutomatica && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-700">
                ⏳ Este gasto ficará como <strong>pendente</strong> até aprovação do administrador.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedCategoria}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg shadow-md hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              'Registrar Gasto 💸'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
