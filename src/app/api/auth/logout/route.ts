import { getSupabaseServer } from '@/lib/supabase/server';

// Sign out the current user. Called as a regular form POST from the
// user menu so the cookies cleared by supabase.auth.signOut() land on
// the response before the redirect-Location is followed.
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  const origin = new URL(req.url).origin;
  return Response.redirect(`${origin}/`, 303);
}
