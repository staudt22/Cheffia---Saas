const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const env = {
  get supabaseUrl() {
    if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. See .env.example.");
    return supabaseUrl;
  },
  get supabaseKey() {
    if (!supabaseKey) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. See .env.example.");
    return supabaseKey;
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
