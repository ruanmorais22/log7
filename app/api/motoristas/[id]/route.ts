import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  telefone: z.string().min(10).optional().nullable(),
  cpf: z.string().optional().nullable(),
  cnh_numero: z.string().optional().nullable(),
  cnh_categoria: z.string().optional().nullable(),
  cnh_validade: z.string().optional().nullable(),
  status: z.enum(['ativo', 'inativo', 'ferias', 'afastado']),
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
      .from('users')
      .update({
        nome: parsed.data.nome,
        telefone: parsed.data.telefone || null,
        cpf: parsed.data.cpf || null,
        cnh_numero: parsed.data.cnh_numero || null,
        cnh_categoria: parsed.data.cnh_categoria || null,
        cnh_validade: parsed.data.cnh_validade || null,
        status: parsed.data.status,
      })
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .eq('role', 'motorista')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar motorista:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
