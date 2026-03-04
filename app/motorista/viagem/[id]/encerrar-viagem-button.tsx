'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface EncerrarViagemButtonProps {
  viagemId: string
  veiculoId: string | null
  kmAtual: number
}

export function EncerrarViagemButton({ viagemId, veiculoId, kmAtual }: EncerrarViagemButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [showDialog, setShowDialog] = useState(false)
  const [kmFim, setKmFim] = useState<string>(kmAtual > 0 ? String(kmAtual) : '')
  const [loading, setLoading] = useState(false)

  async function handleEncerrar() {
    const km = Number(kmFim)
    if (!kmFim || isNaN(km) || km < 0) {
      toast.error('Informe o KM final corretamente')
      return
    }

    setLoading(true)
    try {
      const { error: viagemError } = await supabase
        .from('viagens')
        .update({
          status: 'encerrada',
          km_fim: km,
          encerrado_em: new Date().toISOString(),
        })
        .eq('id', viagemId)

      if (viagemError) throw viagemError

      // Insert arrival checkpoint
      await supabase.from('checkpoints').insert({
        viagem_id: viagemId,
        tipo: 'chegada',
        descricao: 'Viagem encerrada',
        km_atual: km,
      })

      // Update vehicle km and status
      if (veiculoId) {
        await supabase
          .from('veiculos')
          .update({ km_atual: km, status: 'disponivel' })
          .eq('id', veiculoId)
      }

      toast.success('Viagem encerrada com sucesso!')
      router.push('/motorista/home')
      router.refresh()
    } catch {
      toast.error('Erro ao encerrar viagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex flex-col items-center gap-2 py-4 px-3 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors"
      >
        <CheckCircle className="h-6 w-6 text-slate-500" />
        <span className="text-xs font-semibold text-center">Encerrar Viagem</span>
      </button>

      {/* Encerrar dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Encerrar Viagem</h2>
            <p className="text-slate-600 text-sm">
              Informe o quilômetro final do veículo para encerrar a viagem.
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                KM Final <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={kmFim}
                onChange={(e) => setKmFim(e.target.value)}
                placeholder="Ex: 125000"
                min="0"
                className="w-full px-4 py-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-xl font-bold text-center placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDialog(false)}
                disabled={loading}
                className="flex-1 py-4 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEncerrar}
                disabled={loading}
                className="flex-1 py-4 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Encerrando...
                  </>
                ) : (
                  'Encerrar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
