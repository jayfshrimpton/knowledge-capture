import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout, {
  useDemo, BtnPrimary, BtnAlternate, BtnSecondaryAlt, Avatar,
} from './MarketingLayout';

const MS = (icon: string) =>
  `https://cdn.jsdelivr.net/npm/@material-symbols/svg-500@latest/rounded/${icon}.svg`;

const industries = [
  {
    id: 'engineering',
    label: 'Engineering & construction',
    icon: 'construction',
    rawInput: `excavation zone b daily update
started 0730, crew of 8. excavated to 2.8m at northwest corner, hit unexpected clay layer at 2.1m, had to adjust slope to 1:1.5 per geotech instruction. installed sheet piling sections 14-18. backfill gang working zone a simultaneously. dewatering pump running all day, water table higher than expected. near miss - one operatve slipped near pump discharge, no injury, reported. tomorrow: continue northwest, start formwork zone b south.`,
    structuredOutput: {
      type: 'DAILY SITE REPORT',
      ref: 'DSR-EXC-042',
      title: 'Excavation Zone B — Daily Progress Report',
      date: '25 June 2026',
      sections: [
        { heading: 'Works completed', body: 'Excavated to 2.8 m at northwest corner. Clay layer encountered at 2.1 m — slope adjusted to 1:1.5 per geotechnical instruction. Sheet piling sections 14–18 installed. Backfill gang active in Zone A simultaneously.' },
        { heading: 'Ground conditions', body: 'Water table higher than anticipated. Dewatering pump operational throughout shift. Clay layer required immediate slope adjustment.' },
        { heading: 'Near miss — recorded', body: 'One operative slipped near pump discharge. No injury. Reported per site incident procedure. Discharge area to be reviewed before tomorrow\'s shift.' },
        { heading: 'Tomorrow\'s programme', body: 'Continue northwest excavation. Commence formwork, Zone B south.' },
      ],
    },
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    icon: 'precision_manufacturing',
    rawInput: `line 3 inspection - end of shift
ran all day, 847 units out, 23 rejects (2.7%). main issue was seal alignment on units 300-320 batch, adjusted jig at 14:30, sorted. conveyor belt B showing wear on left guide, flagged maintenance, should get looked at before next shift. coolant levels topped up twice. temp in quality bay was 24C all day, within spec. next shift - watch the seal jig settings, don't let it drift again.`,
    structuredOutput: {
      type: 'END OF SHIFT REPORT',
      ref: 'ESR-MFG-L3-0625',
      title: 'Line 3 — End of Shift Inspection Report',
      date: '25 June 2026',
      sections: [
        { heading: 'Production summary', body: 'Output: 847 units. Rejects: 23 (2.7%). Root cause: seal alignment drift, units 300–320. Jig adjusted at 14:30 — subsequent production within tolerance.' },
        { heading: 'Equipment status', body: 'Conveyor Belt B: Left guide showing wear. Maintenance notification raised. Inspect before next shift commences. Coolant levels: replenished twice during shift.' },
        { heading: 'Quality bay conditions', body: 'Temperature: 24°C throughout shift. Within specification range.' },
        { heading: 'Instructions for next shift', body: 'Monitor seal jig settings continuously. Do not allow alignment to drift. Confirm maintenance has inspected Conveyor Belt B before starting.' },
      ],
    },
  },
  {
    id: 'professional',
    label: 'Professional services',
    icon: 'business_center',
    rawInput: `acme corp onboarding notes - call with sarah and tom
they've got 45 users, mix of ops managers and field supervisors. main pain point is consistency - different people write docs completely differently. currently using word templates but nobody sticks to them. they want procedures and checklists mainly. sarah mentioned iso 9001 audit next march so timing is good. tom is the tech contact, needs to talk to their IT about SSO. demo went well, they liked the before/after example. next step: send proposal by friday, arrange technical call with tom w/c 30th.`,
    structuredOutput: {
      type: 'CLIENT MEETING NOTE',
      ref: 'CMN-ACME-001',
      title: 'Acme Corp — Onboarding Discovery Call',
      date: '25 June 2026',
      sections: [
        { heading: 'Attendees', body: 'Sarah (Operations Lead), Tom (Technical Contact), Commonplace team.' },
        { heading: 'Organisation profile', body: '45 users — operations managers and field supervisors. Primary use case: procedures and checklists. Current state: Word templates with low adoption.' },
        { heading: 'Key pain point', body: 'Inconsistent documentation quality across authors. Templates exist but are not followed.' },
        { heading: 'Compliance driver', body: 'ISO 9001 audit due March 2027. Timing creates urgency for rollout.' },
        { heading: 'Technical requirement', body: 'SSO via Microsoft Entra ID. Tom to engage internal IT. Technical discovery call required.' },
        { heading: 'Next actions', body: 'Send commercial proposal by Friday 28 June. Schedule technical call with Tom — week of 30 June.' },
      ],
    },
  },
  {
    id: 'healthcare',
    label: 'Healthcare admin',
    icon: 'local_hospital',
    rawInput: `patient intake process notes - outpatients cardiology
patient arrives, receptionist checks NHS number and DOB against system. if new patient, create record in EPR, attach referral letter. triage nurse does initial vitals - BP, pulse, O2, weight. checks medications list, flags anything to duty doctor. patients waiting more than 45 mins should be flagged to coordinator. if patient has mobility issue, flag to nurse at desk to arrange accessible room. all data in EPR before they see consultant.`,
    structuredOutput: {
      type: 'OPERATING PROCEDURE',
      ref: 'OP-OPD-CARD-003',
      title: 'Outpatient Cardiology — Patient Intake Procedure',
      date: '25 June 2026',
      sections: [
        { heading: '1. Reception and registration', body: 'Verify NHS number and date of birth against system records. New patients: create EPR record and attach referral letter before proceeding.' },
        { heading: '2. Triage assessment', body: 'Triage nurse records: blood pressure, pulse, O₂ saturation, weight. Review medications list. Flag any medication concerns to duty doctor immediately.' },
        { heading: '3. Wait time monitoring', body: 'Patients waiting more than 45 minutes must be flagged to the outpatient coordinator for prioritisation review.' },
        { heading: '4. Accessibility requirements', body: 'If patient has mobility impairment, notify desk nurse to arrange accessible consultation room before the patient is called.' },
        { heading: '5. Pre-consultation sign-off', body: 'All patient data must be entered into EPR and verified complete before patient is seen by consultant.' },
      ],
    },
  },
  {
    id: 'logistics',
    label: 'Logistics',
    icon: 'local_shipping',
    rawInput: `dispatch handover 06:00 shift
24 vehicles out, 2 held for faults (van 14 - brake light, van 22 - tyre). both in workshop. 187 drops today, 12 priority. driver briefing done 05:45, all aware of roadworks on a14 j23, divert via b1047. fuel cards topped up yesterday. cold chain van 7 showing slightly high compartment temp overnight, engineer checked, thermostat replaced, cleared for use. 3 drivers on induction today - should be supervised by senior driver.`,
    structuredOutput: {
      type: 'SHIFT HANDOVER REPORT',
      ref: 'SHR-DSP-0625-06',
      title: 'Dispatch — 06:00 Shift Handover',
      date: '25 June 2026',
      sections: [
        { heading: 'Fleet status', body: 'Active: 24 vehicles. Held for maintenance: Van 14 (brake light fault), Van 22 (tyre). Both in workshop — not available for dispatch.' },
        { heading: 'Today\'s workload', body: '187 drops scheduled. 12 priority deliveries — confirm completion by 12:00.' },
        { heading: 'Route advisory', body: 'Roadworks active at A14 J23. All drivers briefed at 05:45. Divert via B1047. Update route planners if not already done.' },
        { heading: 'Vehicle alerts', body: 'Cold chain Van 7: High compartment temperature overnight. Engineer attended — thermostat replaced. Vehicle cleared for service. Monitor temperature log during first run.' },
        { heading: 'Induction drivers', body: '3 drivers on induction today. Assign senior driver supervision for all shifts. Do not dispatch unsupervised.' },
      ],
    },
  },
];

