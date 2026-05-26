// Add holding · Edit stock — modal-style screens with back chevron.

const { useState: useStateX } = React;
const DX = window.Cadence;
const fmtX = (n, d = 0) => window.fmt(n, d);

// ─────────────────────────────────────────────────────────────────────
// Add holding
// ─────────────────────────────────────────────────────────────────────
function AddHoldingPage({ density, navPattern }) {
  const [ticker, setTicker] = useStateX('VICI');
  const [qty, setQty] = useStateX('100');
  const [price, setPrice] = useStateX('28.40');
  const [date, setDate] = useStateX('2026-05-26');
  const [fee, setFee] = useStateX('1.20');
  const [currency, setCurrency] = useStateX('USD');

  const cost = Number(qty || 0) * Number(price || 0) + Number(fee || 0);

  return (
    <div className="mob v2b" data-density={density}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 6px', flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer' }}>← Cancel</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Add a holding</div>
        <div style={{ fontSize: 12, color: 'var(--accent-soft)', fontWeight: 600, cursor: 'pointer' }}>Save</div>
      </div>

      <div className="scroll">
        <div style={{ padding: '20px var(--pad) 12px', textAlign: 'center' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>What did you buy?</div>
          <div style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: DX.contributors.find((c) => c.ticker === ticker)?.color ?? 'var(--surface-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 700, color: 'rgba(0,0,0,0.85)',
            }}>{ticker.slice(0, 1)}</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em' }}>{ticker}</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: -8 }}>{DX.contributors.find((c) => c.ticker === ticker)?.name ?? 'Search a ticker'}</div>
          </div>
        </div>

        <div className="pcard cdn-anim" style={{ '--i': 1 }}>
          <div className="pcard-h"><div className="t">Lot details</div></div>
          <FormInput label="Ticker" value={ticker} onChange={setTicker} placeholder="e.g. VICI" />
          <FormInput label="Shares" value={qty} onChange={setQty} type="number" />
          <FormInput label="Price / share" value={price} onChange={setPrice} type="number" prefix="$" />
          <FormInput label="Date" value={date} onChange={setDate} type="date" />
          <FormInput label="Fee" value={fee} onChange={setFee} type="number" prefix="$" />
          <FormSelect label="Currency" value={currency} onChange={setCurrency} options={['USD', 'EUR', 'GBP', 'CAD', 'CHF']} />
        </div>

        <div className="stat-paired cdn-anim" style={{ '--i': 2 }}>
          <div className="pcard-mini">
            <div className="ph">Summary</div>
            <div className="paired-vals">
              <span className="num a">{qty || 0} sh</span>
              <span className="sep">·</span>
              <span className="num b">${cost.toFixed(2)}</span>
            </div>
            <div className="paired-bar">
              <div className="a" style={{ width: '50%' }} />
              <div className="b" style={{ width: '50%' }} />
            </div>
            <div className="paired-foot">
              <span>Shares</span>
              <span>Total cost</span>
            </div>
          </div>
          <div className="pcard-mini">
            <div className="ph">Expected income</div>
            <div className="stacked-rows">
              <div className="srow"><span className="name">Fwd yield</span><span className="val">5.40%</span></div>
              <div className="srow"><span className="name">Per year</span><span className="val">${(Number(qty || 0) * 1.78).toFixed(0)}</span></div>
              <div className="srow"><span className="name">Per month</span><span className="val">${((Number(qty || 0) * 1.78) / 12).toFixed(0)}</span></div>
            </div>
          </div>
        </div>

        <div style={{ padding: 'var(--pad)', marginTop: 8 }}>
          <button style={{
            width: '100%', height: 48,
            background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
            border: 0, borderRadius: 999, fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}>Add to portfolio</button>
          <button style={{
            width: '100%', height: 38, marginTop: 8,
            background: 'transparent', color: 'var(--text-muted)',
            border: 0, fontSize: 12, cursor: 'pointer',
          }}>Or import from CSV →</button>
        </div>
        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Edit stock — manage lots
// ─────────────────────────────────────────────────────────────────────
function EditStockPage({ density, navPattern }) {
  const ticker = 'VICI';
  const name = 'VICI Properties Inc';
  const color = DX.contributors.find((c) => c.ticker === ticker)?.color ?? '#c084fc';
  const lots = DX.editLots;

  const totalShares = lots.reduce((s, l) => s + (l.kind === 'buy' ? l.qty : -l.qty), 0);
  const totalCost = lots.reduce((s, l) => l.kind === 'buy' ? s + l.qty * l.price + l.fee : s, 0);
  const avgCost = totalShares > 0 ? totalCost / totalShares : 0;
  const currentPrice = 32.85;
  const currentValue = totalShares * currentPrice;
  const pl = currentValue - totalCost;
  const plPct = (pl / totalCost) * 100;

  return (
    <div className="mob v2b" data-density={density}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 6px', flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>← Stocks</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{ticker}</div>
        <div style={{ fontSize: 12, color: 'var(--accent-soft)', fontWeight: 600 }}>Done</div>
      </div>

      <div className="scroll">
        {/* Header card */}
        <div style={{
          margin: '8px var(--pad) 0',
          padding: 16,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>{ticker.slice(0, 1)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{ticker}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{totalShares}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>shares</div>
          </div>
        </div>

        <div className="stat-paired cdn-anim" style={{ '--i': 1 }}>
          <div className="pcard-mini">
            <div className="ph">Cost vs value</div>
            <div className="paired-vals">
              <span className="num a">${fmtX(totalCost)}</span>
              <span className="sep">:</span>
              <span className="num b">${fmtX(Math.round(currentValue))}</span>
            </div>
            <div className="paired-bar">
              <div className="a" style={{ width: `${(totalCost / currentValue) * 100}%` }} />
              <div className="b" style={{ width: `${100 - (totalCost / currentValue) * 100}%` }} />
            </div>
            <div className="paired-foot">
              <span>Cost</span>
              <span>Value</span>
            </div>
          </div>
          <div className="pcard-mini">
            <div className="ph">Position</div>
            <div className="stacked-rows">
              <div className="srow"><span className="name">Avg cost</span><span className="val">${avgCost.toFixed(2)}</span></div>
              <div className="srow"><span className="name">Now</span><span className="val">${currentPrice.toFixed(2)}</span></div>
              <div className="srow"><span className="name">P / L</span><span className="val" style={{ color: pl >= 0 ? 'var(--up-fg)' : 'var(--down)' }}>{pl >= 0 ? '+' : ''}{plPct.toFixed(2)}%</span></div>
            </div>
          </div>
        </div>

        {/* Lots */}
        <div className="pcard cdn-anim" style={{ '--i': 2 }}>
          <div className="pcard-h">
            <div className="t">Lots</div>
            <span className="more">+ Add lot</span>
          </div>
          <div>
            {lots.map((l) => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, padding: '2px 7px',
                  background: l.kind === 'buy' ? 'var(--up-bg)' : 'oklch(0.96 0.04 25)',
                  color: l.kind === 'buy' ? 'var(--up-fg)' : 'var(--down)',
                  borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.04em',
                  flexShrink: 0,
                }}>{l.kind}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{l.qty} sh · ${l.price.toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{l.date} · fee ${l.fee.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>${l.cost.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>cost</div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
                  <button style={{ width: 26, height: 26, borderRadius: 8, background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✎</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="pcard cdn-anim" style={{ '--i': 3, background: 'oklch(0.98 0.01 25)', borderColor: 'oklch(0.88 0.06 25)' }}>
          <div className="pcard-h">
            <div className="t" style={{ color: 'var(--down)' }}>Remove this holding</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 10 }}>
            Deletes {ticker} and all its transactions. Can't be undone.
          </div>
          <button style={{
            height: 36, padding: '0 16px',
            background: 'var(--surface)', border: '1px solid var(--down)', color: 'var(--down)',
            borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>Delete {ticker}</button>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = 'text', prefix }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, width: 110, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        {prefix && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{prefix}</span>}
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            border: 0, outline: 0, background: 'transparent',
            fontSize: 14, fontWeight: 500, textAlign: 'right',
            fontFamily: 'inherit', color: 'var(--text)',
            width: 140,
          }}
        />
      </div>
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '10px 0',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        border: 0, outline: 0, background: 'transparent',
        fontSize: 14, fontWeight: 500, color: 'var(--text)',
        fontFamily: 'inherit',
      }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

Object.assign(window, { AddHoldingPage, EditStockPage });
