// Supabase server client for use in Server Components, Route Handlers, and Server Actions.
// Reads the session cookie from the Next request, stays in sync with the browser.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieBatch = Array<{ name: string; value: string; options?: CookieOptions }>;

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error('Supabase env not set');

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieBatch) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookies are read-only there.
          // This is expected; middleware refreshes them on each request.
        }
      },
    },
  });
}

// Convenience: return the authenticated user or throw with a typed reason.
// Use this at the top of any user-scoped route or action.
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    const err = new Error('unauthenticated');
    (err as Error & { code: string }).code = 'UNAUTHENTICATED';
    throw err;
  }
  return data.user;
}
