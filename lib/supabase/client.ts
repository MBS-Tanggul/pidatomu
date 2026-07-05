import { createBrowserClient } from "@supabase/ssr";

// Dipakai di client components (form generate, halaman histori, dll)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
