import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const publicRoutes = ['/login', '/register', '/auth/callback', '/trial-expirado']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Não autenticado → login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (!user) return supabaseResponse

  // Usuário autenticado: ler role do JWT (app_metadata) — zero DB calls na maioria dos casos
  let role = user.app_metadata?.role as string | undefined
  let tenantId = user.app_metadata?.tenant_id as string | undefined

  // Fallback: consultar DB apenas se app_metadata não tiver o role (usuários antigos)
  if (!role && !isPublicRoute) {
    const adminDb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll() { return [] }, setAll() {} } }
    )
    const { data: profile } = await adminDb
      .from('users')
      .select('role, tenant_id, ativo')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !profile.ativo) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    role = profile.role
    tenantId = profile.tenant_id
  }

  // super_admin: acesso irrestrito, redireciona para /super-admin
  if (role === 'super_admin') {
    if (pathname === '/login' || pathname === '/register') {
      const url = request.nextUrl.clone()
      url.pathname = '/super-admin'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Autenticado acessando telas de auth → redirecionar para painel correto
  if (pathname === '/login' || pathname === '/register') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'motorista' ? '/motorista/home' : '/dashboard'
    return NextResponse.redirect(url)
  }

  if (!isPublicRoute && role) {
    // Verificar trial do tenant nas rotas de painel
    if (tenantId && (pathname.startsWith('/dashboard') || pathname.startsWith('/motorista/'))) {
      const adminDb = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() {} } }
      )
      const { data: tenant } = await adminDb
        .from('tenants')
        .select('trial_expires_at, ativo')
        .eq('id', tenantId)
        .maybeSingle()

      if (tenant) {
        const trialExpired = !tenant.ativo || new Date(tenant.trial_expires_at) < new Date()
        if (trialExpired) {
          const url = request.nextUrl.clone()
          url.pathname = '/trial-expirado'
          return NextResponse.redirect(url)
        }
      }
    }

    // Motorista tentando acessar painel admin
    const adminRoutes = ['/dashboard', '/motoristas', '/veiculos', '/viagens', '/financeiro', '/manutencoes', '/configuracoes']
    if (role === 'motorista' && adminRoutes.some((r) => pathname.startsWith(r))) {
      const url = request.nextUrl.clone()
      url.pathname = '/motorista/home'
      return NextResponse.redirect(url)
    }

    // Admin tentando acessar painel motorista
    if (role !== 'motorista' && pathname.startsWith('/motorista/')) {
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
