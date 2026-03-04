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
import { ArrowLeft, Loader2, Smartphone, UserPlus, Copy, Check, Users } from 'lucide-react'

interface Credentials {
  telefone: string
  senha: string
}

export default function NovoMotoristaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const form = useForm<MotoristaInput>({
    resolver: zodResolver(motoristaSchema),
    defaultValues: {
      nome: '',
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

      setCredentials(json.credentials)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function copyCredentials() {
    if (!credentials) return
    const text = `FreteLog — Acesso do motorista\nTelefone: ${credentials.telefone}\nSenha: ${credentials.senha}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Tela de sucesso com credenciais
  if (credentials) {
    return (
      <div className="max-w-lg mx-auto py-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="bg-emerald-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
            <Smartphone className="size-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Motorista cadastrado!</h2>
          <p className="text-slate-500 text-sm">
            Compartilhe as credenciais abaixo com o motorista via WhatsApp ou pessoalmente.
          </p>
        </div>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-orange-800">Credenciais de acesso</CardTitle>
            <CardDescription className="text-orange-600 text-xs">
              O motorista usa o telefone como login e essa senha para entrar no app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <p className="text-xs text-slate-500 mb-1">Telefone (login)</p>
                <p className="font-bold text-slate-800 font-mono text-lg tracking-wide">
                  {credentials.telefone}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <p className="text-xs text-slate-500 mb-1">Senha</p>
                <p className="font-bold text-slate-800 font-mono text-lg tracking-wide">
                  {credentials.senha}
                </p>
              </div>
            </div>
            <Button
              onClick={copyCredentials}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              {copied ? (
                <><Check className="size-4 mr-2 text-emerald-600" />Copiado!</>
              ) : (
                <><Copy className="size-4 mr-2" />Copiar para enviar no WhatsApp</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setCredentials(null)
              form.reset()
            }}
          >
            <UserPlus className="size-4 mr-2" />
            Cadastrar outro
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.push('/motoristas')}
          >
            <Users className="size-4 mr-2" />
            Ver lista
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
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
          <Smartphone className="size-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            O acesso é criado automaticamente com o <strong>telefone</strong> e uma senha simples.
            Nenhum e-mail é enviado — você compartilha as credenciais diretamente com o motorista.
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
                  name="telefone"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Telefone / WhatsApp *</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormDescription>
                        Este número será o login do motorista no aplicativo.
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
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Criando acesso...
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Cadastrar motorista
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
