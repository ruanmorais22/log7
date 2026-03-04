'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TIPOS_VEICULO, COMBUSTIVEIS } from '@/lib/constants'

const editSchema = z.object({
  placa: z.string().min(7).max(8),
  tipo: z.enum(['caminhao_truck', 'carreta', 'van', 'utilitario', 'moto']),
  modelo: z.string().optional(),
  marca: z.string().optional(),
  ano: z.coerce.number().min(1950).max(new Date().getFullYear() + 1).optional().or(z.literal('')),
  km_atual: z.coerce.number().min(0),
  km_proxima_revisao: z.coerce.number().min(0).optional().or(z.literal('')),
  combustivel: z.enum(['diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'gnv', 'eletrico']).optional(),
  antt: z.string().optional(),
  antt_vencimento: z.string().optional(),
  seguro_apolice: z.string().optional(),
  seguro_vencimento: z.string().optional(),
  seguro_seguradora: z.string().optional(),
  crlv_vencimento: z.string().optional(),
  status: z.enum(['disponivel', 'em_rota', 'manutencao', 'inativo']),
})

type EditInput = z.infer<typeof editSchema>

export default function EditarVeiculoPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  const form = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      placa: '', tipo: 'caminhao_truck', modelo: '', marca: '',
      ano: '', km_atual: 0, km_proxima_revisao: '',
      combustivel: undefined, antt: '', antt_vencimento: '',
      seguro_apolice: '', seguro_vencimento: '', seguro_seguradora: '',
      crlv_vencimento: '', status: 'disponivel',
    },
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('veiculos')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (data) {
        form.reset({
          placa: data.placa ?? '',
          tipo: data.tipo ?? 'caminhao_truck',
          modelo: data.modelo ?? '',
          marca: data.marca ?? '',
          ano: data.ano ?? '',
          km_atual: data.km_atual ?? 0,
          km_proxima_revisao: data.km_proxima_revisao ?? '',
          combustivel: data.combustivel ?? undefined,
          antt: data.antt ?? '',
          antt_vencimento: data.antt_vencimento ?? '',
          seguro_apolice: data.seguro_apolice ?? '',
          seguro_vencimento: data.seguro_vencimento ?? '',
          seguro_seguradora: data.seguro_seguradora ?? '',
          crlv_vencimento: data.crlv_vencimento ?? '',
          status: data.status ?? 'disponivel',
        })
      }
      setFetching(false)
    }
    load()
  }, [id])

  async function onSubmit(data: EditInput) {
    setLoading(true)
    try {
      const res = await fetch(`/api/veiculos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ano: data.ano === '' ? null : data.ano,
          km_proxima_revisao: data.km_proxima_revisao === '' ? null : data.km_proxima_revisao,
          modelo: data.modelo || null,
          marca: data.marca || null,
          antt: data.antt || null,
          antt_vencimento: data.antt_vencimento || null,
          seguro_apolice: data.seguro_apolice || null,
          seguro_vencimento: data.seguro_vencimento || null,
          seguro_seguradora: data.seguro_seguradora || null,
          crlv_vencimento: data.crlv_vencimento || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erro ao salvar.')
        return
      }
      toast.success('Veículo atualizado com sucesso.')
      router.push(`/veiculos/${id}`)
    } catch {
      toast.error('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/veiculos/${id}`}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar Veículo</h1>
          <p className="text-slate-500 text-sm mt-0.5">Atualize os dados do veículo</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados básicos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Veículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="placa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa *</FormLabel>
                    <FormControl><Input placeholder="ABC-1234" className="uppercase" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {TIPOS_VEICULO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="marca" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl><Input placeholder="Volvo" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="modelo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl><Input placeholder="FH 540" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ano" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <FormControl><Input type="number" placeholder="2020" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="combustivel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustível</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {COMBUSTIVEIS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* KM */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quilometragem</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="km_atual" render={({ field }) => (
                <FormItem>
                  <FormLabel>KM Atual *</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="km_proxima_revisao" render={({ field }) => (
                <FormItem>
                  <FormLabel>KM Próxima Revisão</FormLabel>
                  <FormControl><Input type="number" placeholder="Ex: 250000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Documentação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="crlv_vencimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento CRLV</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="antt" render={({ field }) => (
                <FormItem>
                  <FormLabel>ANTT / RNTRC</FormLabel>
                  <FormControl><Input placeholder="Número ANTT" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="antt_vencimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento ANTT</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="seguro_seguradora" render={({ field }) => (
                <FormItem>
                  <FormLabel>Seguradora</FormLabel>
                  <FormControl><Input placeholder="Nome da seguradora" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="seguro_apolice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Apólice do Seguro</FormLabel>
                  <FormControl><Input placeholder="Número da apólice" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="seguro_vencimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento do Seguro</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem className="max-w-[200px]">
                  <FormLabel>Status do veículo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="em_rota">Em Rota</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href={`/veiculos/${id}`}>Cancelar</Link>
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? (
                <><Loader2 className="size-4 animate-spin" />Salvando...</>
              ) : (
                <><Save className="size-4" />Salvar alterações</>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
