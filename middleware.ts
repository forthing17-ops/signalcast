import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Demo mode bypass for testing
  if (process.env.DEMO_MODE === 'true') {
    // Check if user has demo session cookie
    const demoSession = req.cookies.get('demo-session')
    const hasAuth = demoSession?.value === 'authenticated'

    // Auth condition for demo mode
    if (req.nextUrl.pathname.startsWith('/app') && !hasAuth) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    if (req.nextUrl.pathname.startsWith('/auth') && hasAuth) {
      return NextResponse.redirect(new URL('/app', req.url))
    }

    // Skip onboarding flow in demo mode
    return response
  }

  // Original Supabase auth logic for production
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Auth condition
  if (req.nextUrl.pathname.startsWith('/app') && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (req.nextUrl.pathname.startsWith('/auth') && session) {
    return NextResponse.redirect(new URL('/app', req.url))
  }

  // Onboarding flow - redirect to onboarding if user is not onboarded
  if (session && req.nextUrl.pathname.startsWith('/app') && req.nextUrl.pathname !== '/app/onboarding') {
    try {
      // Check if user has completed onboarding
      const { data: user, error } = await supabase
        .from('User')
        .select('onboarded')
        .eq('id', session.user.id)
        .single()

      if (!error && user && !user.onboarded) {
        return NextResponse.redirect(new URL('/app/onboarding', req.url))
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  // Redirect onboarded users away from onboarding page
  if (session && req.nextUrl.pathname === '/app/onboarding') {
    try {
      const { data: user, error } = await supabase
        .from('User')
        .select('onboarded')
        .eq('id', session.user.id)
        .single()

      if (!error && user && user.onboarded) {
        return NextResponse.redirect(new URL('/app', req.url))
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  return response
}

export const config = {
  matcher: ['/app/:path*', '/auth/:path*'],
}