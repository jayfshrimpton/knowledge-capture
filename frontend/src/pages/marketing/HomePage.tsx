import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout, {
  useDemo, BtnPrimary, BtnAlternate, BtnSecondaryAlt,
  Avatar, Accordion, ImageCard,
} from './MarketingLayout';

const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

const faqItems = [
  {
    title: 'How does Commonplace integrate with existing systems?',
    content: 'Commonplace works alongside your existing tools — paste in notes, emails, or reports, and receive structured documents in seconds. For team deployments, we support Microsoft 365 integration and single sign-on via Microsoft Entra ID, so your team can work within familiar workflows without any additional infrastructure.',
  },
  {
    title: 'What happens to our data?',
    content: 'Your data stays in your chosen Azure region and is never used to train AI models. Commonplace processes each conversion in an isolated, ephemeral environment and retains no copies of your source notes or generated documents after the session ends. Enterprise customers can elect to store audit logs and version history in their own Azure subscription.',
  },
  {
    title: 'How long does conversion take?',
    content: 'Most conversions complete in under 30 seconds. Complex, multi-page documents or those requiring custom template application may take slightly longer. Our infrastructure auto-scales to maintain consistent performance regardless of team size or document volume.',
  },
  {
    title: 'Can we customise the output format and templates?',
    content: 'Yes. Business and Enterprise plans support custom templates, including your organisation\'s standard headings, numbering schemes, branding, and compliance metadata fields. Templates can be locked by admins and made available to specific teams, ensuring consistency across your document library.',
  },
  {
    title: 'What about compliance and regulatory requirements?',
    content: 'Commonplace is built to meet the documentation standards required in regulated industries. We support audit trails, version control, and approval workflows that satisfy ISO 9001, ISO 45001, and industry-specific frameworks. Our security and compliance certifications include SOC 2 Type II and GDPR compliance, with HIPAA support available on Enterprise plans.',
  },
];

const testimonials = [
  {
    quote: "Commonplace has completely transformed how we handle handover documentation. What used to take an hour of post-shift admin is now done in two minutes. Our compliance audits have gone from stressful to straightforward.",
    name: 'James Mitchell',
    role: 'Operations Director',
    org: 'Industrial Engineering Co.',
  },
  {
    quote: "The quality consistency alone justifies the investment. Every procedure our team produces now follows the same structure, same depth, same compliance checkpoints. Our external auditors noticed the difference immediately.",
    name: 'Sarah Chen',
    role: 'Quality Manager',
    org: 'Precision Manufacturing Ltd.',
  },
  {
    quote: "We deal with safety-critical documentation every day. Commonplace gives us the confidence that nothing gets missed — every hazard, every control measure, every emergency procedure is captured and structured correctly, every time.",
    name: 'Marcus Rodriguez',
    role: 'HSE Manager',
    org: 'Energy & Resources Plc.',
  },
];

const benefits = [
  {
    icon: 'schedule',
    title: 'Time reclaimed',
    desc: 'Cut documentation time by 70%. Notes become structured procedures in under 30 seconds, returning hours to your team each week.',
  },
  {
    icon: 'verified',
    title: 'Compliance assured',
    desc: 'Every document follows your regulatory framework — ISO 9001, ISO 45001, GDPR, and more — without manual checking.',
  },
  {
    icon: 'hub',
    title: 'Knowledge preserved',
    desc: 'Capture institutional knowledge before it walks out the door. Standardised, searchable, version-controlled, always available.',
  },
  {
    icon: 'trending_up',
    title: 'Operations elevated',
    desc: 'From reactive to proactive. Consistent documentation reduces incidents, speeds onboarding, and drives continuous improvement.',
  },
];

