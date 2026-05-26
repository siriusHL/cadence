// Public mobile pages — Landing · Login · Signup · Pricing · Upgrade
// No bottom-tabs (unauthenticated). Each page is full-screen.

const { useState: useStateU } = React;
const DU = window.Cadence;

function PublicShell({ density, children, dark = false }) {
  return (
    <div className="mob v2b" data-density={density} style={dark ? { background: '#0c0d0e', color: '#fff' } : {}}>
      {children}
    </div>
  );
}

// Wordmark used at the top of every public screen
function Wordmark({ dark = false }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      fontSize: 12, fontWeight: 600,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: dark ? '#fff' : 'var(--text)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--accent-soft)' }} />
      Cadence
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Landing
// ─────────────────────────────────────────────────────────────────────
function LandingPage({ density }) {
  return (
    <PublicShell density={density}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <Wordmark />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="#pricing" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Pricing</a>
          <a href="#login" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Log in</a>
        </div>
      </div>

      <div className="scroll">
        <div style={{ padding: '60px 24px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 18 }}>
            Built for dividend investors
          </div>
          <h1 style={{
            margin: 0, fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.04em',
            fontWeight: 600,
          }}>
            See your money <span style={{ color: 'var(--text-dim)', fontWeight: 300 }}>working</span>.
          </h1>
          <p style={{
            marginTop: 24, fontSize: 15, color: 'var(--text-muted)',
            lineHeight: 1.45, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto',
          }}>
            Track every dividend, forecast the next twelve months, see exactly
            how close you are to living off your portfolio.
          </p>
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <a href="Public.html#signup" style={{
              width: 240, height: 48,
              background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
              borderRadius: 999, fontSize: 14, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}>Start free</a>
            <a href="Public.html#pricing" style={{
              width: 240, height: 48,
              background: 'transparent', color: 'var(--text)',
              border: '1px solid var(--border-strong)',
              borderRadius: 999, fontSize: 14, fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
            }}>See pricing</a>
          </div>
          <div style={{ marginTop: 18, fontSize: 10, color: 'var(--text-dim)' }}>
            Free tier — no credit card. 10 holdings, 4 essential screens.
          </div>
        </div>

        {/* Feature highlight cards */}
        <div style={{ padding: '0 var(--pad) 24px' }}>
          {[
            { eyebrow: 'Calendar', title: 'See every dividend you\'re owed', body: 'Cadence knows ex-dates, payouts, and projected schedules. Nothing arrives unannounced.' },
            { eyebrow: 'Forecast', title: 'Twelve months ahead', body: 'Project monthly income, your peak month, and what compounding gets you in 5 / 10 years.' },
            { eyebrow: 'Tax', title: 'Withholding by jurisdiction', body: 'Know what you\'re losing to foreign WH, what your residence taxes, and what\'s reclaimable.' },
          ].map((f, i) => (
            <div key={i} className="pcard cdn-anim" style={{ '--i': i + 1, marginTop: i === 0 ? 0 : 12, marginLeft: 0, marginRight: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--accent-soft)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{f.eyebrow}</div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.45 }}>{f.body}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 24px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)' }}>
          <span>© 2026 Cadence</span>
          <span>Not financial advice.</span>
        </div>
      </div>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────
function LoginPage({ density }) {
  return (
    <PublicShell density={density}>
      <div style={{ padding: '40px 24px 0', textAlign: 'center' }}>
        <Wordmark />
      </div>
      <div className="scroll">
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em' }}>Welcome back</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Log in to your account</div>
        </div>

        <div style={{ padding: '0 24px' }}>
          <AuthField label="Email" placeholder="you@example.com" />
          <AuthField label="Password" placeholder="••••••••" type="password" />

          <a href="#" style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 8, textDecoration: 'none' }}>Forgot password?</a>

          <button style={{
            width: '100%', height: 48, marginTop: 22,
            background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
            border: 0, borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Sign in</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button style={{
            width: '100%', height: 48,
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border-strong)',
            borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>Continue with Google</button>

          <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            No account? <a href="Public.html#signup" style={{ color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>Sign up</a>
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Signup
// ─────────────────────────────────────────────────────────────────────
function SignupPage({ density }) {
  return (
    <PublicShell density={density}>
      <div style={{ padding: '40px 24px 0', textAlign: 'center' }}>
        <Wordmark />
      </div>
      <div className="scroll">
        <div style={{ padding: '40px 24px 24px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: '-0.025em' }}>Start free</h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>10 holdings, no credit card.</div>
        </div>

        <div style={{ padding: '0 24px' }}>
          <AuthField label="Email" placeholder="you@example.com" />
          <AuthField label="Password" placeholder="At least 8 characters" type="password" />

          <button style={{
            width: '100%', height: 48, marginTop: 22,
            background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
            border: 0, borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Create account</button>

          <div style={{ marginTop: 14, fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
            By creating an account you agree to our terms and privacy policy.
          </div>

          <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Already have an account? <a href="Public.html#login" style={{ color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>Log in</a>
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </PublicShell>
  );
}

function AuthField({ label, placeholder, type = 'text' }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>{label}</div>
      <input
        type={type} placeholder={placeholder}
        style={{
          width: '100%', height: 48, padding: '0 16px',
          background: 'var(--surface)', border: '1px solid var(--border-strong)',
          borderRadius: 14, fontSize: 14, fontFamily: 'inherit',
          outline: 'none', color: 'var(--text)',
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────────────
function PricingPage({ density }) {
  return (
    <PublicShell density={density}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <Wordmark />
        <a href="Public.html#login" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>Log in</a>
      </div>

      <div className="scroll">
        <div style={{ padding: '40px 24px 24px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 40, fontWeight: 600, letterSpacing: '-0.03em' }}>Pricing</h1>
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.45 }}>
            Start free. Upgrade when you want forecasts, tax reports, or unlimited holdings.
          </p>
        </div>

        <div style={{ padding: '0 var(--pad) 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DU.plans.map((p) => (
            <div key={p.key} style={{
              padding: 22,
              background: p.featured ? '#0c0d0e' : 'var(--surface)',
              color: p.featured ? '#fff' : 'var(--text)',
              border: p.featured ? 0 : '1px solid var(--border)',
              borderRadius: 18,
              position: 'relative',
            }}>
              {p.featured && (
                <span style={{
                  position: 'absolute', top: 14, right: 14,
                  fontSize: 9, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 999,
                  background: '#fff', color: '#1d1d1f',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>Most popular</span>
              )}
              <div style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 6 }}>{p.price}</div>
              <div style={{ fontSize: 12, color: p.featured ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)', marginTop: 6 }}>{p.blurb}</div>
              <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.bullets.map((b) => (
                  <li key={b} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.4 }}>
                    <span style={{ color: 'var(--accent-soft)', flexShrink: 0 }}>✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <button style={{
                width: '100%', height: 44, marginTop: 20,
                background: p.featured ? '#fff' : 'var(--btn-primary-bg)',
                color: p.featured ? '#1d1d1f' : 'var(--btn-primary-text)',
                border: 0, borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{p.cta}</button>
            </div>
          ))}
        </div>
        <div style={{ height: 30 }} />
      </div>
    </PublicShell>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Upgrade
// ─────────────────────────────────────────────────────────────────────
function UpgradePage({ density }) {
  return (
    <PublicShell density={density}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>← Back</div>
        <Wordmark />
        <div style={{ width: 30 }} />
      </div>

      <div className="scroll">
        <div style={{ padding: '32px 24px 16px', textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em' }}>Upgrade</h1>
          <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
            The <b style={{ color: 'var(--text)' }}>Dashboard</b> screen is part of a paid plan.
          </p>
        </div>

        <div style={{ padding: '0 var(--pad) 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DU.plans.filter((p) => p.key !== 'free').map((p) => (
            <button key={p.key} style={{
              width: '100%', padding: 20, textAlign: 'left',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</div>
                {p.key === 'elite' && (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'var(--text)', color: 'var(--surface)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>All in</span>
                )}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', marginTop: 4 }}>{p.price}</div>
              <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {p.bullets.slice(0, 3).map((b) => (
                  <li key={b} style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>· {b}</li>
                ))}
              </ul>
              <div style={{
                marginTop: 16, height: 42,
                background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
                borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600,
              }}>Upgrade to {p.name}</div>
            </button>
          ))}
        </div>

        <div style={{ padding: '0 24px 24px', fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
          Secure checkout by Stripe. Cancel anytime from your billing portal.
        </div>
      </div>
    </PublicShell>
  );
}

Object.assign(window, { LandingPage, LoginPage, SignupPage, PricingPage, UpgradePage });
