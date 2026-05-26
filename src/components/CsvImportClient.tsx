'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import type { BrokerId, GenericMapping, ImportedRow, KindMapping, ParseResult } from '@/lib/import';
import { BROKER_LABEL } from '@/lib/import';

type EditableRow = ImportedRow & { include: boolean };

const BROKERS: { id: BrokerId; label: string }[] = (
  ['degiro', 'ibkr', 'trade-republic', 'trading-212', 'scalable', 'etoro', 'xtb', 'saxo', 'other'] as BrokerId[]
).map((id) => ({ id, label: BROKER_LABEL[id] }));

interface Props {
  /** Called after a successful commit so a parent modal can close itself. */
  onDone?: () => void;
}

interface MappingDraft {
  date: string;
  ticker: string;
  isin: string;
  kindMode: 'column' | 'fixed';
  kindColumn: string;
  kindFixed: 'buy' | 'sell' | 'dividend';
  quantity: string;
  price: string;
  currency: string;
  fee: string;
}

const EMPTY_MAPPING: MappingDraft = {
  date: '', ticker: '', isin: '',
  kindMode: 'fixed', kindColumn: '', kindFixed: 'buy',
  quantity: '', price: '', currency: '', fee: '',
};

export function CsvImportClient({ onDone }: Props = {}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [dragOver, setDragOver] = useState(false);
  const [broker, setBroker] = useState<BrokerId | ''>('');
  const [detected, setDetected] = useState<BrokerId | null>(null);
  const [skipped, setSkipped] = useState<ParseResult['skipped']>([]);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [filename, setFilename] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<MappingDraft>(EMPTY_MAPPING);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setSkipped([]);
    setDetected(null);
    setBroker('');
    setFilename(null);
    setCsvText('');
    setHeaders([]);
    setMapping(EMPTY_MAPPING);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function loadFile(file: File) {
    const text = await file.text();
    setCsvText(text);
    setFilename(file.name);
    setRows([]);
    setSkipped([]);
    setMapping(EMPTY_MAPPING);
    return text;
  }

  async function runAutoDetect(text: string) {
    start(async () => {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: text }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Detection failed — switch to manual mode and load headers.
        setBroker('other');
        void loadHeaders(text);
        toast(j.error ?? 'Auto-detect failed — pick columns manually.', 'error');
        return;
      }
      const data = j.data as ParseResult;
      setDetected(data.broker);
      setBroker(data.broker);
      setSkipped(data.skipped);
      setRows(data.rows.map((r) => ({ ...r, include: true })));
    });
  }

  async function loadHeaders(text: string) {
    const res = await fetch('/api/import/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv: text, headersOnly: true }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setHeaders(j.data.headers as string[]);
  }

  async function rerunWithBroker(next: BrokerId, text: string) {
    if (next === 'other') {
      await loadHeaders(text);
      setRows([]);
      setSkipped([]);
      return;
    }
    start(async () => {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: text, broker: next }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(j.error ?? 'Could not parse with that broker.', 'error');
        return;
      }
      const data = j.data as ParseResult;
      setSkipped(data.skipped);
      setRows(data.rows.map((r) => ({ ...r, include: true })));
    });
  }

  async function applyMapping() {
    if (!mapping.date || !mapping.quantity || !mapping.price) {
      toast('Date, Quantity, and Price are required.', 'error');
      return;
    }
    if (mapping.kindMode === 'column' && !mapping.kindColumn) {
      toast('Pick the kind column or switch to fixed kind.', 'error');
      return;
    }
    const kind: KindMapping = mapping.kindMode === 'fixed'
      ? { type: 'fixed', value: mapping.kindFixed }
      : { type: 'column', header: mapping.kindColumn };

    const payload: GenericMapping = {
      date:     mapping.date,
      kind,
      quantity: mapping.quantity,
      price:    mapping.price,
      ticker:   mapping.ticker || undefined,
      isin:     mapping.isin   || undefined,
      currency: mapping.currency || undefined,
      fee:      mapping.fee || undefined,
    };

    start(async () => {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: csvText, broker: 'other', mapping: payload }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(j.error ?? 'Could not parse with that mapping.', 'error');
        return;
      }
      const data = j.data as ParseResult;
      setSkipped(data.skipped);
      setRows(data.rows.map((r) => ({ ...r, include: true })));
    });
  }

  function handleUploaded(text: string) {
    // If the user pre-picked a broker, honor it. Otherwise auto-detect.
    if (broker) {
      void rerunWithBroker(broker, text);
    } else {
      void runAutoDetect(text);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void loadFile(file).then(handleUploaded);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file).then(handleUploaded);
  }

  function changeBroker(next: BrokerId) {
    setBroker(next);
    if (!csvText) return;
    void rerunWithBroker(next, csvText);
  }

  function updateRow(uid: string, patch: Partial<EditableRow>) {
    setRows((cur) => cur.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  function commit() {
    const payload = rows
      .filter((r) => r.include && r.ticker.trim().length > 0)
      .map((r) => ({
        kind:       r.kind,
        occurredOn: r.occurredOn,
        ticker:     r.ticker.trim().toUpperCase(),
        quantity:   r.quantity,
        priceLocal: r.priceLocal,
        feeLocal:   r.feeLocal,
        currency:   r.currency,
        fxToBase:   r.fxToBase,
      }));

    if (payload.length === 0) {
      toast('Nothing to import — every row needs a ticker.', 'error');
      return;
    }

    start(async () => {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows: payload }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = j.reason === 'holding_cap_reached'
          ? 'You hit your plan’s holding cap. Upgrade to import more.'
          : j.error ?? 'Import failed.';
        toast(msg, 'error');
        return;
      }
      const dup = j.duplicates > 0 ? ` (${j.duplicates} duplicate${j.duplicates === 1 ? '' : 's'} skipped)` : '';
      toast(`Imported ${j.inserted} transaction${j.inserted === 1 ? '' : 's'}${dup}.`);
      reset();
      router.refresh();
      onDone?.();
    });
  }

  const includedCount = rows.filter((r) => r.include && r.ticker.trim().length > 0).length;
  const showMapping = broker === 'other' && headers.length > 0 && rows.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="pcard">
        <div className="pcard-h">
          <div className="t">Upload CSV</div>
          {filename && <span className="tag">{filename}</span>}
        </div>
        <div style={{ padding: 16 }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
              background: dragOver ? 'var(--surface-2)' : 'var(--surface)',
              borderRadius: 12,
              padding: 32,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'border-color 120ms, background 120ms',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
              Drop your CSV here or click to choose
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Auto-detects DEGIRO, Interactive Brokers, Trade Republic, Trading 212, Scalable Capital,
              eToro, XTB, and Saxo Bank. Other brokers — pick &quot;Other&quot; and map columns yourself.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Broker:</span>
            <select
              value={broker || ''}
              onChange={(e) => changeBroker(e.target.value as BrokerId)}
              disabled={pending}
              style={brokerSelect}
            >
              <option value="">Auto-detect from CSV</option>
              {BROKERS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            {detected && broker === detected && (
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>auto-detected</span>
            )}
            {(filename || rows.length > 0) && (
              <button type="button" onClick={reset} disabled={pending} style={btnGhost}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {showMapping && (
        <MappingPanel
          headers={headers}
          mapping={mapping}
          onChange={setMapping}
          onApply={applyMapping}
          pending={pending}
        />
      )}

      {rows.length > 0 && (
        <div className="pcard flush">
          <div className="pcard-h">
            <div>
              <div className="t">Preview</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {rows.length} row{rows.length === 1 ? '' : 's'} parsed
                {skipped.length > 0 && ` · ${skipped.length} skipped`}
              </div>
            </div>
            <button
              type="button"
              onClick={commit}
              disabled={pending || includedCount === 0}
              style={includedCount === 0 ? btnDisabled : btnPrimary}
            >
              {pending ? 'Importing…' : `Import ${includedCount} row${includedCount === 1 ? '' : 's'}`}
            </button>
          </div>
          <div style={{ overflow: 'auto', maxHeight: 480 }}>
            <table className="pt">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th style={{ width: 80 }}>Date</th>
                  <th style={{ width: 70 }}>Kind</th>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th className="r">Qty</th>
                  <th className="r">Price</th>
                  <th className="r">Fee</th>
                  <th style={{ width: 56 }}>Cur</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.uid} style={r.include ? undefined : { opacity: 0.45 }}>
                    <td className="c">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => updateRow(r.uid, { include: e.target.checked })}
                      />
                    </td>
                    <td>{r.occurredOn}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.kind}</td>
                    <td>
                      <input
                        type="text"
                        value={r.ticker}
                        onChange={(e) => updateRow(r.uid, { ticker: e.target.value.toUpperCase() })}
                        placeholder={r.isin ? r.isin : 'TICK'}
                        style={tickerInput(!!r.warning && !r.ticker)}
                      />
                    </td>
                    <td className="muted" title={r.name ?? ''}>{truncate(r.name, 40)}</td>
                    <td className="r num">{r.quantity.toLocaleString('en-IE', { maximumFractionDigits: 4 })}</td>
                    <td className="r num">{r.priceLocal.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                    <td className="r num">{r.feeLocal > 0 ? r.feeLocal.toFixed(2) : '—'}</td>
                    <td>{r.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {skipped.length > 0 && (
            <div style={{
              padding: '10px 16px',
              fontSize: 12,
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border)',
            }}>
              <b>{skipped.length}</b> line{skipped.length === 1 ? '' : 's'} skipped:{' '}
              {skipped.slice(0, 4).map((s) => `line ${s.lineNumber} (${s.reason})`).join('; ')}
              {skipped.length > 4 && ` …and ${skipped.length - 4} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mapping panel (Other broker) ──────────────────────────────────────

interface MappingProps {
  headers: string[];
  mapping: MappingDraft;
  onChange: (next: MappingDraft) => void;
  onApply: () => void;
  pending: boolean;
}

function MappingPanel({ headers, mapping, onChange, onApply, pending }: MappingProps) {
  function set<K extends keyof MappingDraft>(k: K, v: MappingDraft[K]) {
    onChange({ ...mapping, [k]: v });
  }

  return (
    <div className="pcard">
      <div className="pcard-h">
        <div>
          <div className="t">Map columns</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Tell Cadence which column in your CSV holds each field. Required: Date, Quantity, Price.
          </div>
        </div>
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Mapper label="Date *"     value={mapping.date}     onChange={(v) => set('date', v)}     options={headers} />
        <Mapper label="Quantity *" value={mapping.quantity} onChange={(v) => set('quantity', v)} options={headers} />
        <Mapper label="Price *"    value={mapping.price}    onChange={(v) => set('price', v)}    options={headers} />
        <Mapper label="Ticker"     value={mapping.ticker}   onChange={(v) => set('ticker', v)}   options={headers} />
        <Mapper label="ISIN"       value={mapping.isin}     onChange={(v) => set('isin', v)}     options={headers} />
        <Mapper label="Currency"   value={mapping.currency} onChange={(v) => set('currency', v)} options={headers} />
        <Mapper label="Fee"        value={mapping.fee}      onChange={(v) => set('fee', v)}      options={headers} />

        <div>
          <Label>Kind</Label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <select
              value={mapping.kindMode}
              onChange={(e) => set('kindMode', e.target.value as 'fixed' | 'column')}
              style={brokerSelect}
            >
              <option value="fixed">All rows are…</option>
              <option value="column">Read from column…</option>
            </select>
            {mapping.kindMode === 'fixed' ? (
              <select
                value={mapping.kindFixed}
                onChange={(e) => set('kindFixed', e.target.value as 'buy' | 'sell' | 'dividend')}
                style={brokerSelect}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
                <option value="dividend">Dividend</option>
              </select>
            ) : (
              <select
                value={mapping.kindColumn}
                onChange={(e) => set('kindColumn', e.target.value)}
                style={brokerSelect}
              >
                <option value="">— pick column —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={onApply} disabled={pending} style={btnPrimary}>
          {pending ? 'Parsing…' : 'Parse with this mapping'}
        </button>
      </div>
    </div>
  );
}

function Mapper({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...brokerSelect, marginTop: 4, width: '100%' }}
      >
        <option value="">— none —</option>
        {options.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
    }}>
      {children}
    </div>
  );
}

// ─── Helpers + styles ──────────────────────────────────────────────────

function truncate(s: string | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function tickerInput(highlight: boolean): React.CSSProperties {
  return {
    width: 96,
    padding: '4px 8px',
    background: 'var(--input-bg)',
    border: `1px solid ${highlight ? 'var(--danger)' : 'var(--border-strong)'}`,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text)',
    textTransform: 'uppercase',
  };
}

const brokerSelect: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--input-bg)',
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--text)',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  background: 'var(--btn-primary-bg)',
  color: 'var(--btn-primary-text)',
  border: '1px solid var(--btn-primary-bg)',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
};

const btnDisabled: React.CSSProperties = {
  ...btnPrimary,
  background: 'var(--border-strong)',
  borderColor: 'var(--border-strong)',
  color: 'var(--text-muted)',
  cursor: 'not-allowed',
};
