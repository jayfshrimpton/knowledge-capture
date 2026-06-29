import { Link } from 'react-router-dom';
import MarketingLayout, {
  useDemo, BtnPrimary, BtnAlternate, BtnSecondaryAlt, Accordion, Avatar,
} from './MarketingLayout';

const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

const controlsItems = [
  {
    title: 'How is access to documents controlled?',
    content: 'Every document is associated with a team and can be restricted to specific roles. Admins can create custom roles with granular permissions — view, create, edit, approve, or export. Role assignments can be managed individually or through your Microsoft Entra ID groups, so access follows your existing org structure automatically.',
  },
  {
    title: 'Who approves documents before they go live?',
    content: 'Enterprise plans include configurable approval workflows. Documents can require review and sign-off from one or more approvers before they are published to the team library. Approval chains can be role-based or individual, with automatic escalation if an approver is inactive.',
  },
  {
    title: 'Can we restrict what data leaves the platform?',
    content: 'Yes. Admins can disable export for specific roles or document types. All exports are logged in the audit trail with user identity, timestamp, and document version. Watermarking can be applied to PDF exports on request for Enterprise accounts.',
  },
  {
    title: 'What audit trail capabilities are available?',
    content: 'Commonplace maintains an immutable log of all significant actions: user sign-ins, document creation, edits, approvals, exports, and permission changes. The log captures user identity, timestamp, action type, and document version. Logs are exportable in CSV or JSON format for integration with your SIEM or compliance reporting tools.',
  },
  {
    title: 'How does Commonplace handle MFA and conditional access?',
    content: 'For Microsoft 365 organisations, MFA and conditional access policies are enforced through Entra ID — Commonplace inherits your existing security posture without requiring separate configuration. For non-SSO accounts, TOTP-based MFA can be enforced at the organisation level by admins.',
  },
  {
    title: 'What happens to data when an employee leaves?',
    content: 'User accounts can be suspended or deleted via the admin panel. Suspended users lose access immediately. Documents created by a departed user remain in the team library — ownership is transferred to the admin. For SSO organisations, revoking access in Entra ID automatically terminates Commonplace access at the next session check.',
  },
];

const certifications = [
  { icon: 'verified_user', label: 'SOC 2 Type II', sub: 'Audited annually', color: 'var(--status-success)', bg: 'var(--color-apple-lightest)' },
  { icon: 'security', label: 'ISO 27001', sub: 'Certified', color: 'var(--status-success)', bg: 'var(--color-apple-lightest)' },
  { icon: 'gpp_good', label: 'GDPR', sub: 'Fully compliant', color: 'var(--status-success)', bg: 'var(--color-apple-lightest)' },
  { icon: 'local_hospital', label: 'HIPAA', sub: 'Enterprise plan', color: 'var(--status-success)', bg: 'var(--color-apple-lightest)' },
  { icon: 'cloud', label: 'Azure hosted', sub: 'ISO 27017 infra', color: 'var(--accent)', bg: 'var(--accent-subtle)' },
  { icon: 'bug_report', label: 'Pen testing', sub: 'Annual external', color: 'var(--status-warning)', bg: 'var(--color-burning-orange-lightest)' },
];

const pillars = [
  { icon: 'lock', title: 'Data encryption', desc: 'All data encrypted at rest (AES-256) and in transit (TLS 1.3). Encryption keys managed in Azure Key Vault with customer-managed key (CMK) support on Enterprise plans.' },
  { icon: 'location_on', title: 'Regional data residency', desc: 'Enterprise customers choose their Azure region. Data processing and storage remains within that region. No cross-region replication without explicit consent.' },
  { icon: 'visibility_off', title: 'Zero training usage', desc: 'Your source notes and generated documents are never used to train AI models. Processing is isolated per-session and ephemeral — nothing is retained after the session ends.' },
  { icon: 'shield', title: 'No third-party sharing', desc: 'We do not sell or share your content with third parties. Sub-processors are limited to Azure infrastructure services, subject to the same data residency and security requirements.' },
];

const auditLog = [
  { time: '09:14:02', user: 'j.mitchell@acme.com', action: 'Signed in', icon: 'login', ok: true },
  { time: '09:16:34', user: 'j.mitchell@acme.com', action: 'Opened procedure: Pump Room Handover OP-ENG-042', icon: 'description', ok: true },
  { time: '09:31:07', user: 's.chen@acme.com', action: 'Edited checklist: Pre-entry Confined Space CL-OPS-017', icon: 'edit', ok: true },
  { time: '10:02:45', user: 'admin@acme.com', action: '3 users provisioned via Entra ID sync', icon: 'group_add', ok: true },
  { time: '10:58:11', user: 'm.rodriguez@acme.com', action: 'Session expired — inactive timeout', icon: 'timer_off', ok: false },
];

