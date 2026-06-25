import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout, {
  useDemo, BtnPrimary, BtnAlternate, BtnSecondaryAlt, Accordion,
} from './MarketingLayout';

const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

const faqItems = [
  {
    title: 'Is there a free trial?',
    content: 'Yes — every plan starts with a 14-day free trial, no credit card required. You can invite your team and run real conversions during the trial period. At the end of the trial you choose a plan or your account moves to a read-only view of documents already generated.',
  },
  {
    title: 'Can I change plans at any time?',
    content: 'Yes. You can upgrade immediately and the difference is prorated. Downgrading takes effect at the end of your current billing period. Enterprise contracts are annual but can be expanded mid-term if your team grows.',
  },
  {
    title: 'What counts as a conversion?',
    content: 'Each time you submit notes and receive a structured document is counted as one conversion. Editing, exporting, or re-exporting an existing document does not use a conversion. If you reach your monthly limit, additional conversions can be purchased in bundles or by upgrading your plan.',
  },
  {
    title: 'What payment methods do you accept?',
    content: 'For Team and Business plans we accept all major credit and debit cards. Enterprise plans are invoiced annually. We can accommodate purchase order workflows and existing vendor agreements for large organisations.',
  },
  {
    title: 'How does Enterprise pricing work?',
    content: 'Enterprise is priced per-user per-year, with volume discounts for teams above 50, 150, and 500 users. The price includes dedicated onboarding, a custom template build, SSO configuration, and a named customer success manager. Contact us for a tailored quote.',
  },
  {
    title: 'What happens to our data if we cancel?',
    content: 'You retain full access to export your documents for 30 days after cancellation. After that, documents are permanently deleted from our systems. We do not retain any of your source notes or generated documents after the deletion window closes.',
  },
];

const tableRows = [
  { label: 'Monthly conversions', team: '150', biz: 'Unlimited', ent: 'Unlimited' },
  { label: 'Users included', team: '5', biz: '20', ent: 'Unlimited' },
  { label: 'All four document types', team: true, biz: true, ent: true },
  { label: 'Word & PDF export', team: true, biz: true, ent: true },
  { label: 'Microsoft 365 & Entra ID SSO', team: false, biz: true, ent: true },
  { label: 'Custom templates & branding', team: false, biz: true, ent: true },
  { label: 'Audit trails & version control', team: false, biz: true, ent: true },
  { label: 'Approval workflows', team: false, biz: false, ent: true },
  { label: 'Azure region selection', team: false, biz: false, ent: true },
  { label: 'Uptime SLA', team: '99.5%', biz: '99.9%', ent: '99.95%' },
  { label: 'Support', team: 'Email', biz: 'Priority email', ent: 'Dedicated CSM' },
];

function CheckIcon({ on }: { on: boolean }) {
  if (on) return <img src={MS('check_circle')} width={20} alt="Included" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />;
  return <img src={MS('remove')} width={20} alt="Not included" style={{ opacity: 0.25 }} />;
}

