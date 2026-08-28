import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    // If Supabase is not configured, just let the request through
    // without enforcing auth, so the app doesn't crash with a blank screen.
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/auth')
  const isMfaRoute = request.nextUrl.pathname === '/mfa-verify' || request.nextUrl.pathname === '/mfa-setup'

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    
    // Check if user is fully authenticated
    if (data?.currentLevel === 'aal1' && !isMfaRoute && !isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa-verify'
      return NextResponse.redirect(url)
    }
    
    // Redirect away from login/mfa if already fully authenticated
    if (data?.currentLevel === 'aal2' && (isPublicRoute || isMfaRoute)) {
      const url = request.nextUrl.clone()
      url.pathname = '/send'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
