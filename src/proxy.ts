import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccessScreen, type Screen } from '@/lib/tiers';
import { effectiveTier } from '@/lib/effectiveTier';
import { isAdminEmail } from '@/lib/admin';

const PUBLIC_PATHS = ['/', '/pricing', '/login', '/signup', '/maintenance'];
// Prefix-matched public areas (the path and everything under it). /insights is
// the public SEO content section — readable by anyone, no auth or tier gating.
const PUBLIC_PREFIXES = ['/insights', '/sitemap.xml', '/robots.txt'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => { for (const { name, value, options } of toSet) res.cookies.set(name, value, options); },
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

  const admin = isAdminEmail(user.email);

  if (pathname.startsWith('/admin')) {
    if (!admin) { const url = req.nextUrl.clone(); url.pathname = '/app'; return NextResponse.redirect(url); }
    return res;
  }

  // Admins are an operations role, not customers — they have no access to the
  // customer app. Send any /app/* hit to the dashboard instead.
  if (admin && pathname.startsWith('/app')) {
    const url = req.nextUrl.clone(); url.pathname = '/admin'; return NextResponse.redirect(url);
  }

  if (pathname.startsWith('/app')) {
    const { data: site } = await supabase.from('site_settings').select('maintenance_mode').eq('id', 1).maybeSingle();
    if (site?.maintenance_mode && !admin) {
      const url = req.nextUrl.clone(); url.pathname = '/maintenance'; return NextResponse.redirect(url);
    }
    const m = pathname.match(/^\/app\/([^/]+)/);
    if (m) {
      const screen = m[1] as Screen;
      const { data } = await supabase.from('subscriptions').select('tier, admin_tier_override').eq('user_id', user.id).single();
      const tier = effectiveTier(data);
      if (!canAccessScreen(tier, screen)) {
        const url = req.nextUrl.clone(); url.pathname = '/upgrade'; url.searchParams.set('from', screen);
        return NextResponse.redirect(url);
      }
    }
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
