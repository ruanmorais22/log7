import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const encerrarSchema = z.object({
  km_fim: z.coerce.number().min(0).optional().nullable(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    if (!profile) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = encerrarSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Buscar a viagem
    const { data: viagem } = await supabase
      .from('viagens')
      .select('id, status, veiculo_id, motorista_id')
      .eq('id', id)
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()

    if (!viagem) {
      return NextResponse.json({ error: 'Viagem não encontrada' }, { status: 404 })
    }

    if (viagem.status === 'encerrada' || viagem.status === 'cancelada') {
      return NextResponse.json({ error: 'Viagem já está encerrada' }, { status: 400 })
    }

    // Encerrar a viagem
    const { error: viagemError } = await supabase
      .from('viagens')
      .update({
        status: 'encerrada',
        km_fim: parsed.data.km_fim ?? null,
        encerrado_em: new Date().toISOString(),
      })
      .eq('id', id)

    if (viagemError) {
      return NextResponse.json({ error: viagemError.message }, { status: 500 })
    }

    // Atualizar KM do veículo se informado
    if (parsed.data.km_fim && viagem.veiculo_id) {
      await supabase
        .from('veiculos')
        .update({
          km_atual: parsed.data.km_fim,
          status: 'disponivel',
        })
        .eq('id', viagem.veiculo_id)
        .eq('tenant_id', profile.tenant_id)
    } else if (viagem.veiculo_id) {
      await supabase
        .from('veiculos')
        .update({ status: 'disponivel' })
        .eq('id', viagem.veiculo_id)
        .eq('tenant_id', profile.tenant_id)
    }

    // Adicionar checkpoint de chegada
    await supabase
      .from('checkpoints')
      .insert({
        viagem_id: id,
        tipo: 'chegada',
        descricao: 'Viagem encerrada pelo gestor.',
        km_atual: parsed.data.km_fim ?? null,
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao encerrar viagem:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
