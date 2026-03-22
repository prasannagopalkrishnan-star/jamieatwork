import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If caller specified a destination, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Otherwise, check onboarding status to decide where to go
      const { data: { user } } = await supabase.auth.getUser()
      const onboardingCompleted = user?.user_metadata?.onboarding_completed === true
      return NextResponse.redirect(`${origin}${onboardingCompleted ? '/dashboard' : '/onboarding'}`)
    }
  }

  return NextResponse.redirect(`${origin}/register?message=Something went wrong. Please try again.`)
}
