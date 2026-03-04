'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motoristaSchema, type MotoristaInput } from '@/lib/validations'
import { CATEGORIAS_CNH } from '@/lib/constants'
import { ArrowLeft, Loader2, Mail, UserPlus, CheckCircle } from 'lucide-react'

export default function NovoMotoristaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<MotoristaInput>({
    resolver: zodResolver(motoristaSchema),
    defaultValues: {
      nome: '',
      email: '',
      cpf: '',
      cnh_numero: '',
      cnh_categoria: '',
      cnh_validade: '',
      telefone: '',
      status: 'ativo',
    },
  })

  async function onSubmit(data: MotoristaInput) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/motoristas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Erro ao criar motorista. Tente novamente.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/motoristas')
        router.refresh()
      }, 2000)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <div className="bg-emerald-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
          <CheckCircle className="size-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Convite enviado!</h2>
        <p className="text-slate-500">
          O motorista receberá um e-mail para definir sua senha e acessar o sistema.
        </p>
        <p className="text-sm text-slate-400">Redirecionando para a lista...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/motoristas">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Novo Motorista</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Cadastre um motorista para sua frota
          </p>
        </div>
      </div>

      {/* Info card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 flex items-start gap-3">
          <Mail className="size-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            O motorista receberá um e-mail de convite para criar sua senha e acessar o aplicativo.
          </p>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados Pessoais</CardTitle>
              <CardDescription>Informações básicas do motorista</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nome completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>E-mail *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="motorista@exemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        O convite de acesso será enviado para este e-mail.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone / WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* CNH */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Habilitação (CNH)</CardTitle>
              <CardDescription>Informações da carteira de habilitação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cnh_numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da CNH</FormLabel>
                      <FormControl>
                        <Input placeholder="00000000000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnh_categoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIAS_CNH.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cnh_validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="max-w-[200px]">
                    <FormLabel>Status inicial</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="ferias">Férias</SelectItem>
                        <SelectItem value="afastado">Afastado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Error */}
          {error && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-4">
                <p className="text-sm text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/motoristas">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Enviando convite...
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Cadastrar e enviar convite
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
