'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { receitaSchema, type ReceitaInput } from '@/lib/validations'
import { TIPOS_RECEITA, FORMAS_PAGAMENTO } from '@/lib/constants'
import { FileUpload } from '@/components/shared/file-upload'

interface ViagemAtiva {
  id: string
  origem: string
  destino: string
}

export default function NovaEntradaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const viagemIdParam = searchParams.get('viagem_id')
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [viagemAtiva, setViagemAtiva] = useState<ViagemAtiva | null>(null)
  const [comprovanteUrl, setComprovanteUrl] = useState<string>('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ReceitaInput>({
    resolver: zodResolver(receitaSchema),
    defaultValues: {
      forma_pagamento: 'pix',
      valor: 0,
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

        // Get active viagem
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

  async function onSubmit(data: ReceitaInput) {
    if (!userId || !tenantId) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('receitas').insert({
        registrado_por: userId,
        tenant_id: tenantId,
        viagem_id: data.viagem_id ?? null,
        tipo: data.tipo,
        valor: data.valor,
        descricao: data.descricao ?? null,
        forma_pagamento: data.forma_pagamento,
        nome_pagador: data.nome_pagador ?? null,
        comprovante_url: comprovanteUrl || null,
      })

      if (error) throw error

      toast.success('Entrada registrada com sucesso!')
      router.push('/motorista/entradas')
      router.refresh()
    } catch {
      toast.error('Erro ao registrar entrada')
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
        <Link href="/motorista/entradas" className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">Nova Entrada</h1>
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

          {/* Tipo */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              {...register('tipo')}
              className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Selecione o tipo</option>
              {TIPOS_RECEITA.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.tipo && (
              <p className="text-sm text-red-500">{errors.tipo.message}</p>
            )}
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Forma de Pagamento <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAS_PAGAMENTO.map((fp) => (
                <label
                  key={fp.value}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-orange-300 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50 transition-colors"
                >
                  <input
                    {...register('forma_pagamento')}
                    type="radio"
                    value={fp.value}
                    className="accent-orange-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-700">{fp.label}</span>
                  </div>
                </label>
              ))}
            </div>
            {errors.forma_pagamento && (
              <p className="text-sm text-red-500">{errors.forma_pagamento.message}</p>
            )}
          </div>

          {/* Nome do pagador */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Nome do Pagador <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              {...register('nome_pagador')}
              type="text"
              placeholder="Empresa ou pessoa que pagou"
              className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Descrição <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              {...register('descricao')}
              type="text"
              placeholder="Detalhes sobre esta entrada..."
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
                label="Comprovante da entrada"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg shadow-md hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              'Registrar Entrada 💰'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
