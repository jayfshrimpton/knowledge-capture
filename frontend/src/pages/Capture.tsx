import { useState } from 'react';
import { Link } from 'react-router-dom';
import CaptureForm from '../components/CaptureForm';
import DocumentOutput from '../components/DocumentOutput';
import { DocumentRow } from '../types';

const EXAMPLE_CARDS = [
  {
    title: 'How our server restart procedure works',
    notes: `When a server goes unresponsive we follow a few steps to bring it back safely. First, check the monitoring dashboard to confirm the server is actually down and not just slow. Then SSH into the host using the ops-key and run "sudo systemctl status" to see which services have failed. Restart them one by one with "sudo systemctl restart <service>". If the server won't respond to SSH, log into the cloud console and issue a hard reboot from there. After any restart, tail the logs for 5 minutes to confirm everything is stable before closing the incident.`,
  },
  {
    title: 'Weekly team meeting notes',
    notes: `Weekly sync — attendees: Sarah, Tom, Priya, Dev\n- Reviewed last sprint tickets, 3 carried over to this week\n- Sarah: designs for the new dashboard are ready for review, needs sign-off by Thursday\n- Tom: API integration with the payment provider is blocked waiting for sandbox credentials\n- Priya: finished the mobile bug fixes, waiting on QA\n- Dev: server costs up 12% this month, investigating root cause\n- Agreed to move standups to 9:30am starting Monday\n- Next review: share draft OKRs for Q3 by end of week`,
  },
  {
    title: 'New starter checklist for our team',
    notes: `Things to do when a new person joins the team:\nGet them a laptop from IT, ordered at least 3 days before start date\nSet up their email account and add them to the team mailing list\nBook 30 min intro calls with each team member in the first week\nAdd them to Slack workspace and the main channels (general, engineering, announcements)\nGive them access to GitHub org, Notion, Figma, and the internal docs site\nSchedule a 1-on-1 with their manager for day one\nSend them the employee handbook and ask them to read the code of conduct\nPair them with a buddy from the team for the first month\nReview access permissions at 30 days and revoke any temporary ones`,
  },
] as const;

export default function Capture() {
  const [isOnboarded, setIsOnboarded] = useState(
    () => localStorage.getItem('commonplace_onboarded') !== null
  );
  const [showCelebration, setShowCelebration] = useState(false);
  const [prefill, setPrefill] = useState<{ title: string; notes: string; key: number } | null>(null);
  const [current, setCurrent] = useState<DocumentRow | null>(null);
  const [sessionDocs, setSessionDocs] = useState<DocumentRow[]>([]);

  function handleCreated(doc: DocumentRow) {
    setCurrent(doc);
    setSessionDocs((prev) => [doc, ...prev]);
    if (!isOnboarded) {
      localStorage.setItem('commonplace_onboarded', 'true');
      setIsOnboarded(true);
      setShowCelebration(true);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div>
        <h1
          style={{
            fontFamily: '"Raleway", sans-serif',
            fontWeight: 500,
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Capture knowledge
        </h1>
        <p style={{ marginTop: '0.375rem', fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          Paste rough notes, an email, or upload a file. The AI structures it into a usable document.
        </p>
      </div>

      {!isOnboarded && (
        <div>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.625rem',
            }}
          >
            Try an example
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {EXAMPLE_CARDS.map((card, i) => (
              <button
                key={i}
                onClick={() => setPrefill({ title: card.title, notes: card.notes, key: i + 1 })}
                className="st-card"
                style={{
                  padding: '1rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: `box-shadow var(--duration-fast) var(--ease-standard),
                               border-color var(--duration-fast) var(--ease-standard)`,
                  border: prefill?.key === i + 1
                    ? '1.5px solid var(--accent)'
                    : '1px solid var(--border-default)',
                }}
                onMouseEnter={(e) => {
                  if (prefill?.key !== i + 1)
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  if (prefill?.key !== i + 1)
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '0.375rem',
                    lineHeight: 1.4,
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {card.notes.replace(/\n/g, ' ')}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <CaptureForm
        key={prefill?.key ?? 0}
        defaultTitle={prefill?.title}
        defaultNotes={prefill?.notes}
        onCreated={handleCreated}
      />

      {showCelebration && (
        <div
          style={{
            background: 'var(--accent-subtle)',
            border: '1px solid var(--accent)',
            borderRadius: '0.75rem',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
            Your first document is saved — welcome to your knowledge base 🎉
          </span>
          <Link
            to="/library"
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--accent)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            View Library →
          </Link>
        </div>
      )}

      {current && <DocumentOutput doc={current} />}

      {sessionDocs.length > 1 && (
        <div>
          <p
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              marginBottom: '0.625rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Captured this session
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {sessionDocs.map((d) => {
              const active = current?.id === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setCurrent(d)}
                  style={{
                    padding: '0.3125rem 0.875rem',
                    borderRadius: '9999px',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: active ? 'var(--accent-subtle)' : 'var(--surface-card)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.8125rem',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: `background var(--duration-fast) var(--ease-standard),
                                 border-color var(--duration-fast) var(--ease-standard),
                                 color var(--duration-fast) var(--ease-standard)`,
                  }}
                >
                  {d.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
