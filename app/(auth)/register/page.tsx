'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Truck, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const beneficios = [
  '14 dias grátis, sem cartão de crédito',
  'Controle de motoristas e frota',
  'DRE automático e relatórios',
  'Checkpoints e rastreamento de viagens',
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    setLoading(true)
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome: data.nome,
            empresa_nome: data.empresa_nome,
            cnpj: data.cnpj,
          },
        },
      })

      if (authError) {
        toast.error(authError.message)
        return
      }

      if (!authData.user) {
        toast.error('Erro ao criar conta. Tente novamente.')
        return
      }

      // 2. Criar tenant + admin via function
      const { error: tenantError } = await supabase.rpc('criar_tenant_e_admin', {
        p_tenant_nome: data.empresa_nome,
        p_tenant_cnpj: data.cnpj || '',
        p_user_id: authData.user.id,
        p_user_nome: data.nome,
        p_user_email: data.email,
      })

      if (tenantError) {
        console.error('Erro ao criar tenant:', tenantError)
      }

      toast.success('Conta criada! Seu trial de 14 dias começou.')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: benefícios */}
        <div className="hidden lg:block space-y-6">
          <div className="flex items-center gap-2 text-white">
            <Truck className="h-10 w-10 text-orange-400" />
            <span className="text-3xl font-bold">FreteLog</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Gestão profissional para sua transportadora
            </h2>
            <p className="text-slate-400">
              Controle frota, motoristas, gastos e DRE em um só lugar.
            </p>
          </div>
          <ul className="space-y-3">
            {beneficios.map((b) => (
              <li key={b} className="flex items-center gap-3 text-slate-300">
                <CheckCircle className="h-5 w-5 text-orange-400 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-slate-300 text-sm">
              <strong className="text-white">Starter:</strong> R$ 149/mês — até 5 motoristas<br />
              <strong className="text-white">Growth:</strong> R$ 349/mês — até 20 motoristas<br />
              <strong className="text-white">Pro:</strong> R$ 749/mês — até 50 motoristas
            </p>
          </div>
        </div>

        {/* Right: form */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-2 text-white lg:hidden mb-2">
              <Truck className="h-6 w-6 text-orange-400" />
              <span className="text-xl font-bold">FreteLog</span>
            </div>
            <CardTitle className="text-white text-xl">Cadastrar transportadora</CardTitle>
            <CardDescription className="text-slate-400">
              14 dias grátis, sem cartão de crédito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="empresa_nome" className="text-slate-200">Nome da empresa *</Label>
                <Input
                  id="empresa_nome"
                  placeholder="Transportadora ABC Ltda"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  {...register('empresa_nome')}
                />
                {errors.empresa_nome && (
                  <p className="text-red-400 text-xs">{errors.empresa_nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-slate-200">CNPJ (opcional)</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0001-00"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  {...register('cnpj')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome" className="text-slate-200">Seu nome *</Label>
                <Input
                  id="nome"
                  placeholder="João Silva"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  {...register('nome')}
                />
                {errors.nome && (
                  <p className="text-red-400 text-xs">{errors.nome.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.com"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-red-400 text-xs">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                disabled={loading}
              >
                {loading ? 'Criando conta...' : 'Começar trial gratuito'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-slate-400 text-sm">
                Já tem conta?{' '}
                <Link href="/login" className="text-orange-400 hover:text-orange-300 font-medium">
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