const industryCards = [
  { id: 'engineering', label: 'Engineering & construction', icon: 'construction', desc: 'Site reports, method statements, RAMS, and handover documentation for complex builds.' },
  { id: 'manufacturing', label: 'Manufacturing', icon: 'precision_manufacturing', desc: 'Shift reports, QC checklists, SOP updates, and production records — always in compliance.' },
  { id: 'professional', label: 'Professional services', icon: 'business_center', desc: 'Client meeting notes, onboarding guides, process documentation, and knowledge management.' },
  { id: 'healthcare', label: 'Healthcare admin', icon: 'local_hospital', desc: 'Patient intake procedures, ward protocols, and admin process documentation.' },
  { id: 'logistics', label: 'Logistics', icon: 'local_shipping', desc: 'Dispatch handovers, route briefs, fleet maintenance records, and driver induction documents.' },
];

const teamTypes = [
  {
    icon: 'engineering',
    title: 'Operations teams',
    color: 'var(--accent)',
    features: ['Shift handover reports', 'Equipment inspection records', 'Incident and near-miss reports', 'Permit-to-work documentation', 'Maintenance instructions'],
  },
  {
    icon: 'verified',
    title: 'Quality teams',
    color: 'var(--color-apple-dark)',
    features: ['ISO 9001 process documentation', 'Quality control checklists', 'Non-conformance reports', 'Corrective action procedures', 'Audit preparation documentation'],
  },
  {
    icon: 'health_and_safety',
    title: 'HSE teams',
    color: 'var(--color-burning-orange)',
    features: ['Risk assessments and RAMS', 'Safety procedures and rules', 'Toolbox talk records', 'Emergency response procedures', 'ISO 45001 compliance documentation'],
  },
];

