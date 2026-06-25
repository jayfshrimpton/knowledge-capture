import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout, {
  useDemo, BtnPrimary, BtnAlternate, BtnSecondaryAlt,
} from './MarketingLayout';

const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

const outputTabs = [
  {
    key: 'procedures',
    label: 'Procedures',
    icon: 'article',
    title: 'Step-by-step operational procedures',
    desc: 'Clear, numbered instructions with role assignments, safety controls, and sign-off requirements. Ready for your QMS from the first generation.',
    example: {
      docType: 'OPERATING PROCEDURE',
      docId: 'OP-ENG-042 | Rev 3',
      title: 'Pump Room Handover — Morning Shift',
      sections: [
        {
          heading: '1. Scope and applicability',
          body: 'This procedure covers the transfer of operational responsibility for the pump room at shift change. Applies to all shift supervisors and senior operators on sites with pressurised water systems.',
        },
        {
          heading: '2. Safety requirements',
          body: 'PPE: Safety glasses, hearing protection (>85dB), steel-toe boots. Ensure emergency stop locations are confirmed before commencing checks. Do not operate isolation valves without authorisation from site supervisor.',
        },
        {
          heading: '3. Pre-handover checks',
          steps: ['Verify all pressure gauges are within normal operating range (4.2–6.8 bar)', 'Check pump 2 bearings — listening check for abnormal noise', 'Confirm chemical dosing levels: chlorine 0.5–1.0 mg/L, pH 7.2–7.6', 'Log ambient temperature and humidity in handover sheet'],
        },
        {
          heading: '4. Handover sign-off',
          body: 'Both outgoing and incoming supervisor must review and sign the handover log before shift transfer is complete.',
        },
      ],
    },
  },
  {
    key: 'checklists',
    label: 'Checklists',
    icon: 'checklist',
    title: 'Pre-task and compliance checklists',
    desc: 'Verification checklists with role-based sign-off, conditional logic, and audit trail integration.',
    example: {
      docType: 'PRE-TASK CHECKLIST',
      docId: 'CL-OPS-017 | Rev 2',
      title: 'Confined Space Entry — Pre-Entry Verification',
      checks: [
        { label: 'Atmospheric testing completed (O₂, LEL, CO, H₂S)', done: true },
        { label: 'Entry permit signed by site supervisor', done: true },
        { label: 'Rescue equipment in position and tested', done: true },
        { label: 'All entrants briefed on emergency procedures', done: true },
        { label: 'Communication system tested and functional', done: false },
        { label: 'Standby person assigned and confirmed', done: false },
      ],
    },
  },
  {
    key: 'reference',
    label: 'Reference',
    icon: 'menu_book',
    title: 'Technical reference documents',
    desc: 'Equipment specs, quick-reference guides, and regulatory summaries — structured for fast lookup on the job.',
    example: {
      docType: 'REFERENCE DOCUMENT',
      docId: 'REF-ENG-008 | Rev 5',
      title: 'Pressure Relief Valve — Specification Summary',
      sections: [
        { heading: 'Valve model', body: 'Spirax Sarco SV615 — Spring-loaded, direct-acting' },
        { heading: 'Set pressure range', body: '1.5 – 16 bar (adjustable, factory-set at 6 bar)' },
        { heading: 'Inspection interval', body: 'Annual statutory inspection required (PSSR 2000)' },
        { heading: 'Last tested', body: '14 March 2026 — Certificate ref: PSSR-2026-0047' },
      ],
    },
  },
  {
    key: 'diagrams',
    label: 'Diagrams',
    icon: 'account_tree',
    title: 'Process diagrams and decision trees',
    desc: 'Visual workflows for complex operations — fault isolation, escalation paths, and process flows.',
    example: {
      docType: 'PROCESS DIAGRAM',
      docId: 'PD-OPS-003 | Rev 1',
      title: 'Alarm Response — High Pressure Fault',
      nodes: [
        { id: 'a', label: 'High pressure alarm triggered', type: 'trigger' },
        { id: 'b', label: 'Check gauge at panel', type: 'action' },
        { id: 'c', label: 'Reading > 8 bar?', type: 'decision' },
        { id: 'd', label: 'Notify supervisor, continue monitoring', type: 'action' },
        { id: 'e', label: 'Isolate pump, call site supervisor', type: 'action' },
      ],
    },
  },
];

const inputMethods = [
  { icon: 'content_paste', label: 'Pasted text', desc: 'Copy and paste from emails, reports, or any digital source.' },
  { icon: 'edit_note', label: 'Typed notes', desc: 'Write directly in the editor — shorthand, bullets, whatever you have.' },
  { icon: 'mail', label: 'Emails & reports', desc: 'Paste email threads or existing documents to restructure and standardise.' },
  { icon: 'psychology', label: 'Brain dumps', desc: 'Unstructured thoughts become organised procedures. Structa finds the logic.' },
];

