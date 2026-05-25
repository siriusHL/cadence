'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';
import type { BrokerId, ImportedRow, ParseResult } from '@/lib/import';
import { BROKER_LABEL } from '@/lib/import';

type EditableRow = ImportedRow & { include: boolean };

const BROKERS: { id: BrokerId; label: string }[] = [
  { id: 'degiro',         label: BROKER_LABEL['degiro'] },
  { id: 'ibkr',           label: BROKER_LABEL['ibkr'] },
  { id: 'trade-republic', label: BROKER_LABEL['trade-republic'] },
];

interface Props {
  /** Called after a successful commit so a parent modal can close itself. */
  onDone?: () => void;
}

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
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setSkipped([]);
    setDetected(null);
    setBroker('');
    setFilename(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function readAndParse(file: File, overrideBroker?: BrokerId) {
    const text = await file.text();
    setFilename(file.name);
    start(async () => {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: text, broker: overrideBroker }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(j.error ?? 'Could not parse CSV.', 'error');
        return;
      }
      const data = j.data as ParseResult;
      setDetected(data.broker);
      setBroker(data.broker);
      setSkipped(data.skipped);
      setRows(data.rows.map((r) => ({ ...r, include: true })));
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void readAndParse(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void readAndParse(file);
  }

  function changeBroker(next: BrokerId) {
    setBroker(next);
    if (!fileRef.current?.files?.[0]) return;
    void readAndParse(fileRef.current.files[0], next);
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
              We auto-detect DEGIRO, Interactive Brokers, and Trade Republic exports.
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              style={{ display: 'none' }}
            />
          </div>

          {(detected || rows.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Broker:</span>
              <select
                value={broker || ''}
                onChange={(e) => changeBroker(e.target.value as BrokerId)}
                disabled={pending}
                style={{
                  padding: '6px 10px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--text)',
                }}
              >
                {BROKERS.map((b) => (
                  <option key={b.id} value={b.id}>{b.label}</option>
                ))}
              </select>
              {detected && broker === detected && (
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  auto-detected
                </span>
              )}
              <button type="button" onClick={reset} disabled={pending} style={btnGhost}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

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
