'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Converte telefone para email interno de motoristas
function phoneToEmail(value: string): string {
  const digits = value.replace(/\D/g, '')
  return `${digits}@motorista.fretelog`
}

function isPhoneNumber(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 11 && /^\d+$/.test(digits)
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    try {
      // Motoristas fazem login com telefone → converte para e-mail interno
      const emailToUse = isPhoneNumber(data.email)
        ? phoneToEmail(data.email)
        : data.email

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: data.password,
      })
      if (error || !authData.user) {
        toast.error('Credenciais inválidas. Verifique seu telefone/e-mail e senha.')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .maybeSingle()

      const destino = profile?.role === 'motorista' ? '/motorista/home' : '/dashboard'
      window.location.href = destino
    } catch {
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-white">
            <Truck className="h-8 w-8" />
            <span className="text-2xl font-bold">FreteLog</span>
          </div>
          <p className="text-slate-400 text-sm">Gestão de transportadoras</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white text-xl">Entrar na conta</CardTitle>
            <CardDescription className="text-slate-400">
              Gestores: use seu e-mail. Motoristas: use seu telefone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">E-mail ou Telefone</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="email@empresa.com ou (11) 99999-9999"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-red-400 text-xs">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
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
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-slate-400 text-sm">
                Não tem conta?{' '}
                <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium">
                  Cadastre sua transportadora
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
