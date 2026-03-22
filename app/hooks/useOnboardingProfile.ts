'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface OnboardingProfile {
  product_name?: string
  product_description?: string
  problem_solved?: string
  key_differentiators?: string
  target_industries?: string[]
  company_sizes?: string[]
  target_titles?: string[]
  geographies?: string[]
  voice_style?: string
  website?: string
}

// Module-level cache so the profile is fetched once across all components
let cachedProfile: OnboardingProfile | null = null
let cacheUserId: string | null = null

export function useOnboardingProfile() {
  const [profile, setProfile] = useState<OnboardingProfile | null>(cachedProfile)
  const [loading, setLoading] = useState(cachedProfile === null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        // Return cache if same user
        if (cachedProfile && cacheUserId === user.id) {
          setProfile(cachedProfile)
          setLoading(false)
          return
        }

        const od = user.user_metadata?.onboarding_data as OnboardingProfile | undefined
        if (od) {
          cachedProfile = od
          cacheUserId = user.id
          setProfile(od)
        }
      } catch {
        // No profile available
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { profile, loading }
}
