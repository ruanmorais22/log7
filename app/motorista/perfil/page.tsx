import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { isExpired, expiresInDays } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Truck, User } from 'lucide-react'
import { PerfilEditForm } from './perfil-edit-form'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, tenants(trial_expires_at, ativo)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: atribuicao } = await supabase
    .from('motorista_veiculo')
    .select('*, veiculos(placa, modelo, tipo, ano)')
    .eq('motorista_id', user.id)
    .eq('ativo', true)
    .maybeSingle()

  const veiculo = atribuicao
    ? (atribuicao.veiculos as { placa: string; modelo: string | null; tipo: string; ano: number | null } | null)
    : null

  const cnhExpired = isExpired(profile.cnh_validade ?? null)
  const cnhExpiringSoon = !cnhExpired && expiresInDays(profile.cnh_validade ?? null, 30)
  const tenant = profile.tenants as { trial_expires_at: string; ativo: boolean }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-xl font-bold text-slate-800">Meu Perfil</h1>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Profile avatar + name */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
            {profile.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.foto_url}
                alt={profile.nome}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-orange-500" />
            )}
          </div>
          <div>
            <p className="text-xl font-bold text-slate-800">{profile.nome}</p>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">Motorista</p>
          </div>
        </div>

        {/* CNH Info */}
        <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
          cnhExpired ? 'border-red-200' : cnhExpiringSoon ? 'border-amber-200' : 'border-slate-100'
        }`}>
          <div className={`px-4 py-3 flex items-center gap-2 ${
            cnhExpired ? 'bg-red-50' : cnhExpiringSoon ? 'bg-amber-50' : 'bg-slate-50'
          }`}>
            {cnhExpired ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : cnhExpiringSoon ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
            <h2 className={`font-semibold text-sm ${
              cnhExpired ? 'text-red-800' : cnhExpiringSoon ? 'text-amber-800' : 'text-slate-700'
            }`}>
              CNH
              {cnhExpired ? ' — VENCIDA!' : cnhExpiringSoon ? ' — Atenção!' : ' — Válida'}
            </h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 font-medium">NÚMERO</p>
              <p className="font-semibold text-slate-700 text-sm mt-0.5">{profile.cnh_numero ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">CATEGORIA</p>
              <p className="font-semibold text-slate-700 text-sm mt-0.5">{profile.cnh_categoria ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">VALIDADE</p>
              <p className={`font-semibold text-sm mt-0.5 ${
                cnhExpired ? 'text-red-600' : cnhExpiringSoon ? 'text-amber-600' : 'text-slate-700'
              }`}>
                {formatDate(profile.cnh_validade ?? null)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">CPF</p>
              <p className="font-semibold text-slate-700 text-sm mt-0.5">{profile.cpf ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Vehicle assignment */}
        {veiculo ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-slate-400" />
              <h2 className="font-semibold text-slate-800">Veículo Atual</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 font-medium">PLACA</p>
                <p className="font-bold text-slate-800 text-lg mt-0.5">{veiculo.placa}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">MODELO</p>
                <p className="font-semibold text-slate-700 text-sm mt-0.5">{veiculo.modelo ?? '—'}</p>
              </div>
              {veiculo.tipo && (
                <div>
                  <p className="text-xs text-slate-400 font-medium">TIPO</p>
                  <p className="font-semibold text-slate-700 text-sm mt-0.5 capitalize">{veiculo.tipo.replace(/_/g, ' ')}</p>
                </div>
              )}
              {veiculo.ano && (
                <div>
                  <p className="text-xs text-slate-400 font-medium">ANO</p>
                  <p className="font-semibold text-slate-700 text-sm mt-0.5">{veiculo.ano}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 rounded-2xl p-4 flex items-center gap-3">
            <Truck className="h-5 w-5 text-slate-400" />
            <p className="text-sm text-slate-500">Nenhum veículo atribuído</p>
          </div>
        )}

        {/* Edit form (client component) */}
        <PerfilEditForm
          userId={user.id}
          tenantId={profile.tenant_id}
          initialNome={profile.nome}
          initialTelefone={profile.telefone ?? ''}
          cnhUrl={undefined}
          asoUrl={undefined}
        />
      </div>
    </div>
  )
}
