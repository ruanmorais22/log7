import Link from 'next/link'
import { Truck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { PLANOS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

export default async function TrialExpiradoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let tenantNome = 'sua transportadora'
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, tenants(nome)')
      .eq('id', user.id)
      .single()
    if (profile?.tenants) {
      tenantNome = (profile.tenants as { nome: string }).nome
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-white">
            <Truck className="h-8 w-8 text-orange-400" />
            <span className="text-2xl font-bold">FreteLog</span>
          </div>
        </div>

        <Card className="border-red-800 bg-slate-800/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <AlertCircle className="h-12 w-12 text-red-400" />
            </div>
            <CardTitle className="text-white text-xl">Trial encerrado</CardTitle>
            <CardDescription className="text-slate-400">
              O período de teste de <strong className="text-slate-300">{tenantNome}</strong> expirou.
              Escolha um plano para continuar usando o FreteLog.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PLANOS).map(([key, plano]) => (
            <Card
              key={key}
              className={`border-slate-700 bg-slate-800/50 ${key === 'growth' ? 'border-orange-500 ring-1 ring-orange-500' : ''}`}
            >
              <CardHeader className="pb-2">
                {key === 'growth' && (
                  <div className="text-xs font-semibold text-orange-400 mb-1 uppercase tracking-wide">Mais popular</div>
                )}
                <CardTitle className="text-white">{plano.nome}</CardTitle>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(plano.preco)}
                  <span className="text-sm font-normal text-slate-400">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-slate-400 text-sm">
                <p>Até {plano.motoristas} motoristas</p>
                <p>Até {plano.veiculos === Infinity ? 'ilimitados' : plano.veiculos} veículos</p>
                <p>Retenção de {plano.retencao}</p>
                <Button
                  className={`w-full mt-4 ${key === 'growth' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-600 hover:bg-slate-500'} text-white`}
                  asChild
                >
                  <Link href={`/configuracoes?upgrade=${key}`}>
                    Assinar {plano.nome}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-slate-500 hover:text-slate-400 text-sm underline">
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
