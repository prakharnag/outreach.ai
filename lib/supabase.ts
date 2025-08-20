import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton pattern to prevent multiple instances
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  // Always return the same instance to prevent multiple GoTrueClient warnings
  if (typeof window !== 'undefined') {
    // Client-side: use browser client
    if (!browserClientInstance) {
      browserClientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return browserClientInstance;
  } else {
    // Server-side: create a new instance each time (SSR/API routes)
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
}

// Single shared instance for the entire app
export const supabase = createClient()

export const signInWithGoogle = async () => {
  // Force localhost for development
  const isDevelopment = process.env.NODE_ENV === 'development'
  const redirectUrl = isDevelopment 
    ? 'http://localhost:3000/dashboard' 
    : `${window.location.origin}/dashboard`
    
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  })
  return { data, error }
}

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}