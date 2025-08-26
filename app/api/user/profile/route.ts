import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { profileRateLimit, getClientIP } from '@/lib/rate-limit'
import { sanitizeInput, sanitizeDisplayName, isValidEmail, validatePasswordStrength, SECURITY_HEADERS } from '@/lib/security'

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(50).optional(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).optional(),
  onboarded: z.boolean().optional(),
})

async function createSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = await createSupabaseClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('User')
      .select('id, email, name, created_at, onboarded')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: profile
    })
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = profileRateLimit.check(clientIP)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many profile update attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      )
    }

    const body = await request.json()
    
    // Sanitize inputs
    if (body.email) {
      body.email = sanitizeInput(body.email)
      if (!isValidEmail(body.email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        )
      }
    }
    
    if (body.name) {
      body.name = sanitizeDisplayName(body.name)
    }
    
    if (body.password) {
      const passwordValidation = validatePasswordStrength(body.password)
      if (!passwordValidation.isValid) {
        return NextResponse.json(
          { success: false, error: 'Password does not meet security requirements', details: passwordValidation.errors },
          { status: 400 }
        )
      }
    }
    
    const validatedData = updateProfileSchema.parse(body)
    
    const supabase = await createSupabaseClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Handle password update via Supabase Auth
    if (validatedData.password) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: validatedData.password
      })
      
      if (passwordError) {
        return NextResponse.json(
          { success: false, error: passwordError.message },
          { status: 400 }
        )
      }
    }

    // Handle email update via Supabase Auth
    if (validatedData.email && validatedData.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: validatedData.email
      })
      
      if (emailError) {
        return NextResponse.json(
          { success: false, error: emailError.message },
          { status: 400 }
        )
      }
    }

    // Update profile in database
    const profileUpdates: Record<string, unknown> = {}
    if (validatedData.name !== undefined) {
      profileUpdates.name = validatedData.name
    }
    if (validatedData.email !== undefined) {
      profileUpdates.email = validatedData.email
    }
    if (validatedData.onboarded !== undefined) {
      profileUpdates.onboarded = validatedData.onboarded
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { data: profile, error: profileError } = await supabase
        .from('User')
        .update(profileUpdates)
        .eq('id', user.id)
        .select('id, email, name, created_at, onboarded')
        .single()

      if (profileError) {
        return NextResponse.json(
          { success: false, error: profileError.message },
          { status: 400 }
        )
      }

      const response = NextResponse.json({
        success: true,
        data: profile,
        message: validatedData.email && validatedData.email !== user.email 
          ? 'Profile updated. Please check your email to confirm the new email address.' 
          : 'Profile updated successfully'
      })
      
      // Add security headers
      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }

    // If only password was updated
    const passwordResponse = NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      passwordResponse.headers.set(key, value)
    })
    
    return passwordResponse

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}