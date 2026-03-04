'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
import { veiculoSchema, type VeiculoInput } from '@/lib/validations'
import { TIPOS_VEICULO, COMBUSTIVEIS } from '@/lib/constants'
import { ArrowLeft, Loader2, Truck } from 'lucide-react'

export default function NovoVeiculoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<VeiculoInput>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: {
      placa: '',
      tipo: 'caminhao_truck',
      modelo: '',
      marca: '',
      ano: undefined,
      km_atual: 0,
      km_proxima_revisao: undefined,
      combustivel: 'diesel_s10',
      antt: '',
      antt_vencimento: '',
      seguro_apolice: '',
      seguro_vencimento: '',
      seguro_seguradora: '',
      crlv_vencimento: '',
    },
  })

  async function onSubmit(data: VeiculoInput) {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Sessão expirada. Faça login novamente.')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError('Erro ao obter informações do perfil.')
        return
      }

      const { error: insertError } = await supabase.from('veiculos').insert({
        ...data,
        tenant_id: profile.tenant_id,
        placa: data.placa.toUpperCase().replace(/\s/g, ''),
        modelo: data.modelo || null,
        marca: data.marca || null,
        ano: data.ano ?? null,
        km_proxima_revisao: data.km_proxima_revisao ?? null,
        combustivel: data.combustivel ?? null,
        antt: data.antt || null,
        antt_vencimento: data.antt_vencimento || null,
        seguro_apolice: data.seguro_apolice || null,
        seguro_vencimento: data.seguro_vencimento || null,
        seguro_seguradora: data.seguro_seguradora || null,
        crlv_vencimento: data.crlv_vencimento || null,
        status: 'disponivel',
        ativo: true,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Já existe um veículo com essa placa cadastrado.')
        } else {
          setError('Erro ao cadastrar veículo. Tente novamente.')
        }
        return
      }

      router.push('/veiculos')
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/veiculos">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Novo Veículo</h1>
          <p className="text-slate-500 text-sm mt-0.5">Cadastre um veículo na sua frota</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="size-4" />
                Identificação
              </CardTitle>
              <CardDescription>Dados principais do veículo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="placa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ABC-1234 ou ABC1D23"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          className="font-mono uppercase"
                        />
                      </FormControl>
                      <FormDescription>
                        Formato antigo (ABC-1234) ou Mercosul (ABC1D23)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_VEICULO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
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
                  name="marca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Volvo, Mercedes, DAF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: FH 500, Actros 2651" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ano"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={String(new Date().getFullYear())}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="combustivel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Combustível</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMBUSTIVEIS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* KM */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quilometragem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="km_atual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KM Atual</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="km_proxima_revisao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KM Próxima Revisão</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ex: 150000"
                          min={0}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Documentação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentação</CardTitle>
              <CardDescription>Registre os documentos e suas datas de vencimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CRLV */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">CRLV</p>
                <FormField
                  control={form.control}
                  name="crlv_vencimento"
                  render={({ field }) => (
                    <FormItem className="max-w-[200px]">
                      <FormLabel>Vencimento do CRLV</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ANTT */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">ANTT / RNTRC</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="antt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número ANTT</FormLabel>
                        <FormControl>
                          <Input placeholder="RNTRC / ANTT" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="antt_vencimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vencimento ANTT</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Seguro */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Seguro</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="seguro_seguradora"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seguradora</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da seguradora" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seguro_apolice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número da Apólice</FormLabel>
                        <FormControl>
                          <Input placeholder="Número da apólice" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seguro_vencimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vencimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
              <Link href="/veiculos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Truck className="size-4" />
                  Cadastrar Veículo
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
