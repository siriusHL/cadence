// Admin read layer. Server-only — every query runs via the service-role client
// (bypasses RLS) and must only ever be reached through withAdmin / the proxy
// admin gate. Shapes are flattened/camelCased for the admin UI.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { effectiveTier } from '@/lib/effectiveTier';
import { type Tier } from '@/lib/tiers';

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

// ─── Overview ──────────────────────────────────────────────────────────

export interface OverviewStats {
  totalUsers: number;
  signups7d: number;
  signups30d: number;
  totalPortfolios: number;
  totalHoldings: number;
  tierCounts: Record<Tier, number>;
  overrides: number;
  paying: number;
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const admin = supabaseAdmin();

  const [
    { count: totalUsers },
    { count: signups7d },
    { count: signups30d },
    { count: totalPortfolios },
    { count: totalHoldings },
    { data: subs },
  ] = await Promise.all([
    admin.from('profiles').select('id', { head: true, count: 'exact' }),
    admin.from('profiles').select('id', { head: true, count: 'exact' }).gte('created_at', isoDaysAgo(7)),
    admin.from('profiles').select('id', { head: true, count: 'exact' }).gte('created_at', isoDaysAgo(30)),
    admin.from('portfolios').select('id', { head: true, count: 'exact' }),
    admin.from('holdings').select('id', { head: true, count: 'exact' }),
    admin.from('subscriptions').select('tier, admin_tier_override'),
  ]);

  const tierCounts: Record<Tier, number> = { free: 0, premium: 0, elite: 0 };
  let overrides = 0;
  for (const s of (subs ?? []) as TierSourceRow[]) {
    tierCounts[effectiveTier(s)] += 1;
    if (s.admin_tier_override != null) overrides += 1;
  }

  return {
    totalUsers: totalUsers ?? 0,
    signups7d: signups7d ?? 0,
    signups30d: signups30d ?? 0,
    totalPortfolios: totalPortfolios ?? 0,
    totalHoldings: totalHoldings ?? 0,
    tierCounts,
    overrides,
    paying: tierCounts.premium + tierCounts.elite,
  };
}

// ─── Users ───────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  tier: Tier;
  baseTier: Tier;
  override: Tier | null;
  status: string | null;
  portfolios: number;
  holdings: number;
}

export interface AdminUserDetail extends AdminUserRow {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  displayName: string | null;
  baseCurrency: string | null;
  portfolioList: { id: string; name: string; holdings: number }[];
}

export async function listUsers(
  { page = 1, perPage = 25, search }: { page?: number; perPage?: number; search?: string } = {},
): Promise<{ users: AdminUserRow[]; total: number; page: number; perPage: number }> {
  const admin = supabaseAdmin();

  let pageUsers: AuthUser[];
  let total: number;

  if (search) {
    // Auth admin has no email filter — pull a wide page and filter in memory.
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const needle = search.toLowerCase();
    const filtered = (data?.users ?? []).filter((u) => (u.email ?? '').toLowerCase().includes(needle));
    total = filtered.length;
    const from = (page - 1) * perPage;
    pageUsers = filtered.slice(from, from + perPage);
  } else {
    const { data } = await admin.auth.admin.listUsers({ page, perPage });
    pageUsers = data?.users ?? [];
    total = (data as { total?: number } | null)?.total ?? pageUsers.length;
  }

  const ids = pageUsers.map((u) => u.id);
  const [subMap, pfMap, hMap] = await Promise.all([
    subscriptionMap(ids),
    portfolioCountMap(ids),
    holdingCountMap(ids),
  ]);

  const users: AdminUserRow[] = pageUsers.map((u) => {
    const sub = subMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? '',
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      tier: effectiveTier(sub),
      baseTier: (sub?.tier ?? 'free') as Tier,
      override: (sub?.admin_tier_override ?? null) as Tier | null,
      status: sub?.status ?? null,
      portfolios: pfMap.get(u.id) ?? 0,
      holdings: hMap.get(u.id) ?? 0,
    };
  });

  return { users, total, page, perPage };
}

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  const admin = supabaseAdmin();

  const { data: got, error } = await admin.auth.admin.getUserById(id);
  if (error || !got?.user) return null;
  const u = got.user;

  const [{ data: sub }, { data: profile }, { data: pfs }] = await Promise.all([
    admin.from('subscriptions').select('*').eq('user_id', id).maybeSingle(),
    admin.from('profiles').select('display_name, base_currency').eq('id', id).maybeSingle(),
    admin.from('portfolios').select('id, name').eq('user_id', id),
  ]);

  const portfolioList = (pfs ?? []) as { id: string; name: string }[];
  const pfIds = portfolioList.map((p) => p.id);

  const holdingsByPf = new Map<string, number>();
  if (pfIds.length) {
    const { data: hs } = await admin.from('holdings').select('portfolio_id').in('portfolio_id', pfIds);
    for (const h of (hs ?? []) as { portfolio_id: string }[]) {
      holdingsByPf.set(h.portfolio_id, (holdingsByPf.get(h.portfolio_id) ?? 0) + 1);
    }
  }

  const list = portfolioList.map((p) => ({ id: p.id, name: p.name, holdings: holdingsByPf.get(p.id) ?? 0 }));
  const totalHoldings = list.reduce((sum, p) => sum + p.holdings, 0);

  return {
    id: u.id,
    email: u.email ?? '',
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    tier: effectiveTier(sub),
    baseTier: (sub?.tier ?? 'free') as Tier,
    override: (sub?.admin_tier_override ?? null) as Tier | null,
    status: sub?.status ?? null,
    portfolios: list.length,
    holdings: totalHoldings,
    stripeCustomerId: sub?.stripe_customer_id ?? null,
    stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? null,
    displayName: profile?.display_name ?? null,
    baseCurrency: profile?.base_currency ?? null,
    portfolioList: list,
  };
}

