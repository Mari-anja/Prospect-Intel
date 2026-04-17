// Next.js middleware refreshes the Supabase session cookie on every request,
// so protected pages always see an up-to-date user.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieBatch = Array<{ name: string; value: string; options?: CookieOptions }>;

const PUBLIC_PATHS = [
  '/',                // landing page
  '/login',
  '/auth',            // Supabase OAuth callback lives under /auth/callback
  '/favicon.ico',
];

function isPublic(path: string) {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If Supabase isn't configured yet, let everything through so devs can see the landing page.
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: CookieBatch) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && !isPublic(path)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Skip static assets and Next internals
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
