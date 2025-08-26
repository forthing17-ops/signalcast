'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // Demo mode authentication bypass
      console.log('Demo mode check:', {
        envVar: process.env.NEXT_PUBLIC_DEMO_MODE,
        hostname: window.location.hostname,
        email: data.email,
        password: data.password
      })
      
      if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || (typeof window !== 'undefined' && window.location.hostname === 'localhost')) {
        console.log('Demo mode detected, validating credentials')
        
        // Validate demo credentials
        if (data.email === 'forthing17@gmail.com' && data.password === 'Thanhan175@') {
          console.log('Demo credentials valid, setting cookie and redirecting')
          // Set demo session cookie
          document.cookie = 'demo-session=authenticated; path=/; max-age=86400; SameSite=Strict'
          router.push('/app')
          router.refresh()
          return
        } else {
          console.log('Demo credentials invalid')
          setError('Demo mode: Use forthing17@gmail.com / Thanhan175@')
          setIsLoading(false)
          return
        }
      } else {
        console.log('Demo mode not detected, using Supabase auth')
      }

      // Original Supabase authentication
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          setError('Too many login attempts. Please wait before trying again.')
        } else {
          setError(error.message)
        }
        setIsLoading(false)
      } else {
        router.push('/feed')
        router.refresh()
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your SignalCast account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register('password')}
                aria-invalid={errors.password ? 'true' : 'false'}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <div className="text-center space-y-2">
              <div className="text-sm">
                <Link href="/reset-password" className="text-primary hover:underline">
                  Forgot your password?
                </Link>
              </div>
              <div className="text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline">
                  Create one
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}