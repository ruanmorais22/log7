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

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .maybeSingle()

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

    // Verificar limite do plano
    const { data: limites } = await supabase.rpc('verificar_limite_plano', {
      p_tenant_id: profile.tenant_id,
    })

    const limite = limites as { motoristas_pode_adicionar: boolean; motoristas_limite: number; motoristas_atual: number }
    if (limite && !limite.motoristas_pode_adicionar) {
      return NextResponse.json(
        { error: `Limite do plano atingido (${limite.motoristas_atual}/${limite.motoristas_limite} motoristas).` },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()
    const { nome, cpf, cnh_numero, cnh_categoria, cnh_validade, telefone, status } = parsed.data

    // Gerar email interno e senha genérica a partir do telefone
    const cleanPhone = (telefone ?? '').replace(/\D/g, '')
    const authEmail = `${cleanPhone}@motorista.fretelog`
    const authPassword = `Frete@${cleanPhone.slice(-4)}`

    // Criar usuário sem confirmação de e-mail
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
      user_metadata: { nome, role: 'motorista' },
    })

    if (createError) {
      const msg = createError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        return NextResponse.json(
          { error: 'Já existe um motorista cadastrado com este telefone.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!newUser.user) {
      return NextResponse.json({ error: 'Erro ao criar acesso do motorista' }, { status: 500 })
    }

    // Criar perfil na tabela users
    const { error: profileError } = await adminClient
      .from('users')
      .insert({
        id: newUser.user.id,
        tenant_id: profile.tenant_id,
        nome,
        email: authEmail,
        role: 'motorista',
        cpf: cpf || null,
        cnh_numero: cnh_numero || null,
        cnh_categoria: cnh_categoria || null,
        cnh_validade: cnh_validade || null,
        telefone: cleanPhone,
        status: status || 'ativo',
        ativo: true,
      })

    if (profileError) {
      // Desfazer criação do auth user se o perfil falhar
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      credentials: {
        telefone: cleanPhone,
        senha: authPassword,
      },
    })
  } catch (error) {
    console.error('Erro ao criar motorista:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
