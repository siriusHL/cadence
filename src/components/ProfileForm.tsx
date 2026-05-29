'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './DialogProvider';

interface Props {
  initial: {
    displayName: string;
    baseCurrency: string;
    taxCountry: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    phone: string;
    sex: string;
    addressLine1: string;
    addressLine2: string;
    addressCity: string;
    addressPostalCode: string;
    addressCountry: string;
  };
  taxResidences: { code: string; name: string }[];
  countries: { code: string; name: string }[];
  // Support/admin staff land on this same page, but the KYC and investment
  // fields (birth date, sex, address, base currency, tax residence) only apply
  // to investing customers — hide them for staff. Their stored values are still
  // submitted unchanged, so nothing is wiped.
  isStaff?: boolean;
}

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK'];

const SEX_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

export function ProfileForm({ initial, taxResidences, countries, isStaff = false }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [baseCurrency, setBaseCurrency] = useState(initial.baseCurrency);
  const [taxCountry, setTaxCountry] = useState(initial.taxCountry);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [phone, setPhone] = useState(initial.phone);
  const [sex, setSex] = useState(initial.sex);
  const [addressLine1, setAddressLine1] = useState(initial.addressLine1);
  const [addressLine2, setAddressLine2] = useState(initial.addressLine2);
  const [addressCity, setAddressCity] = useState(initial.addressCity);
  const [addressPostalCode, setAddressPostalCode] = useState(initial.addressPostalCode);
  const [addressCountry, setAddressCountry] = useState(initial.addressCountry);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          display_name:        displayName || null,
          base_currency:       baseCurrency,
          tax_country:         taxCountry || null,
          first_name:          firstName || null,
          last_name:           lastName || null,
          birth_date:          birthDate || null,
          phone:               phone || null,
          sex:                 sex || null,
          address_line1:       addressLine1 || null,
          address_line2:       addressLine2 || null,
          address_city:        addressCity || null,
          address_postal_code: addressPostalCode || null,
          address_country:     addressCountry || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast(`Couldn't save: ${j.error ?? res.statusText}`, 'error');
        return;
      }
      toast('Profile updated.');
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 4 }}
    >
      <Row>
        <Field label="First name">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            style={inputStyle}
          />
        </Field>
        <Field label="Last name">
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            style={inputStyle}
          />
        </Field>
      </Row>

      <Field label="Display name"
        help="Optional — the casual name used in greetings across the app.">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Optional"
          style={inputStyle}
        />
      </Field>

      {!isStaff && (
        <Row>
          <Field label="Birth date">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              style={inputStyle}
            />
          </Field>
          <Field label="Sex">
            <select value={sex} onChange={(e) => setSex(e.target.value)} style={inputStyle}>
              <option value="">— not set —</option>
              {SEX_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </Row>
      )}

      <Field label="Phone number">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+33 6 12 34 56 78"
          autoComplete="tel"
          style={inputStyle}
        />
      </Field>

      {!isStaff && (
        <>
          <Divider label="Address" />

          <Field label="Address line 1">
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              autoComplete="address-line1"
              style={inputStyle}
            />
          </Field>

          <Field label="Address line 2">
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Optional"
              autoComplete="address-line2"
              style={inputStyle}
            />
          </Field>

          <Row>
            <Field label="City">
              <input
                type="text"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                autoComplete="address-level2"
                style={inputStyle}
              />
            </Field>
            <Field label="Postal code">
              <input
                type="text"
                value={addressPostalCode}
                onChange={(e) => setAddressPostalCode(e.target.value)}
                autoComplete="postal-code"
                style={inputStyle}
              />
            </Field>
          </Row>

          <Field label="Country">
            <select value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} style={inputStyle}>
              <option value="">— not set —</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Divider label="Preferences" />

          <Field label="Base currency"
            help="Used to format portfolio totals across the app.">
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              style={inputStyle}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Tax residence"
            help="Drives the residence-side tax model on the Tax screen — final dividend tax, foreign credit, annual allowances.">
            <select
              value={taxCountry}
              onChange={(e) => setTaxCountry(e.target.value)}
              style={inputStyle}
            >
              <option value="">— not set —</option>
              {taxResidences.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
        <button
          type="submit"
          disabled={pending}
          className="btn"
          style={{
            height: 36, padding: '0 18px',
            background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
            borderRadius: 999, fontSize: 14, fontWeight: 500,
            border: 0, cursor: 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      {children}
      {help && <span style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.45 }}>{help}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  height: 36,
  padding: '0 12px',
  fontSize: 14,
  border: '1px solid var(--border-strong)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
};
