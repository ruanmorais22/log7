import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Client com anon key — apenas para verificar a sessão do usuário
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Client com service role — ignora RLS para queries de perfil/tenant
  const adminDb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas públicas
  const publicRoutes = ['/login', '/register', '/auth/callback', '/trial-expirado']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Não autenticado tentando acessar rota protegida
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Autenticado tentando acessar rotas de auth → redirecionar para painel correto
  if (user && (pathname === '/login' || pathname === '/register')) {
    const { data: profile } = await adminDb
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'motorista' ? '/motorista/home' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Verificar acesso correto por role em rotas protegidas
  if (user && !isPublicRoute) {
    const { data: profile } = await adminDb
      .from('users')
      .select('role, tenant_id, ativo')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.ativo) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Verificar trial do tenant
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/motorista')) {
      const { data: tenant } = await adminDb
        .from('tenants')
        .select('trial_expires_at, ativo, plano')
        .eq('id', profile.tenant_id)
        .single()

      if (tenant) {
        const trialExpired =
          !tenant.ativo || new Date(tenant.trial_expires_at) < new Date()

        if (trialExpired && pathname !== '/trial-expirado') {
          const url = request.nextUrl.clone()
          url.pathname = '/trial-expirado'
          return NextResponse.redirect(url)
        }
      }
    }

    // Redirecionar motorista tentando acessar painel admin
    if (profile.role === 'motorista' && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone()
      url.pathname = '/motorista/home'
      return NextResponse.redirect(url)
    }

    // Redirecionar admin/supervisor tentando acessar painel motorista
    if (
      profile.role !== 'motorista' &&
      pathname.startsWith('/motorista')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
