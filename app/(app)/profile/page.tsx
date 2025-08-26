'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUser } from '@/hooks/use-user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteAccountDialog } from '@/components/auth/DeleteAccountDialog'
import { useRouter } from 'next/navigation'

const profileSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Display name is required').max(50, 'Display name must be less than 50 characters'),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional()
}).refine((data) => {
  if (data.newPassword || data.confirmPassword) {
    return data.newPassword === data.confirmPassword && 
           data.newPassword && 
           data.newPassword.length >= 8 &&
           /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.newPassword)
  }
  return true
}, {
  message: "New password must be at least 8 characters with uppercase, lowercase, and number, and passwords must match",
  path: ['confirmPassword']
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { user, profile, loading: userLoading } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const watchNewPassword = watch('newPassword')

  useEffect(() => {
    if (profile) {
      reset({
        email: profile.email || '',
        name: profile.name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }, [profile, reset])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, userLoading, router])

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const updateData: Record<string, unknown> = {
        email: data.email,
        name: data.name
      }

      if (data.newPassword) {
        updateData.password = data.newPassword
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'An error occurred')
      } else {
        setSuccess(result.message || 'Profile updated successfully')
        // Clear password fields
        reset({
          email: data.email,
          name: data.name,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-2">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Manage your account information and security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
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
                <p className="text-sm text-muted-foreground">
                  Changing your email will require verification of the new address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your display name"
                  {...register('name')}
                  aria-invalid={errors.name ? 'true' : 'false'}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
            </div>

            {/* Password Change */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium">Change Password</h3>
              <p className="text-sm text-muted-foreground">
                Leave password fields empty to keep your current password
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (optional)"
                  {...register('newPassword')}
                  aria-invalid={errors.newPassword ? 'true' : 'false'}
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                )}
              </div>

              {watchNewPassword && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    {...register('confirmPassword')}
                    aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Feedback Messages */}
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                {success}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/app')}
              >
                Back to Dashboard
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>

          {/* Danger Zone */}
          <div className="mt-8 pt-8 border-t border-destructive/20">
            <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <div className="mt-4">
              <DeleteAccountDialog>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </DeleteAccountDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}