export default function UseCasesPage() {
  const { openDemo } = useDemo();
  const [activeInd, setActiveInd] = useState(0);

  const scenario = industries[activeInd];

  return (
    <MarketingLayout>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: 'clamp(4.5rem,9vw,8rem) 0 clamp(3rem,5vw,4rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <span style={{ display: 'inline-block', background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', marginBottom: '1.5rem' }}>
            Use cases
          </span>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h1)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 1.5rem', maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
            Built for every operational environment
          </h1>
          <p style={{ fontSize: 'var(--text-large)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 auto 2.5rem', maxWidth: 540 }}>
            From construction sites to healthcare admin, Commonplace converts field notes into compliant documentation — wherever your team works.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <BtnPrimary onClick={openDemo}>Request a demo</BtnPrimary>
            <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', height: '2.75rem', padding: '0 1.5rem', borderRadius: 'var(--radius-button)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.9375rem', fontWeight: 600, border: '1px solid var(--border-strong)', textDecoration: 'none' }}>View pricing</Link>
          </div>
        </div>
      </section>

      {/* ── Industry cards ────────────────────────────────────── */}
      <section style={{ padding: '0 0 clamp(4rem,8vw,7rem)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.1rem' }}>
            {industryCards.map(card => (
              <div
                key={card.id}
                onClick={() => { setActiveInd(industries.findIndex(i => i.id === card.id)); document.getElementById('scenario-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                style={{ background: '#fff', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-subtle)', padding: '1.75rem', cursor: 'pointer', transition: 'box-shadow 200ms, transform 200ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ''; (e.currentTarget as HTMLElement).style.transform = ''; }}
              >
                <div style={{ width: 44, height: 44, background: 'var(--accent-subtle)', borderRadius: 'var(--radius-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
                  <img src={MS(card.icon)} width={22} alt="" style={{ filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.1rem', margin: '0 0 0.5rem' }}>{card.label}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, margin: 0 }}>{card.desc}</p>
              </div>
            ))}
            {/* CTA card */}
            <div style={{ background: 'var(--accent)', borderRadius: 'var(--radius-card)', padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.25rem', color: '#fff', margin: '0 0 0.75rem' }}>Don't see your industry?</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>Commonplace works wherever operational notes need to become structured documentation. Let's talk.</p>
              </div>
              <button onClick={openDemo} style={{ display: 'inline-flex', alignItems: 'center', height: '2.25rem', padding: '0 1rem', borderRadius: 'var(--radius-button)', background: '#fff', color: 'var(--accent)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700, marginTop: '1.5rem', alignSelf: 'flex-start' }}>
                Talk to us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Team types ────────────────────────────────────────── */}
      <section style={{ background: 'var(--surface-subtle)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h3)', letterSpacing: '-0.015em', margin: '0 0 0.75rem' }}>For every team in your operation</h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'var(--text-secondary)', margin: 0 }}>Operations, quality, and HSE — all working from the same platform.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {teamTypes.map(team => (
              <div key={team.title} style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '2rem', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-card)', background: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <img src={MS(team.icon)} width={26} alt="" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1.2rem', margin: '0 0 1.1rem' }}>{team.title}</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.65rem' }}>
                  {team.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <img src={MS('check_circle')} width={16} alt="" style={{ marginTop: 1, flexShrink: 0, filter: 'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(555%) hue-rotate(200deg)' }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scenario switcher ─────────────────────────────────── */}
      <section id="scenario-section" style={{ background: 'var(--surface-inverse)', padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 'var(--text-h2)', letterSpacing: '-0.015em', color: '#fff', margin: '0 0 1rem' }}>See it in your industry</h2>
            <p style={{ fontSize: 'var(--text-medium)', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Real examples from operations teams using Commonplace today.</p>
          </div>
          {/* Industry tab strip */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
            {industries.map((ind, i) => (
              <button
                key={ind.id}
                onClick={() => setActiveInd(i)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-pill)', border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, transition: 'all 150ms', background: i === activeInd ? '#fff' : 'transparent', color: i === activeInd ? 'var(--text-primary)' : 'rgba(255,255,255,0.7)', borderColor: i === activeInd ? '#fff' : 'rgba(255,255,255,0.25)' }}>
                <img src={MS(ind.icon)} width={16} alt="" style={{ filter: i === activeInd ? 'none' : 'brightness(0) invert(1)', opacity: i === activeInd ? 0.8 : 0.8 }} />
                {ind.label}
              </button>
            ))}
          </div>
          {/* Before / After */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-card)', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Raw notes input</span>
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{scenario.rawInput}</p>
            </div>
            <div style={{ background: '#fff', borderRadius: 'var(--radius-card)', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Commonplace output</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.25rem' }}>{scenario.structuredOutput.type}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>{scenario.structuredOutput.ref} · {scenario.structuredOutput.date}</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: '1rem', margin: '0 0 1rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-default)' }}>{scenario.structuredOutput.title}</h3>
              {scenario.structuredOutput.sections.map((s, i) => (
                <div key={i} style={{ marginBottom: '0.9rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{s.heading}</div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonial ───────────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem,8vw,7rem) 0' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 5%' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <img
              src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1900&q=80"
              alt=""
              style={{ width: '100%', height: 'auto', maxHeight: 440, objectFit: 'cover', borderRadius: 'var(--radius-image)', marginBottom: '3rem' }}
            />
            <blockquote style={{ margin: 0 }}>
              <p style={{ fontSize: 'var(--text-large)', lineHeight: 1.55, fontStyle: 'italic', color: 'var(--text-primary)', margin: '0 0 2rem' }}>
                "We deal with safety-critical documentation every day. Commonplace gives us the confidence that nothing gets missed — every hazard, every control measure, every emergency procedure is captured and structured correctly, every time."
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.9rem' }}>
                <Avatar name="Marcus Rodriguez" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Marcus Rodriguez</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>HSE Manager, Energy & Resources Plc.</div>
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
                Ready to see Commonplace at work in your operation?
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
