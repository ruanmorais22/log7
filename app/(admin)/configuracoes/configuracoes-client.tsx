'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLANOS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Building2, User, ShieldCheck, CreditCard,
  CheckCircle, ChevronRight, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface ProfileData {
  id: string
  nome: string
  telefone: string
  role: string
}

interface TenantData {
  id: string
  nome: string
  cnpj: string | null
  plano: string
  aprovacao_gastos: boolean
  limite_aprovacao: number | null
}

interface UsageData {
  motoristas: number
  veiculos: number
}

interface ConfiguracoesClientProps {
  profile: ProfileData
  tenant: TenantData
  usage: UsageData
  email: string
}

export function ConfiguracoesClient({ profile, tenant, usage, email }: ConfiguracoesClientProps) {
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'

  // Empresa tab state
  const [empresaNome, setEmpresaNome] = useState(tenant.nome)
  const [empresaCnpj, setEmpresaCnpj] = useState(tenant.cnpj ?? '')
  const [savingEmpresa, startEmpresa] = useTransition()

  // Conta tab state
  const [contaNome, setContaNome] = useState(profile.nome)
  const [contaTelefone, setContaTelefone] = useState(profile.telefone)
  const [savingConta, startConta] = useTransition()

  // Password state
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [savingSenha, startSenha] = useTransition()

  // Aprovação tab state
  const [aprovacaoGastos, setAprovacaoGastos] = useState(tenant.aprovacao_gastos)
  const [limiteAprovacao, setLimiteAprovacao] = useState(
    tenant.limite_aprovacao !== null ? String(tenant.limite_aprovacao) : ''
  )
  const [savingAprovacao, startAprovacao] = useTransition()

  const planoAtual = PLANOS[tenant.plano as keyof typeof PLANOS] ?? PLANOS.starter

  async function handleSaveEmpresa() {
    if (!empresaNome.trim()) { toast.error('Nome da empresa obrigatório'); return }
    startEmpresa(async () => {
      const { error } = await supabase
        .from('tenants')
        .update({ nome: empresaNome.trim(), cnpj: empresaCnpj.trim() || null })
        .eq('id', tenant.id)

      if (error) { toast.error('Erro ao salvar dados da empresa'); return }
      toast.success('Dados da empresa atualizados!')
    })
  }

  async function handleSaveConta() {
    if (!contaNome.trim()) { toast.error('Nome obrigatório'); return }
    startConta(async () => {
      const { error } = await supabase
        .from('users')
        .update({ nome: contaNome.trim(), telefone: contaTelefone.trim() || null })
        .eq('id', profile.id)

      if (error) { toast.error('Erro ao atualizar perfil'); return }
      toast.success('Perfil atualizado com sucesso!')
    })
  }

  async function handleChangeSenha() {
    if (!novaSenha || novaSenha.length < 6) { toast.error('Nova senha deve ter ao menos 6 caracteres'); return }
    if (novaSenha !== confirmarSenha) { toast.error('As senhas não coincidem'); return }

    startSenha(async () => {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) { toast.error('Erro ao atualizar senha: ' + error.message); return }
      toast.success('Senha atualizada com sucesso!')
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmarSenha('')
    })
  }

  async function handleSaveAprovacao() {
    startAprovacao(async () => {
      const payload: Record<string, unknown> = { aprovacao_gastos: aprovacaoGastos }
      if (aprovacaoGastos && limiteAprovacao) {
        payload.limite_aprovacao = Number(limiteAprovacao)
      } else if (!aprovacaoGastos) {
        payload.limite_aprovacao = null
      }

      const { error } = await supabase
        .from('tenants')
        .update(payload)
        .eq('id', tenant.id)

      if (error) { toast.error('Erro ao salvar configurações de aprovação'); return }
      toast.success('Configurações salvas!')
    })
  }

  function UsageBar({ current, max, label }: { current: number; max: number | typeof Infinity; label: string }) {
    const isUnlimited = max === Infinity
    const percent = isUnlimited ? 0 : Math.min((current / max) * 100, 100)
    const isWarning = !isUnlimited && percent >= 80
    const isFull = !isUnlimited && current >= max

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{label}</span>
          <span className={`font-medium ${isFull ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-700'}`}>
            {current} / {isUnlimited ? '∞' : max}
          </span>
        </div>
        {!isUnlimited && (
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm">Gerencie as configurações da sua conta e empresa</p>
      </div>

      <Tabs defaultValue="empresa">
        <TabsList className="bg-slate-100 w-full sm:w-auto">
          <TabsTrigger value="empresa" className="text-xs flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="conta" className="text-xs flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Conta
          </TabsTrigger>
          <TabsTrigger value="aprovacao" className="text-xs flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Aprovação
          </TabsTrigger>
          <TabsTrigger value="plano" className="text-xs flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Plano
          </TabsTrigger>
        </TabsList>

        {/* EMPRESA TAB */}
        <TabsContent value="empresa" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Apenas administradores podem editar os dados da empresa.
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="empresa_nome">Nome da Empresa</Label>
                <Input
                  id="empresa_nome"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Nome da transportadora"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empresa_cnpj">CNPJ</Label>
                <Input
                  id="empresa_cnpj"
                  value={empresaCnpj}
                  onChange={(e) => setEmpresaCnpj(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveEmpresa}
                    disabled={savingEmpresa}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {savingEmpresa ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTA TAB */}
        <TabsContent value="conta" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meu Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="conta_email">E-mail</Label>
                <Input
                  id="conta_email"
                  value={email}
                  disabled
                  className="bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400">O e-mail não pode ser alterado por aqui.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conta_nome">Nome</Label>
                <Input
                  id="conta_nome"
                  value={contaNome}
                  onChange={(e) => setContaNome(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conta_telefone">Telefone / WhatsApp</Label>
                <Input
                  id="conta_telefone"
                  value={contaTelefone}
                  onChange={(e) => setContaTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveConta}
                  disabled={savingConta}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {savingConta ? 'Salvando...' : 'Salvar Perfil'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alterar Senha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nova_senha">Nova Senha</Label>
                <Input
                  id="nova_senha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmar_senha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmar_senha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleChangeSenha}
                  disabled={savingSenha || !novaSenha}
                  size="sm"
                  variant="outline"
                >
                  {savingSenha ? 'Atualizando...' : 'Atualizar Senha'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APROVAÇÃO TAB */}
        <TabsContent value="aprovacao" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações de Aprovação de Gastos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!isAdmin && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Apenas administradores podem alterar as configurações de aprovação.
                </div>
              )}

              {/* Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800">Gastos requerem aprovação</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quando ativado, os gastos registrados pelos motoristas precisam ser aprovados por um administrador antes de serem contabilizados.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aprovacaoGastos}
                  onClick={() => isAdmin && setAprovacaoGastos(!aprovacaoGastos)}
                  disabled={!isAdmin}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    aprovacaoGastos ? 'bg-orange-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform ${
                      aprovacaoGastos ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Limite de aprovação */}
              {aprovacaoGastos && (
                <div className="space-y-1.5 pl-4 border-l-2 border-orange-200">
                  <Label htmlFor="limite_aprovacao">
                    Valor mínimo para aprovação obrigatória (R$)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="limite_aprovacao"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 100,00 — deixe vazio para exigir em todos os valores"
                      value={limiteAprovacao}
                      onChange={(e) => setLimiteAprovacao(e.target.value)}
                      disabled={!isAdmin}
                      className="max-w-xs"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {limiteAprovacao
                      ? `Apenas gastos acima de ${formatCurrency(Number(limiteAprovacao))} precisarão de aprovação.`
                      : 'Todos os gastos precisarão de aprovação.'}
                  </p>
                </div>
              )}

              {isAdmin && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAprovacao}
                    disabled={savingAprovacao}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {savingAprovacao ? 'Salvando...' : 'Salvar Configurações'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANO TAB */}
        <TabsContent value="plano" className="mt-4 space-y-4">
          {/* Current Plan */}
          <Card className="border-orange-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Plano Atual</CardTitle>
                <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                  {planoAtual.nome}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">{planoAtual.descricao}</p>
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(planoAtual.preco)}
                <span className="text-sm font-normal text-slate-500">/mês</span>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Uso atual</p>
                <UsageBar
                  current={usage.motoristas}
                  max={planoAtual.motoristas}
                  label="Motoristas"
                />
                <UsageBar
                  current={usage.veiculos}
                  max={planoAtual.veiculos}
                  label="Veículos"
                />
              </div>

              <div className="text-xs text-slate-500">
                Retenção de dados: <span className="font-medium text-slate-700">{planoAtual.retencao}</span>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Options */}
          {tenant.plano !== 'pro' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Opções de upgrade</p>
              {Object.entries(PLANOS)
                .filter(([key]) => {
                  const order = ['starter', 'growth', 'pro']
                  return order.indexOf(key) > order.indexOf(tenant.plano)
                })
                .map(([key, plano]) => (
                  <Card key={key} className="border-slate-200 hover:border-orange-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{plano.nome}</span>
                            {key === 'pro' && (
                              <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Popular</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{plano.descricao}</p>
                          <ul className="space-y-1 mt-2">
                            {[
                              `${plano.motoristas} motoristas`,
                              plano.veiculos === Infinity ? 'Veículos ilimitados' : `${plano.veiculos} veículos`,
                              `Retenção de ${plano.retencao}`,
                            ].map((feature) => (
                              <li key={feature} className="flex items-center gap-1.5 text-xs text-slate-600">
                                <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="font-bold text-slate-800">
                            {formatCurrency(plano.preco)}
                            <span className="text-xs font-normal text-slate-500">/mês</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                            onClick={() => toast.info('Entre em contato: contato@fretelog.com.br')}
                          >
                            Entrar em contato
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {tenant.plano === 'pro' && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-purple-800">Você está no plano Pro!</p>
                  <p className="text-xs text-purple-600">Você tem acesso a todos os recursos disponíveis.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
