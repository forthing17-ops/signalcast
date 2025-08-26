import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required for account deletion'),
  confirmation: z.literal('DELETE', { 
    errorMap: () => ({ message: 'You must type DELETE to confirm account deletion' }) 
  })
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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = deleteAccountSchema.parse(body)
    
    const supabase = await createSupabaseClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify password before deletion
    if (user.email) {
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: validatedData.password,
      })
      
      if (passwordError) {
        return NextResponse.json(
          { success: false, error: 'Invalid password' },
          { status: 400 }
        )
      }
    }

    // Delete user data cascade (Prisma should handle this with cascade deletes)
    // Note: In a production app, you might want to soft-delete and anonymize data
    // rather than hard delete for audit purposes
    
    // Delete related data first (handled by cascade delete in schema)
    const { error: deleteUserError } = await supabase
      .from('User')
      .delete()
      .eq('id', user.id)

    if (deleteUserError) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    // Delete the auth user (this will also sign them out)
    const { error: deleteAuthError } = await supabase.rpc('delete_user')
    
    if (deleteAuthError) {
      // Log the error but continue - the user profile is already deleted
      console.error('Error deleting auth user:', deleteAuthError)
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}