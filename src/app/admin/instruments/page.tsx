import { listInstruments } from '@/lib/adminData';
import { RefreshInstrumentsButton } from '@/components/admin/RefreshInstrumentsButton';

export const dynamic = 'force-dynamic';

function ago(iso: string | null): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function AdminInstrumentsPage() {
  const rows = await listInstruments(200);

  return (
    <>
      <h1 className="adm-h1">Instruments</h1>
      <p className="adm-sub">Shared market-data cache · {rows.length} shown (stalest first)</p>

      <div className="adm-card">
        <h2>Manual refresh</h2>
        <p className="adm-muted" style={{ marginBottom: 12 }}>
          Re-enriches the stalest instruments through the shared market-data path. Subject to the
          FMP daily quota.
        </p>
        <RefreshInstrumentsButton />
      </div>

      <div className="adm-card">
        {rows.length === 0 ? (
          <div className="adm-empty">No instruments cached yet.</div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Ticker</th><th>Name</th><th>Exchange</th><th>Currency</th>
                <th>Price</th><th>Quote age</th><th>Enriched age</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ticker}>
                  <td><span className="mono">{r.ticker}</span></td>
                  <td>{r.name ?? '—'}</td>
                  <td>{r.exchange ?? '—'}</td>
                  <td>{r.currency ?? '—'}</td>
                  <td><span className="mono">{r.price != null ? r.price.toLocaleString('en-IE') : '—'}</span></td>
                  <td>{ago(r.quoteAsOf)}</td>
                  <td>{ago(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
