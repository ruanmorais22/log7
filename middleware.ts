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

  // Autenticado tentando acessar rotas de auth → redirecionar
  if (user && (pathname === '/login' || pathname === '/register')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'motorista' ? '/motorista/home' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Verificar acesso correto por role
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
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
      const { data: tenant } = await supabase
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
