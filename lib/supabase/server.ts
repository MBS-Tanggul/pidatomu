import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// PENTING: file ini hanya boleh di-import dari kode server-side
// (API routes / Server Actions), TIDAK PERNAH dari client component.
// Service role key bisa bypass RLS sepenuhnya.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
