import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, MapPin, Truck } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'

export default async function ViagemListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: viagens } = await supabase
    .from('viagens')
    .select('*, veiculos(placa, modelo)')
    .eq('motorista_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Minhas Viagens</h1>
        <Link
          href="/motorista/viagem/nova"
          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova
        </Link>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {!viagens || viagens.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-6xl mb-4">🚛</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Nenhuma viagem ainda</h2>
            <p className="text-slate-500 text-sm mb-6">Inicie sua primeira viagem agora</p>
            <Link
              href="/motorista/viagem/nova"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Iniciar Nova Viagem
            </Link>
          </div>
        ) : (
          viagens.map((viagem) => {
            const veiculo = viagem.veiculos as { placa: string; modelo: string | null } | null
            return (
              <Link
                key={viagem.id}
                href={`/motorista/viagem/${viagem.id}`}
                className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-orange-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate text-sm">{viagem.origem}</span>
                    <span className="text-slate-400 mx-1 shrink-0">→</span>
                    <MapPin className="h-4 w-4 text-orange-400 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate text-sm">{viagem.destino}</span>
                  </div>
                  <StatusBadge type="viagem" status={viagem.status} />
                </div>
                <div className="mt-2 flex items-center gap-4">
                  {veiculo && (
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">{veiculo.placa}</span>
                    </div>
                  )}
                  <span className="text-xs text-slate-400">{formatDate(viagem.created_at)}</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
