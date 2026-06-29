import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getGapsFlagged,
  getGapsSearchMisses,
  getGapsCoverage,
  getGapsActivity,
  FlaggedDoc,
  SearchMiss,
  TagCoverage,
  UserActivity,
} from '../lib/api';

// ---------------------------------------------------------------------------
// Shared card shell
// ---------------------------------------------------------------------------

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-default)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
        {subtitle && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function CardSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
      <div
        className="h-5 w-5 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent)' }}
      />
    </div>
  );
}

function CardError({ message }: { message: string }) {
  return (
    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
      {message}
    </p>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
      {text}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Flagged documents
// ---------------------------------------------------------------------------

function FlaggedSection() {
  const [data, setData] = useState<FlaggedDoc[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGapsFlagged()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card
      title="Documents with Gaps"
      subtitle="Captured content where Gemini flagged missing information or assumptions."
    >
      {loading && <CardSpinner />}
      {error && <CardError message={error} />}
      {data && data.length === 0 && <Empty text="No documents with unresolved gaps." />}
      {data && data.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {data.map((doc) => (
            <li
              key={doc.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.375rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/library/${doc.id}`}
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  {doc.title}
                </Link>
                {doc.author_name && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {doc.author_name}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {doc.warnings.map((w, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      padding: '0.125rem 0.5rem',
                      borderRadius: '999px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#b45309',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Search misses
// ---------------------------------------------------------------------------

function SearchMissesSection() {
  const [data, setData] = useState<SearchMiss[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGapsSearchMisses()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card
      title="Search Misses"
      subtitle="Topics staff searched for that matched no documents. Populate over time as the team uses search."
    >
      {loading && <CardSpinner />}
      {error && <CardError message={error} />}
      {data && data.length === 0 && <Empty text="No zero-result searches yet." />}
      {data && data.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Query
              </th>
              <th
                style={{
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: '5rem',
                }}
              >
                Searches
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.query}>
                <td
                  style={{
                    padding: '0.5rem 0',
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {row.query}
                </td>
                <td
                  style={{
                    padding: '0.5rem 0',
                    textAlign: 'right',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {row.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tag coverage
// ---------------------------------------------------------------------------

function CoverageSection() {
  const [data, setData] = useState<TagCoverage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGapsCoverage()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card
      title="Tag Coverage"
      subtitle="Topics documented by your org. Amber tags have only 1–2 documents — potential thin spots."
    >
      {loading && <CardSpinner />}
      {error && <CardError message={error} />}
      {data && data.length === 0 && <Empty text="No tags found. Add tags when capturing to build coverage." />}
      {data && data.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {data.map((item) => {
            const isSparse = item.count <= 2;
            return (
              <span
                key={item.tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.8125rem',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '999px',
                  border: `1px solid ${isSparse ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-default)'}`,
                  background: isSparse ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                  color: isSparse ? '#b45309' : 'var(--text-primary)',
                }}
              >
                {item.tag}
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: isSparse ? '#b45309' : 'var(--text-secondary)',
                  }}
                >
                  {item.count}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Contributor activity
// ---------------------------------------------------------------------------

function ActivitySection() {
  const [data, setData] = useState<UserActivity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGapsActivity()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card title="Contributor Activity" subtitle="Documents captured per person in the last 30 days.">
      {loading && <CardSpinner />}
      {error && <CardError message={error} />}
      {data && data.length === 0 && <Empty text="No captures in the last 30 days." />}
      {data && data.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
          {data.map((user) => (
            <li
              key={user.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                {user.name && (
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {user.name}
                  </span>
                )}
                <span
                  style={{
                    fontSize: user.name ? '0.75rem' : '0.875rem',
                    color: user.name ? 'var(--text-secondary)' : 'var(--text-primary)',
                    marginLeft: user.name ? '0.5rem' : 0,
                  }}
                >
                  {user.email}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  minWidth: '2rem',
                  textAlign: 'right',
                }}
              >
                {user.count} {user.count === 1 ? 'doc' : 'docs'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function GapDashboard() {
  return (
    <div style={{ maxWidth: '48rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>
          Knowledge Gaps
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: 0 }}>
          What your org doesn't know it doesn't know.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <FlaggedSection />
        <SearchMissesSection />
        <CoverageSection />
        <ActivitySection />
      </div>
    </div>
  );
}
