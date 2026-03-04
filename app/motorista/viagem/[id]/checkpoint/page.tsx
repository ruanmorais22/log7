'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { checkpointSchema, type CheckpointInput } from '@/lib/validations'
import { TIPOS_CHECKPOINT } from '@/lib/constants'
import { FileUpload } from '@/components/shared/file-upload'
import { cn } from '@/lib/utils'

export default function CheckpointPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: viagemId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [veiculoId, setVeiculoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fotoUrl, setFotoUrl] = useState<string>('')
  const [selectedTipo, setSelectedTipo] = useState<CheckpointInput['tipo'] | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CheckpointInput>({
    resolver: zodResolver(checkpointSchema),
  })

  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (profile) setTenantId(profile.tenant_id)

        const { data: viagem } = await supabase
          .from('viagens')
          .select('id, veiculo_id, motorista_id')
          .eq('id', viagemId)
          .eq('motorista_id', user.id)
          .single()

        if (!viagem) {
          toast.error('Viagem não encontrada')
          router.push('/motorista/viagem')
          return
        }

        setVeiculoId(viagem.veiculo_id)
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [viagemId])

  function handleTipoSelect(tipo: CheckpointInput['tipo']) {
    setSelectedTipo(tipo)
    setValue('tipo', tipo)
  }

  async function onSubmit(data: CheckpointInput) {
    setSubmitting(true)
    try {
      const { error: cpError } = await supabase.from('checkpoints').insert({
        viagem_id: viagemId,
        tipo: data.tipo,
        descricao: data.descricao ?? null,
        km_atual: data.km_atual ?? null,
        foto_url: fotoUrl || null,
      })

      if (cpError) throw cpError

      // Update vehicle km_atual if km provided
      if (data.km_atual && veiculoId) {
        await supabase
          .from('veiculos')
          .update({ km_atual: data.km_atual })
          .eq('id', veiculoId)
      }

      toast.success('Checkpoint registrado!')
      router.push(`/motorista/viagem/${viagemId}`)
      router.refresh()
    } catch {
      toast.error('Erro ao registrar checkpoint')
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
        <Link href={`/motorista/viagem/${viagemId}`} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <h1 className="text-lg font-bold text-slate-800">Adicionar Checkpoint</h1>
      </div>

      <div className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Tipo selector */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Tipo de Checkpoint <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TIPOS_CHECKPOINT.map((tipo) => (
                <button
                  key={tipo.value}
                  type="button"
                  onClick={() => handleTipoSelect(tipo.value as CheckpointInput['tipo'])}
                  className={cn(
                    'flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all',
                    selectedTipo === tipo.value
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <span className="text-3xl">{tipo.icon}</span>
                  <span className={cn(
                    'text-xs font-semibold text-center leading-tight',
                    selectedTipo === tipo.value ? 'text-orange-700' : 'text-slate-600'
                  )}>
                    {tipo.label}
                  </span>
                </button>
              ))}
            </div>
            {errors.tipo && (
              <p className="text-sm text-red-500">{errors.tipo.message}</p>
            )}
          </div>

          {/* KM Atual */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              KM Atual <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              {...register('km_atual')}
              type="number"
              inputMode="numeric"
              placeholder="Ex: 125000"
              min="0"
              className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Descrição <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              {...register('descricao')}
              placeholder="Detalhes sobre este checkpoint..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Photo upload */}
          {tenantId && (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Foto <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <FileUpload
                bucket="fotos"
                tenantId={tenantId}
                onUpload={setFotoUrl}
                currentUrl={fotoUrl || undefined}
                accept="image/*"
                label="Foto do checkpoint"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedTipo}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg shadow-md hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              'Registrar Checkpoint 📍'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