export default function PricingPage() {
  const { openDemo } = useDemo();
  const [annual, setAnnual] = useState(true);

  const teamPrice = annual ? 18 : 22;
  const bizPrice = annual ? 38 : 46;

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(4.5rem,9vw,8rem) 0 clamp(3rem,5vw,4rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <span style={{ display: 'inline-block', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.5rem' }}>
            Pricing
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h1)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 1.25rem' }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: 'var(--text-large)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 auto 2.5rem', maxWidth: 500 }}>
            Start with a 14-day free trial. No credit card required.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.85rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-pill)', padding: '0.375rem' }}>
            <button
              onClick={() => setAnnual(false)}
              style={{ padding: '0.45rem 1.1rem', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600, background: !annual ? '#fff' : 'transparent', color: !annual ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: !annual ? 'var(--shadow-sm)' : 'none', transition: 'all 200ms' }}>
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 1.1rem', borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600, background: annual ? '#fff' : 'transparent', color: annual ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: annual ? 'var(--shadow-sm)' : 'none', transition: 'all 200ms' }}>
              Annual
              <span style={{ background: 'var(--color-apple)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-pill)' }}>Save 18%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing cards ─────────────────────────────────────── */}
      <section style={{ padding: '0 0 clamp(4rem,8vw,7rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', alignItems: 'start' }}>
            {/* Team */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Team</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.75rem' }}>For small operations teams getting started with structured documentation.</p>
              <div style={{ marginBottom: '1.75rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '3rem', letterSpacing: '-0.02em' }}>£{teamPrice}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>&nbsp;/user/month</span>
                {annual && <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.3rem' }}>Billed annually</div>}
              </div>
              <BtnPrimary onClick={openDemo} style={{ width: '100%', height: '2.75rem', marginBottom: '1.75rem' }}>Start free trial</BtnPrimary>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                {['150 conversions per month', '5 users included', 'Procedures, checklists, reference docs, diagrams', 'Word and PDF export', 'Email support'].map(f => (
                  <li key={f} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                    <img src={MS('check')} width={16} alt="" style={{ marginTop: 2, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Business — highlighted */}
            <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius-card)', padding: '2rem', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)' }}>Most popular</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.5rem', color: '#fff', margin: '0 0 0.5rem' }}>Business</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.75rem' }}>For established teams that need compliance controls and enterprise integrations.</p>
              <div style={{ marginBottom: '1.75rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '3rem', letterSpacing: '-0.02em', color: '#fff' }}>£{bizPrice}</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>&nbsp;/user/month</span>
                {annual && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: '0.3rem' }}>Billed annually</div>}
              </div>
              <button
                onClick={openDemo}
                style={{ width: '100%', height: '2.75rem', background: '#fff', color: 'var(--accent)', borderRadius: 'var(--radius-button)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.75rem' }}>
                Start free trial
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                {['Unlimited conversions', '20 users included', 'Everything in Team, plus:', 'Microsoft 365 & Entra ID SSO', 'Custom templates & branding', 'Audit trails & version control', 'Priority email support'].map(f => (
                  <li key={f} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.9rem', color: f.includes('plus') ? 'rgba(255,255,255,0.6)' : '#fff' }}>
                    {!f.includes('plus') && <img src={MS('check')} width={16} alt="" style={{ marginTop: 2, flexShrink: 0, filter: 'brightness(0) invert(1)' }} />}
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Enterprise</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.75rem' }}>For large organisations with complex compliance, governance, and deployment needs.</p>
              <div style={{ marginBottom: '1.75rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '2rem', letterSpacing: '-0.02em' }}>Custom pricing</span>
              </div>
              <button onClick={openDemo} style={{ width: '100%', height: '2.75rem', background: 'transparent', color: 'var(--text-primary)', borderRadius: 'var(--radius-button)', border: '1px solid var(--border-strong)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1.75rem' }}>
                Contact us
              </button>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
                {['Unlimited conversions & users', 'Everything in Business, plus:', 'Approval workflows', 'Azure region selection', 'Custom SLA (up to 99.95%)', 'Dedicated customer success manager', 'Custom onboarding & template build'].map(f => (
                  <li key={f} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.9rem', color: f.includes('plus') ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {!f.includes('plus') && <img src={MS('check')} width={16} alt="" style={{ marginTop: 2, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />}
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison table ──────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0', background: 'var(--surface-subtle)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: '0 0 2.5rem', textAlign: 'center' }}>
            Compare plans
          </h2>
          <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th style={{ padding: '1.25rem 1.5rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Feature</th>
                  {['Team', 'Business', 'Enterprise'].map(h => (
                    <th key={h} style={{ padding: '1.25rem 1.5rem', textAlign: 'center', fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-heading)', color: h === 'Business' ? 'var(--accent)' : 'var(--text-primary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={row.label} style={{ borderBottom: i < tableRows.length - 1 ? '1px solid var(--border-subtle)' : 'none', background: i % 2 === 0 ? '#fff' : 'var(--surface-page)' }}>
                    <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{row.label}</td>
                    {[row.team, row.biz, row.ent].map((val, j) => (
                      <td key={j} style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {typeof val === 'boolean' ? <CheckIcon on={val} /> : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '4rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 1.25rem' }}>Pricing questions</h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 2.5rem' }}>Can't find what you're looking for? Talk to our team.</p>
              <BtnPrimary onClick={openDemo}>Talk to sales</BtnPrimary>
            </div>
            <Accordion items={faqItems} />
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: '0 0 clamp(4rem,8vw,7rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-image)' }}>
            <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1900&q=80" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,40,90,0.88) 0%, rgba(0,20,50,0.75) 100%)' }} />
            <div style={{ position: 'relative', padding: 'clamp(3.5rem,6vw,5rem)', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', color: '#fff', margin: '0 auto 1.25rem', maxWidth: 560 }}>
                Start your free trial today
              </h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, margin: '0 auto 2.5rem', maxWidth: 440 }}>
                14 days, full access, no card required. See Structa convert your notes live.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <BtnAlternate onClick={openDemo}>Request a demo</BtnAlternate>
                <BtnSecondaryAlt>
                  <Link to="/security" style={{ color: 'inherit', textDecoration: 'none' }}>Security & compliance</Link>
                </BtnSecondaryAlt>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