export default function SecurityPage() {
  const { openDemo } = useDemo();

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(4.5rem,9vw,8rem) 0 clamp(3rem,5vw,4rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <span style={{ display: 'inline-block', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.5rem' }}>
            Security & compliance
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h1)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 1.5rem', maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
            Enterprise-grade security for regulated industries
          </h1>
          <p style={{ fontSize: 'var(--text-large)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 auto 2.5rem', maxWidth: 560 }}>
            Commonplace is built to meet the security and compliance requirements of industries where documentation errors have real consequences.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <BtnPrimary onClick={openDemo}>Request a demo</BtnPrimary>
            <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', height: '2.75rem', padding: '0 1.5rem', borderRadius: 'var(--radius-button)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 600, border: '1px solid var(--border-strong)', textDecoration: 'none' }}>View pricing</Link>
          </div>
        </div>
      </section>

      {/* ── Certifications ────────────────────────────────────── */}
      <section style={{ padding: '0 0 clamp(4rem,8vw,7rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
            {certifications.map(cert => (
              <div key={cert.label} style={{ background: cert.bg, borderRadius: 'var(--radius-card)', padding: '1.5rem 1rem', textAlign: 'center', border: `1px solid ${cert.color}22` }}>
                <img src={MS(cert.icon)} width={28} alt="" style={{ filter: `brightness(0) saturate(100%)`, opacity: 0.8, marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{cert.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cert.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust pillars ─────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: '0 0 0.75rem' }}>How we protect your data</h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
              Security is not an add-on — it's the foundation everything else is built on.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            {pillars.map(p => (
              <div key={p.title} style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '2rem', border: '1px solid var(--border-subtle)', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{ width: 48, height: 48, background: 'var(--accent-subtle)', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={MS(p.icon)} width={24} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.1rem', margin: '0 0 0.5rem' }}>{p.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Identity & access + audit log ─────────────────────── */}
      <section style={{ background: 'var(--surface-inverse)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '4rem', alignItems: 'center' }}>
            <div>
              <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.25rem' }}>
                Identity & access
              </span>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', color: '#fff', margin: '0 0 1.25rem' }}>
                Access control you can trust
              </h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 2rem' }}>
                Connect Commonplace to Microsoft Entra ID and your existing security policies apply automatically. SSO, MFA, and conditional access — no separate configuration required.
              </p>
              <div style={{ display: 'grid', gap: '0.9rem', marginBottom: '2.5rem' }}>
                {[
                  ['SAML / OIDC SSO', 'Single sign-on via Microsoft Entra ID or any SAML 2.0 provider'],
                  ['Automatic provisioning', 'SCIM provisioning syncs users and groups from your directory'],
                  ['Role-based access', 'Granular permissions — view, create, approve, export — per role'],
                  ['Immutable audit trail', 'Every action logged with user identity, timestamp, and document version'],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: '0.75rem' }}>
                    <img src={MS('check_circle')} width={20} alt="" style={{ flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(72%) sepia(38%) saturate(560%) hue-rotate(56deg)', marginTop: 1 }} />
                    <div>
                      <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{title}</span>
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}> — {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <BtnAlternate onClick={openDemo}>Talk to our security team</BtnAlternate>
            </div>

            {/* Audit log mock */}
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-card)', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Audit log — live feed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-apple-light)', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-apple-light)', display: 'inline-block' }} />
                  Live
                </span>
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {auditLog.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-card)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: entry.ok ? 'rgba(150,203,126,0.15)' : 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={MS(entry.icon)} width={14} alt="" style={{ filter: entry.ok ? 'brightness(0) saturate(100%) invert(72%) sepia(38%) saturate(560%) hue-rotate(56deg)' : 'brightness(0) saturate(100%) invert(65%) sepia(90%) saturate(900%) hue-rotate(340deg)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.action}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '0.75rem' }}>
                        <span>{entry.time}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Data ownership ────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: '0 0 0.75rem' }}>Your data, your rules</h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', margin: 0 }}>Three principles that govern how we handle your content.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { num: '01', title: 'You own your content', desc: 'Everything you create in Commonplace belongs to you. We do not claim any rights over your source notes, generated documents, or any derivative content.' },
              { num: '02', title: 'Delete means delete', desc: 'When you delete a document or account, data is removed from all systems within 30 days. No shadow copies, no backup retention beyond that window.' },
              { num: '03', title: 'Portability guaranteed', desc: 'You can export your entire document library at any time, in standard formats. No lock-in, no data held hostage.' },
            ].map(p => (
              <div key={p.num} style={{ padding: '2rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '2rem', color: 'var(--accent-subtle)', lineHeight: 1, marginBottom: '0.75rem' }}>{p.num}</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.15rem', margin: '0 0 0.65rem' }}>{p.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Controls accordion ────────────────────────────────── */}
      <section id="compliance" style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '4rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 1.25rem' }}>Security controls</h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 2.5rem' }}>
                Detailed answers to common questions from IT and compliance teams.
              </p>
              <BtnPrimary onClick={openDemo}>Request security documentation</BtnPrimary>
            </div>
            <Accordion items={controlsItems} />
          </div>
        </div>
      </section>

      {/* ── Testimonial ───────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <img
              src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1900&q=80"
              alt=""
              style={{ width: '100%', height: 'auto', maxHeight: 440, objectFit: 'cover', borderRadius: 'var(--radius-image)', marginBottom: '3rem' }}
            />
            <blockquote style={{ margin: 0, textAlign: 'center' }}>
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

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: '0 0 clamp(4rem,8vw,7rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-image)' }}>
            <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1900&q=80" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,40,90,0.88) 0%, rgba(0,20,50,0.75) 100%)' }} />
            <div style={{ position: 'relative', padding: 'clamp(3.5rem,6vw,5rem)', maxWidth: 620 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', color: '#fff', margin: '0 0 1.25rem' }}>
                Ready to see Commonplace in your environment?
              </h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, margin: '0 0 2.5rem' }}>
                Our team can walk through our security architecture, answer IT and compliance questions, and provide documentation for your review.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <BtnAlternate onClick={openDemo}>Request a demo</BtnAlternate>
                <BtnSecondaryAlt>
                  <Link to="/pricing" style={{ color: 'inherit', textDecoration: 'none' }}>View pricing</Link>
                </BtnSecondaryAlt>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
