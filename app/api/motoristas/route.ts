import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { motoristaSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get tenant_id and check role
    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role === 'motorista') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = motoristaSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Check plan limits
    const { data: limites } = await supabase.rpc('verificar_limite_plano', {
      p_tenant_id: profile.tenant_id,
    })

    const limite = limites as { motoristas_pode_adicionar: boolean; motoristas_limite: number; motoristas_atual: number }
    if (limite && !limite.motoristas_pode_adicionar) {
      return NextResponse.json(
        {
          error: `Limite do plano atingido. Você tem ${limite.motoristas_atual}/${limite.motoristas_limite} motoristas.`,
        },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()
    const { nome, email, cpf, cnh_numero, cnh_categoria, cnh_validade, telefone, status } = parsed.data

    // Invite user via Supabase Admin
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          nome,
          tenant_id: profile.tenant_id,
          role: 'motorista',
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback?next=/motorista/home`,
      }
    )

    if (inviteError) {
      // If user already exists, just create/update the profile
      if (!inviteError.message.includes('already registered')) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }
    }

    // Create or update user profile
    const userId = inviteData?.user?.id
    if (userId) {
      const { error: profileError } = await adminClient
        .from('users')
        .upsert({
          id: userId,
          tenant_id: profile.tenant_id,
          nome,
          email,
          role: 'motorista',
          cpf: cpf || null,
          cnh_numero: cnh_numero || null,
          cnh_categoria: cnh_categoria || null,
          cnh_validade: cnh_validade || null,
          telefone: telefone || null,
          status: status || 'ativo',
        })

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Convite enviado ao motorista' })
  } catch (error) {
    console.error('Erro ao criar motorista:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