export default function HowItWorksPage() {
  const { openDemo } = useDemo();
  const [activeTab, setActiveTab] = useState(0);

  const tab = outputTabs[activeTab];

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(4.5rem,9vw,8rem) 0 clamp(3rem,5vw,5rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <span style={{ display: 'inline-block', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.5rem' }}>
            How it works
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h1)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 1.5rem', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            Three steps from notes to documentation
          </h1>
          <p style={{ fontSize: 'var(--text-large)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 auto 2.5rem', maxWidth: 560 }}>
            No templates to fill, no formatting to apply. Just paste your notes and get a compliant document — every time.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <BtnPrimary onClick={openDemo}>Request a demo</BtnPrimary>
            <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', height: '2.75rem', padding: '0 1.5rem', borderRadius: 'var(--radius-button)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 600, border: '1px solid var(--border-strong)', textDecoration: 'none' }}>
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ── Input methods ─────────────────────────────────────── */}
      <section style={{ padding: 'clamp(2rem,4vw,4rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.1rem', marginBottom: '4rem' }}>
            {inputMethods.map(m => (
              <div key={m.label} style={{ padding: '1.5rem', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 44, height: 44, background: 'var(--accent-subtle)', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
                  <img src={MS(m.icon)} width={22} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.05rem', margin: '0 0 0.5rem' }}>{m.label}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3-step walkthrough ───────────────────────────────── */}
      <section style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', letterSpacing: '-0.015em', margin: 0 }}>
              See it in action
            </h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', margin: '1rem auto 0', maxWidth: 480 }}>
              A pump room handover — from rough notes to a compliant procedure.
            </p>
          </div>
          {[
            {
              step: '01',
              title: 'Paste your notes',
              desc: 'Copy your handover notes exactly as you wrote them — no need to tidy them up first.',
              content: (
                <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', padding: '1.25rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {['#ef4444', '#f59e0b', '#22c55e'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{`pump room am handover
gauges all normal, p2 bearing a bit loud but ran ok, asked mech to have a look. chem levels good - chlorine 0.7 ppm, ph 7.4. told incoming to keep eye on pump 2 noise and call supervisor if gets worse. no other issues. t&h logged.`}</p>
                </div>
              ),
            },
            {
              step: '02',
              title: 'Structa structures it',
              desc: 'The AI identifies the operational context, extracts key information, and applies your compliance framework.',
              content: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  {['Context detection', 'Structure application', 'Compliance check', 'Document generated'].map((stage, i) => (
                    <div key={stage} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                        <img src={MS(['search', 'format_list_bulleted', 'verified', 'check'][i])} width={22} alt="" style={{ filter: 'brightness(0) invert(1)' }} />
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>{stage}</p>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              step: '03',
              title: 'Review and export',
              desc: 'Download as Word or PDF, or push directly to your document management system.',
              content: (
                <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                  {['Word document (.docx)', 'PDF', 'SharePoint', 'Custom template'].map(fmt => (
                    <div key={fmt} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-button)', fontSize: '0.875rem', fontWeight: 500 }}>
                      <img src={MS('download')} width={16} alt="" style={{ opacity: 0.6 }} />
                      {fmt}
                    </div>
                  ))}
                </div>
              ),
            },
          ].map((s, i) => (
            <div key={s.step} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3.5rem', alignItems: 'center', marginBottom: i < 2 ? '4rem' : 0 }}>
              {i % 2 === 0 ? (
                <>
                  <div>
                    <span style={{ display: 'inline-block', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '3rem', color: 'var(--accent-subtle)', lineHeight: 1, marginBottom: '0.5rem' }}>{s.step}</span>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h4)', margin: '0 0 0.85rem' }}>{s.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                  </div>
                  <div style={{ background: 'var(--surface-page)', borderRadius: 'var(--radius-card)', padding: '1.75rem', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-subtle)' }}>{s.content}</div>
                </>
              ) : (
                <>
                  <div style={{ background: 'var(--surface-page)', borderRadius: 'var(--radius-card)', padding: '1.75rem', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-subtle)' }}>{s.content}</div>
                  <div>
                    <span style={{ display: 'inline-block', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '3rem', color: 'var(--accent-subtle)', lineHeight: 1, marginBottom: '0.5rem' }}>{s.step}</span>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h4)', margin: '0 0 0.85rem' }}>{s.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Before / After ───────────────────────────────────── */}
      <section style={{ background: 'var(--surface-inverse)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', letterSpacing: '-0.015em', color: '#fff', margin: '0 0 1rem' }}>
              Before and after
            </h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              The same pump room handover — as notes, and as a Structa document.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-card)', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Before — raw notes</span>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' }}>{`pump room am handover
gauges all normal, p2 bearing a bit loud but ran ok, asked mech to have a look. chem levels good - chlorine 0.7 ppm, ph 7.4. told incoming to keep eye on pump 2 noise and call supervisor if gets worse. no other issues. t&h logged.`}</p>
            </div>
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>After — Structa document</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.07em', marginBottom: '0.35rem' }}>OPERATING PROCEDURE · OP-ENG-042</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.05rem', margin: '0 0 1rem' }}>Pump Room Handover — Morning Shift</h3>
              {[
                ['Gauge status', 'All within normal operating range (4.2–6.8 bar). No anomalies.'],
                ['Equipment note', 'Pump 2 bearing: audible noise noted. Maintenance requested. Incoming supervisor to monitor.'],
                ['Chemical levels', 'Chlorine: 0.7 mg/L ✓  pH: 7.4 ✓  Both within specification.'],
                ['Escalation trigger', 'Notify site supervisor if pump 2 noise deteriorates.'],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{k}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Output type tabs ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', letterSpacing: '-0.015em', margin: '0 0 1rem' }}>
              Every document type you need
            </h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', margin: 0 }}>
              Structa selects the right format or you choose — either way, the output is ready to use.
            </p>
          </div>
          {/* Tab strip */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
            {outputTabs.map((t, i) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(i)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-button)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '0.9rem', fontWeight: 600,
                  background: i === activeTab ? 'var(--accent)' : 'var(--surface-subtle)',
                  color: i === activeTab ? '#fff' : 'var(--text-secondary)',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                <img src={MS(t.icon)} width={18} alt="" style={{ filter: i === activeTab ? 'brightness(0) invert(1)' : 'none', opacity: i === activeTab ? 1 : 0.6 }} />
                {t.label}
              </button>
            ))}
          </div>
          {/* Tab panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '3rem', alignItems: 'start' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h4)', margin: '0 0 0.85rem' }}>{tab.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>{tab.desc}</p>
            </div>
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-md)', padding: '1.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.35rem' }}>{tab.example.docType}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{tab.example.docId}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.1rem', margin: '0 0 1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-default)' }}>{tab.example.title}</h3>

              {'sections' in tab.example && tab.example.sections!.map((s: any, i: number) => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.3rem' }}>{s.heading}</div>
                  {s.body && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.55, margin: 0 }}>{s.body}</p>}
                  {s.steps && <ol style={{ margin: '0.3rem 0 0', paddingLeft: '1.2rem' }}>{s.steps.map((step: string, j: number) => <li key={j} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.25rem' }}>{step}</li>)}</ol>}
                </div>
              ))}

              {'checks' in tab.example && tab.example.checks!.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < tab.example.checks!.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 'var(--radius-checkbox)', border: `2px solid ${c.done ? 'var(--status-success)' : 'var(--border-default)'}`, background: c.done ? 'var(--status-success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {c.done && <img src={MS('check')} width={12} alt="" style={{ filter: 'brightness(0) invert(1)' }} />}
                  </div>
                  <span style={{ fontSize: '0.875rem', color: c.done ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{c.label}</span>
                </div>
              ))}

              {'nodes' in tab.example && (
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  {tab.example.nodes!.map((node: any, i: number) => (
                    <div key={node.id}>
                      <div style={{
                        padding: '0.7rem 1rem', borderRadius: 'var(--radius-card)',
                        background: node.type === 'trigger' ? 'var(--color-burning-orange-lightest)' : node.type === 'decision' ? 'var(--accent-subtle)' : 'var(--surface-subtle)',
                        border: `1px solid ${node.type === 'trigger' ? 'var(--color-burning-orange)' : node.type === 'decision' ? 'var(--accent)' : 'var(--border-default)'}`,
                        fontSize: '0.875rem', fontWeight: 500,
                      }}>
                        {node.type === 'decision' && <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginRight: '0.5rem' }}>Decision</span>}
                        {node.label}
                      </div>
                      {i < tab.example.nodes!.length - 1 && <div style={{ width: 2, height: 16, background: 'var(--border-default)', margin: '0 auto' }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Coming soon ───────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: '0 0 0.75rem' }}>Coming soon</h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', margin: 0 }}>Features in development for future releases.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {[
              { icon: 'mic', title: 'Voice input', desc: 'Speak your notes directly — no typing required. Ideal for field and on-site documentation.' },
              { icon: 'groups', title: 'Microsoft Teams integration', desc: 'Convert meeting notes and chat threads into structured documents without leaving Teams.' },
              { icon: 'manage_search', title: 'Semantic search', desc: 'Search across your full document library by meaning, not just keywords.' },
            ].map(card => (
              <div key={card.title} style={{ padding: '1.75rem', background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'var(--surface-subtle)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>
                  Coming soon
                </span>
                <div style={{ width: 44, height: 44, background: 'var(--accent-subtle)', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
                  <img src={MS(card.icon)} width={22} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.1rem', margin: '0 0 0.5rem' }}>{card.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-image)' }}>
            <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1900&q=80" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,40,90,0.88) 0%, rgba(0,20,50,0.75) 100%)' }} />
            <div style={{ position: 'relative', padding: 'clamp(3.5rem,6vw,5rem)', maxWidth: 620 }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', lineHeight: 1.15, letterSpacing: '-0.015em', color: '#fff', margin: '0 0 1.25rem' }}>
                Ready to see Structa convert your notes?
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
