import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl) {
  throw new Error("Supabase URL is not set")
}

if (!supabaseSecretKey) {
  throw new Error("SUPABASE_SECRET_KEY is not set")
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)