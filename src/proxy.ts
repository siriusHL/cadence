import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccessScreen, type Screen, type Tier } from '@/lib/tiers';

// Tier-gated screen routes live under /app/<screen>.
// Auth is required for /app/*. Tier-locked screens redirect to /upgrade.

const PUBLIC_PATHS = ['/', '/pricing', '/login', '/signup'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Gate /app/<screen> by tier
  const m = pathname.match(/^\/app\/([^/]+)/);
  if (m) {
    const screen = m[1] as Screen;
    const { data } = await supabase.from('subscriptions').select('tier').eq('user_id', user.id).single();
    const tier = (data?.tier ?? 'free') as Tier;
    if (!canAccessScreen(tier, screen)) {
      const url = req.nextUrl.clone();
      url.pathname = '/upgrade';
      url.searchParams.set('from', screen);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