export default function HomePage() {
  const { openDemo } = useDemo();
  const [ti, setTi] = useState(0);

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '88vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1900&q=80"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 100%)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '80rem', margin: '0 auto', padding: 'clamp(5rem,10vw,8rem) 5%' }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-pill)',
              padding: '0.3rem 0.85rem', marginBottom: '1.75rem',
            }}>
              <img src={MS('auto_awesome')} width={16} alt="" style={{ filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                AI documentation for regulated industries
              </span>
            </div>
            <h1 style={{
              fontFamily: 'var(--font-heading)', fontWeight: 500,
              fontSize: 'var(--text-h1)', lineHeight: 1.1,
              letterSpacing: '-0.02em', color: '#fff', margin: '0 0 1.5rem',
            }}>
              Turn rough notes into structured documentation
            </h1>
            <p style={{ fontSize: 'var(--text-large)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5, margin: '0 0 2.5rem', maxWidth: 540 }}>
              Commonplace converts field notes, emails, and brain dumps into compliant procedures, checklists, and reference documents — in seconds.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <BtnAlternate onClick={openDemo}>Request a demo</BtnAlternate>
              <BtnSecondaryAlt>
                <Link to="/how-it-works" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  See how it works
                  <img src={MS('arrow_forward')} width={18} alt="" style={{ filter: 'brightness(0) invert(1)' }} />
                </Link>
              </BtnSecondaryAlt>
            </div>
          </div>
        </div>
      </section>

      {/* ── Conversion split ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            <div>
              <span style={{ display: 'inline-block', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.25rem' }}>
                Instant conversion
              </span>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 1.25rem' }}>
                From raw notes to ready documents
              </h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 2rem' }}>
                Paste in whatever you have — shorthand, bullet points, voice transcript. Commonplace understands the operational context and produces a document that meets your compliance standards, first time.
              </p>
              <div style={{ display: 'grid', gap: '1.1rem', marginBottom: '2.5rem' }}>
                {[
                  ['Procedures', 'Step-by-step operational instructions with safety controls'],
                  ['Checklists', 'Pre-task verification and sign-off workflows'],
                  ['Reference docs', 'Technical specifications and quick-reference guides'],
                  ['Process diagrams', 'Visual flows for complex multi-step operations'],
                ].map(([type, desc]) => (
                  <div key={type} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <img src={MS('check_circle')} width={20} alt="" style={{ marginTop: 2, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{type}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}> — {desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <BtnPrimary onClick={openDemo}>Request a demo</BtnPrimary>
            </div>
            <div>
              <img
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1300&q=80"
                alt="Field notes being structured"
                style={{ width: '100%', height: 'auto', minHeight: 440, objectFit: 'cover', borderRadius: 'var(--radius-image)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise image cards ────────────────────────────── */}
      <section style={{ padding: 'clamp(2rem,4vw,4rem) 0 clamp(4rem,8vw,7rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: '0 0 1rem' }}>
              Built for enterprise operations
            </h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>
              Commonplace meets the security, compliance, and scalability demands of industrial and regulated environments.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {[
              { img: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1100&q=80', title: 'Enterprise security', desc: 'SOC 2 Type II certified. Data stays in your Azure region. No model training on your content.' },
              { img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1100&q=80', title: 'Microsoft 365 integration', desc: 'Single sign-on via Entra ID. Export directly to Word and PDF in your existing workflows.' },
              { img: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=1100&q=80', title: 'Compliance by design', desc: 'Approval workflows, audit trails, and version control built for ISO 9001 and ISO 45001 environments.' },
            ].map(card => (
              <ImageCard key={card.title} image={card.img} minHeight={300}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: 256 }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.35rem', color: '#fff', margin: '0 0 0.6rem' }}>{card.title}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{card.desc}</p>
                </div>
              </ImageCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits grid ─────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
            <div>
              <span style={{ display: 'inline-block', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.25rem' }}>
                Real impact
              </span>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 1.25rem' }}>
                What Commonplace does for your team
              </h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                The impact goes beyond faster documents. When documentation quality is consistent and effortless, the whole operation improves.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
              {benefits.map(b => (
                <div key={b.title}>
                  <div style={{ width: 44, height: 44, background: 'var(--accent-subtle)', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
                    <img src={MS(b.icon)} width={22} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.1rem', margin: '0 0 0.45rem' }}>{b.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Output type image cards ───────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: '0 0 1rem' }}>
              Four document types, one tool
            </h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto' }}>
              Commonplace intelligently selects the right output format for your content, or you choose — procedures, checklists, reference documents, and process diagrams.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.1rem' }}>
            {[
              { img: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80', label: 'Procedures', desc: 'Step-by-step operational instructions with role assignments and safety controls.' },
              { img: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80', label: 'Checklists', desc: 'Pre-task, pre-shift, and sign-off checklists aligned to your compliance requirements.' },
              { img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80', label: 'Reference docs', desc: 'Technical specifications, quick-reference guides, and regulatory summaries.' },
              { img: 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=900&q=80', label: 'Process diagrams', desc: 'Visual workflows and decision trees for complex multi-step operations.' },
            ].map(card => (
              <ImageCard key={card.label} image={card.img} minHeight={320}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', minHeight: 276 }}>
                  <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', marginBottom: '0.65rem', backdropFilter: 'blur(6px)' }}>
                    {card.label}
                  </span>
                  <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{card.desc}</p>
                </div>
              </ImageCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: 0 }}>
              Trusted by operations teams
            </h2>
          </div>
          <div style={{
            background: '#fff', borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
            padding: 'clamp(2rem,4vw,3.5rem)',
          }}>
            <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
              <p style={{ fontSize: 'var(--text-large)', lineHeight: 1.55, color: 'var(--text-primary)', fontStyle: 'italic', margin: '0 0 2rem' }}>
                "{testimonials[ti].quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', marginBottom: '2rem' }}>
                <Avatar name={testimonials[ti].name} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{testimonials[ti].name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{testimonials[ti].role}, {testimonials[ti].org}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTi(i)}
                    style={{
                      width: i === ti ? 24 : 8, height: 8, borderRadius: 4,
                      background: i === ti ? 'var(--accent)' : 'var(--border-default)',
                      border: 'none', cursor: 'pointer',
                      transition: 'width 0.3s, background 0.3s',
                      padding: 0,
                    }}
                    aria-label={`Testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '4rem', alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', margin: '0 0 1.25rem' }}>
                Frequently asked questions
              </h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 2.5rem' }}>
                Everything you need to know about getting Commonplace into your operation.
              </p>
              <BtnPrimary onClick={openDemo}>Speak with our team</BtnPrimary>
            </div>
            <Accordion items={faqItems} />
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-image)' }}>
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1900&q=80"
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,40,90,0.88) 0%, rgba(0,20,50,0.75) 100%)' }} />
            <div style={{ position: 'relative', padding: 'clamp(3.5rem,6vw,5rem)', maxWidth: 620 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', color: '#fff', margin: '0 0 1.25rem' }}>
                Ready to see Commonplace convert your notes?
              </h2>
              <p style={{ fontSize: 'var(--text-medium)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, margin: '0 0 2.5rem' }}>
                Book a 30-minute walkthrough and bring your own notes. We'll convert them live.
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
