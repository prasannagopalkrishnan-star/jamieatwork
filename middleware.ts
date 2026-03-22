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

  // Protected routes — redirect to signup if not logged in
  const protectedPaths = ['/dashboard', '/onboarding', '/prospects', '/outreach', '/inbox', '/settings']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/register'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Already logged in — skip auth pages, route based on onboarding status
  const authPaths = ['/log-in', '/register']
  const isAuthPage = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    const onboardingCompleted = user.user_metadata?.onboarding_completed === true
    url.pathname = onboardingCompleted ? '/dashboard' : '/onboarding'
    return NextResponse.redirect(url)
  }

  const onboardingCompleted = user?.user_metadata?.onboarding_completed === true

  // Onboarding gate — redirect completed users away from /onboarding to /dashboard
  if (request.nextUrl.pathname.startsWith('/onboarding') && user && onboardingCompleted) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Dashboard gate — redirect to onboarding if not completed
  const dashboardPaths = ['/dashboard', '/prospects', '/outreach', '/inbox']
  const isDashboardPage = dashboardPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isDashboardPage && user && !onboardingCompleted) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/prospects/:path*', '/outreach/:path*', '/inbox/:path*', '/settings/:path*', '/log-in', '/register'],
}
