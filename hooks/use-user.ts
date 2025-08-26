'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  created_at: string
  onboarded: boolean
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          // Fetch user profile from database
          const { data: profile, error: profileError } = await supabase
            .from('User')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            // PGRST116 is "not found" - this is okay for new users
            setError(profileError.message)
          } else if (profile) {
            setProfile(profile)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        // Fetch updated profile when user logs in
        const { data: profile, error: profileError } = await supabase
          .from('User')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (!profileError || profileError.code === 'PGRST116') {
          setProfile(profile)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const signOut = async () => {
    setError(null)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setError(error.message)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      setError('No user logged in')
      return false
    }

    try {
      setError(null)
      const { error } = await supabase
        .from('User')
        .update(updates)
        .eq('id', user.id)

      if (error) {
        setError(error.message)
        return false
      }

      // Update local profile state
      setProfile(current => current ? { ...current, ...updates } : null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    signOut,
    updateProfile,
    isAuthenticated: !!user,
  }
}