// ─── Audit log ─────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export async function listAuditLog(
  { page = 1, perPage = 50 }: { page?: number; perPage?: number } = {},
): Promise<{ entries: AuditEntry[]; total: number; page: number; perPage: number }> {
  const admin = supabaseAdmin();
  const from = (page - 1) * perPage;
  const { data, count } = await admin
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1);

  const entries: AuditEntry[] = ((data ?? []) as AuditRow[]).map((r) => ({
    id: r.id,
    actorEmail: r.actor_email,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    meta: r.meta,
    createdAt: r.created_at,
  }));

  return { entries, total: count ?? entries.length, page, perPage };
}

// ─── Instruments ─────────────────────────────────────────────────────────

export interface InstrumentRow {
  ticker: string;
  name: string | null;
  exchange: string | null;
  currency: string | null;
  updatedAt: string | null;
  price: number | null;
  quoteAsOf: string | null;
}

export async function listInstruments(limit = 200): Promise<InstrumentRow[]> {
  const admin = supabaseAdmin();
  const { data: insts } = await admin
    .from('instruments')
    .select('ticker, name, exchange, currency, updated_at')
    .order('updated_at', { ascending: true, nullsFirst: true })
    .limit(limit);

  const rows = (insts ?? []) as {
    ticker: string; name: string | null; exchange: string | null;
    currency: string | null; updated_at: string | null;
  }[];
  const tickers = rows.map((r) => r.ticker);

  const quoteByT = new Map<string, { price: number | null; as_of: string | null }>();
  if (tickers.length) {
    const { data: quotes } = await admin
      .from('instrument_quotes')
      .select('ticker, price, as_of')
      .in('ticker', tickers);
    for (const q of (quotes ?? []) as { ticker: string; price: number | null; as_of: string | null }[]) {
      quoteByT.set(q.ticker, { price: q.price, as_of: q.as_of });
    }
  }

  return rows.map((r) => {
    const q = quoteByT.get(r.ticker);
    return {
      ticker: r.ticker,
      name: r.name,
      exchange: r.exchange,
      currency: r.currency,
      updatedAt: r.updated_at,
      price: q?.price ?? null,
      quoteAsOf: q?.as_of ?? null,
    };
  });
}

// ─── Internals ─────────────────────────────────────────────────────────

interface TierSourceRow { tier?: Tier | null; admin_tier_override?: Tier | null; status?: string | null }
interface AuditRow {
  id: string; actor_email: string; action: string;
  target_type: string | null; target_id: string | null;
  meta: Record<string, unknown> | null; created_at: string;
}
interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
}

async function subscriptionMap(ids: string[]): Promise<Map<string, TierSourceRow>> {
  const map = new Map<string, TierSourceRow>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin()
    .from('subscriptions')
    .select('user_id, tier, admin_tier_override, status')
    .in('user_id', ids);
  for (const s of (data ?? []) as (TierSourceRow & { user_id: string })[]) {
    map.set(s.user_id, { tier: s.tier, admin_tier_override: s.admin_tier_override, status: s.status });
  }
  return map;
}

async function portfolioCountMap(ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin().from('portfolios').select('user_id').in('user_id', ids);
  for (const p of (data ?? []) as { user_id: string }[]) {
    map.set(p.user_id, (map.get(p.user_id) ?? 0) + 1);
  }
  return map;
}

async function holdingCountMap(ids: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!ids.length) return map;
  const admin = supabaseAdmin();
  // holdings have no user_id — ownership is via portfolios. Resolve
  // portfolio_id → owner, then tally holdings per owner.
  const { data: pfs } = await admin.from('portfolios').select('id, user_id').in('user_id', ids);
  const ownerByPf = new Map<string, string>();
  for (const p of (pfs ?? []) as { id: string; user_id: string }[]) ownerByPf.set(p.id, p.user_id);
  const pfIds = [...ownerByPf.keys()];
  if (!pfIds.length) return map;
  const { data: hs } = await admin.from('holdings').select('portfolio_id').in('portfolio_id', pfIds);
  for (const h of (hs ?? []) as { portfolio_id: string }[]) {
    const owner = ownerByPf.get(h.portfolio_id);
    if (owner) map.set(owner, (map.get(owner) ?? 0) + 1);
  }
  return map;
}
