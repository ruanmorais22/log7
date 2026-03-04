import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  placa: z.string().min(7).max(8).optional(),
  tipo: z.enum(['caminhao_truck', 'carreta', 'van', 'utilitario', 'moto']).optional(),
  modelo: z.string().optional().nullable(),
  marca: z.string().optional().nullable(),
  ano: z.coerce.number().min(1950).max(new Date().getFullYear() + 1).optional().nullable(),
  km_atual: z.coerce.number().min(0).optional(),
  km_proxima_revisao: z.coerce.number().min(0).optional().nullable(),
  combustivel: z.enum(['diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'gnv', 'eletrico']).optional().nullable(),
  antt: z.string().optional().nullable(),
  antt_vencimento: z.string().optional().nullable(),
  seguro_apolice: z.string().optional().nullable(),
  seguro_vencimento: z.string().optional().nullable(),
  seguro_seguradora: z.string().optional().nullable(),
  crlv_vencimento: z.string().optional().nullable(),
  status: z.enum(['disponivel', 'em_rota', 'manutencao', 'inativo']).optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role === 'motorista') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('veiculos')
      .update(parsed.data)
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
