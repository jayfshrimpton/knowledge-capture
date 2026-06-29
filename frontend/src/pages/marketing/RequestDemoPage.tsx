import { useState } from 'react';
import MarketingLayout, {
  BtnPrimary, Avatar,
} from './MarketingLayout';

const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

const faqItems = [
  { q: 'How long is a typical demo?', a: "Around 30 minutes. We'll spend the first 10 minutes understanding your team's documentation workflow, then run a live conversion using notes you bring, and finish with a discussion on rollout and security." },
  { q: 'Do I need to prepare anything?', a: "Just bring a real example of the kind of notes your team produces — a shift handover, a site report, a meeting note, anything. The messier the better. We'll convert it live." },
  { q: 'Who should attend?', a: "Whoever owns the documentation problem. That's usually an operations manager, quality lead, or HSE manager. If you want a technical member of your IT team to attend for the security and SSO conversation, that works well too." },
  { q: 'Is there a free trial after the demo?', a: "Yes — every plan starts with a 14-day free trial. After the demo, we'll set up your trial environment and can pre-load your custom templates if you have them." },
  { q: 'How quickly do you respond?', a: "We aim to respond within one business day. For urgent requirements or large team deployments, contact us directly at sales@commonplace.app and we'll prioritise your request." },
];

function DemoFaq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ borderTop: i === 0 ? '1px solid var(--border-default)' : 'none', borderBottom: '1px solid var(--border-default)' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.1rem 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1rem', color: 'var(--text-primary)', textAlign: 'left' }}>
            <span>{item.q}</span>
            <img src={MS(open === i ? 'keyboard_arrow_up' : 'keyboard_arrow_down')} width={20} alt="" style={{ flexShrink: 0, opacity: 0.6 }} />
          </button>
          {open === i && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.65, fontSize: '0.9875rem', paddingBottom: '1.1rem', margin: 0 }}>{item.a}</p>}
        </div>
      ))}
    </div>
  );
}

const industries = [
  'Engineering & construction',
  'Manufacturing',
  'Professional services',
  'Healthcare administration',
  'Logistics & transport',
  'Energy & utilities',
  'Other',
];

const teamSizes = [
  '1–10',
  '11–50',
  '51–200',
  '201–1,000',
  '1,000+',
];

export default function RequestDemoPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <MarketingLayout>
      {/* ── Split layout ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '5rem', alignItems: 'start' }}>
            {/* Left: value prop */}
            <div>
              <span style={{ display: 'inline-block', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.5rem' }}>
                Request a demo
              </span>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 1.25rem' }}>
                See Commonplace convert your notes live
              </h1>
              <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 2.5rem' }}>
                In 30 minutes, you'll see exactly what Commonplace produces from the kind of notes your team actually writes — and we'll walk through the security, compliance, and rollout questions together.
              </p>

              {/* What to expect steps */}
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {[
                  {
                    num: '01',
                    title: 'Bring your own notes',
                    desc: "Share a real example of your team's documentation — a handover, site report, or meeting note. The messier the better.",
                    icon: 'edit_note',
                  },
                  {
                    num: '02',
                    title: 'Watch the conversion',
                    desc: "We'll convert your notes live, in the demo. You'll see exactly how Commonplace structures your specific type of content.",
                    icon: 'auto_awesome',
                  },
                  {
                    num: '03',
                    title: 'Talk rollout and security',
                    desc: "We'll cover integration, SSO, compliance requirements, and what a team rollout looks like for your organisation.",
                    icon: 'rocket_launch',
                  },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1.1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-card)', background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={MS(step.icon)} width={22} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.05rem', margin: '0 0 0.35rem' }}>{step.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.1rem', marginTop: '3rem', padding: '2rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)' }}>
                {[
                  { stat: '70%', label: 'Reduction in documentation time' },
                  { stat: '5', label: 'Industries served' },
                  { stat: '4', label: 'Document types supported' },
                  { stat: '<1 day', label: 'Response time' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.75rem', letterSpacing: '-0.02em', color: 'var(--accent)', lineHeight: 1 }}>{s.stat}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: form */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)', padding: '2.5rem', position: 'sticky', top: '6rem' }}>
              {!sent ? (
                <>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Book a demo</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 2rem' }}>We'll respond within one business day to confirm a time.</p>
                  <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>First name *</label>
                        <input type="text" required placeholder="James" className="st-input" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Last name *</label>
                        <input type="text" required placeholder="Mitchell" className="st-input" />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Work email *</label>
                      <input type="email" required placeholder="james@company.com" className="st-input" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Company *</label>
                      <input type="text" required placeholder="Acme Operations Ltd." className="st-input" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Job title *</label>
                      <input type="text" required placeholder="Operations Director" className="st-input" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Team size</label>
                        <select className="st-select" defaultValue="">
                          <option value="" disabled>Select</option>
                          {teamSizes.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Industry</label>
                        <select className="st-select" defaultValue="">
                          <option value="" disabled>Select</option>
                          {industries.map(i => <option key={i}>{i}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Anything you'd like us to know?</label>
                      <textarea placeholder="Tell us about your documentation challenge, or any specific questions you have..." className="st-textarea" rows={3} />
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <BtnPrimary type="submit" style={{ width: '100%', height: '2.875rem' }}>Request demo</BtnPrimary>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                      We respect your privacy and will never share your details.
                    </p>
                  </form>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ width: 64, height: 64, background: 'var(--color-apple-lightest)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <img src={MS('check_circle')} width={36} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(48%) sepia(58%) saturate(560%) hue-rotate(72deg)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.5rem', margin: '0 0 0.75rem' }}>Request received</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55, margin: '0 0 2rem' }}>
                    Thank you for your interest. Our team will reach out within one business day to confirm a time that works for you.
                  </p>
                  <div style={{ padding: '1.25rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem', fontWeight: 600 }}>Before the call — bring your notes</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Find a real example of your team's documentation notes. The messier the better — that's what makes the demo most impactful.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ───────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,6rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <blockquote style={{ margin: 0 }}>
              <p style={{ fontSize: 'var(--text-large)', lineHeight: 1.55, fontStyle: 'italic', color: 'var(--text-primary)', margin: '0 0 2rem' }}>
                "The quality consistency alone justifies the investment. Every procedure our team produces now follows the same structure, same depth, same compliance checkpoints. Our external auditors noticed the difference immediately."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.9rem' }}>
                <Avatar name="Sarah Chen" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Sarah Chen</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Quality Manager, Precision Manufacturing Ltd.</div>
                </div>
              </div>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '4rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 1rem' }}>Demo questions</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>Everything you need to know about what to expect.</p>
            </div>
            <DemoFaq items={faqItems} />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
